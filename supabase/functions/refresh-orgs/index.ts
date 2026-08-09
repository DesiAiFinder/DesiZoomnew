// Nightly refresh: pulls live metadata (title, description, logo) from each
// organization's own website and verifies the site is alive.
// Also auto-discovers a leadership/team page link when one exists.
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

function extractMeta(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

// Find a leadership/team/committee page link in the site's nav
function findLeadershipUrl(html: string, baseUrl: string): string | null {
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*(?:leadership|executive|committee|board|office\s*bearers|our\s*team)[^<]*)<\/a>/gi;
  const m = re.exec(html);
  if (!m?.[1]) return null;
  try {
    return new URL(m[1], baseUrl).href;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, website')
    .not('website', 'is', null);

  let refreshed = 0, dead = 0;

  for (const org of orgs ?? []) {
    const patch: Record<string, unknown> = { last_checked: new Date().toISOString() };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(org.website, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DesiZoomBot/1.0)' },
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = (await res.text()).slice(0, 300000);

      patch.site_ok = true;
      const desc = extractMeta(html, 'description');
      if (desc && desc.length > 30) patch.description = desc.slice(0, 300);
      const image = extractMeta(html, 'image');
      if (image?.startsWith('http')) patch.logo_url = image;
      const leadUrl = findLeadershipUrl(html, org.website);
      if (leadUrl) patch.leadership_url = leadUrl;

      refreshed++;
    } catch {
      patch.site_ok = false;
      dead++;
    }
    await supabase.from('organizations').update(patch).eq('id', org.id);
  }

  return new Response(
    JSON.stringify({ checked: orgs?.length ?? 0, refreshed, dead }),
    { headers: { ...cors, 'Content-Type': 'application/json' } }
  );
});
