// Boost checkout: $2.99 one-time → pins listing for 7 days.
// Money goes 100% to the platform (no Connect transfer).
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
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

const BOOST_PRICE_CENTS = 299;

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { post_id, user_id, success_url, cancel_url, embedded } = await req.json();
    if (!post_id || !user_id) throw new Error('post_id and user_id required');

    const { data: post } = await supabase
      .from('posts')
      .select('id, title, user_id')
      .eq('id', post_id)
      .single();

    if (!post) throw new Error('Post not found');
    if (post.user_id !== user_id) throw new Error('You can only boost your own listings');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: BOOST_PRICE_CENTS,
            product_data: {
              name: `Boost: ${post.title}`,
              description: 'Pin your listing to the top for 7 days — DesiZoom',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: 'boost',
        post_id: post.id,
        user_id,
      },
      ...(embedded
        ? { ui_mode: 'embedded' as const, redirect_on_completion: 'never' as const }
        : { success_url, cancel_url }),
    });

    return new Response(
      JSON.stringify({ url: session.url, client_secret: session.client_secret }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
