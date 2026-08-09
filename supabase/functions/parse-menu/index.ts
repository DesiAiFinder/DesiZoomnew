// Read a restaurant menu (photo or PDF) and return structured items.
//
// The model does the typing; a human does the checking. This function never
// writes to menu_items — it only returns candidates for the review screen in
// My Restaurant. A misread price is real money, so nothing reaches the database
// without someone confirming it.
//
// Requires GEMINI_API_KEY in Supabase → Edge Functions → Secrets.
//   npx supabase secrets set GEMINI_API_KEY=...
//   npx supabase functions deploy parse-menu

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Only our own front-ends may call this. A wildcard let any site on the
// internet invoke these endpoints with a visitor's session.
const ALLOWED_ORIGINS = [
  'https://www.desizoom.com',
  'https://desizoom.com',
  'https://desizoomnew.vercel.app',
  'http://localhost:5173',
];
function corsFor(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

const MODEL = 'gemini-2.0-flash';
const MAX_BYTES = 12 * 1024 * 1024;   // Gemini inline limit is ~20MB base64; stay well under

const PROMPT = `You are reading a restaurant menu for an Indian/South Asian restaurant.

Return ONLY a JSON array. No prose, no markdown fences. Each element:
{
  "name": string,             // the dish exactly as printed, keep its spelling
  "description": string|null, // only if the menu prints one
  "category": string,         // Appetizers | Main | Breads | Rice | Desserts | Drinks | Tiffin | Other
  "price_cents": number|null, // 1250 for $12.50. null if you cannot read it clearly
  "is_veg": boolean|null,     // true if marked vegetarian, false if clearly meat, else null
  "is_item": boolean          // false for anything that is not an orderable dish
}

Rules:
- NEVER guess a price. If it is unclear, blurry, cut off, or absent, use null.
- If a dish lists several sizes or portions, make one entry per priced variant and
  put the size in the name, e.g. "Biryani (Family)".
- Keep opening hours, phone numbers, addresses, delivery notes, taglines and
  section headers as entries with "is_item": false so nothing is silently lost.
- Preserve regional spellings as printed. Do not translate or "correct" them.
- Use the menu's own section names to choose a category when they map cleanly.`;

interface Item {
  name: string;
  description: string | null;
  category: string;
  price_cents: number | null;
  is_veg: boolean | null;
  is_item: boolean;
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) throw new Error('Menu reading is not configured yet.');

    // Trust the JWT, never a user id from the body.
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('You must be signed in.');

    const { restaurant_id, file_url } = await req.json();
    if (!restaurant_id || !file_url) throw new Error('restaurant_id and file_url are required.');

    // You may only read a menu for a restaurant you own.
    const { data: rest } = await supabase
      .from('restaurants').select('id, owner_id').eq('id', restaurant_id).maybeSingle();
    if (!rest) throw new Error('Restaurant not found.');
    if (rest.owner_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role !== 'admin') throw new Error('That is not your restaurant.');
    }

    // Fetch the uploaded file and inline it for the model.
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) throw new Error('Could not open that file.');
    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) {
      throw new Error('That file is too large. Try a photo under 12MB.');
    }
    const mime = fileRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg';

    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const b64 = btoa(binary);

    const gRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mime, data: b64 } },
            ],
          }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      }
    );

    if (!gRes.ok) {
      const detail = await gRes.text();
      console.error('gemini error', gRes.status, detail.slice(0, 400));
      throw new Error("Couldn't read that menu. Try a clearer, straight-on photo.");
    }

    const g = await gRes.json();
    const raw = g?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

    let parsed: Item[];
    try {
      // Tolerate a stray ```json fence even though we asked for none.
      parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim());
    } catch {
      console.error('unparseable model output', raw.slice(0, 400));
      throw new Error("Couldn't read that menu. Try a clearer photo.");
    }
    if (!Array.isArray(parsed)) parsed = [];

    const ALLOWED = ['Appetizers', 'Main', 'Breads', 'Rice', 'Desserts', 'Drinks', 'Tiffin', 'Other'];
    const items = parsed
      .filter((i) => i && typeof i.name === 'string' && i.name.trim())
      .map((i) => ({
        name: String(i.name).trim().slice(0, 120),
        description: i.description ? String(i.description).trim().slice(0, 300) : null,
        category: ALLOWED.includes(i.category) ? i.category : 'Other',
        // Sanity-clamp: a menu item over $500 is a misread, not a dish.
        price_cents:
          typeof i.price_cents === 'number' && i.price_cents > 0 && i.price_cents <= 50000
            ? Math.round(i.price_cents)
            : null,
        is_veg: typeof i.is_veg === 'boolean' ? i.is_veg : null,
        // Anything without a price is unticked by default too — the review
        // screen makes the user deal with it deliberately.
        is_item: i.is_item !== false,
      }));

    console.log(`parse-menu: ${items.length} candidates for ${restaurant_id}`);

    return new Response(JSON.stringify({ items }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
