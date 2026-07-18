// Lead unlock checkout: provider pays $10 to see a service request's contact info.
// 100% platform revenue (no Connect transfer).
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LEAD_PRICE_CENTS = 1000; // $10 per lead

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { request_id, provider_id, success_url, cancel_url } = await req.json();
    if (!request_id || !provider_id) throw new Error('request_id and provider_id required');

    const { data: request } = await supabase
      .from('service_requests')
      .select('id, title, category, city, status, user_id')
      .eq('id', request_id)
      .single();

    if (!request) throw new Error('Request not found');
    if (request.status !== 'open') throw new Error('This request is no longer open');
    if (request.user_id === provider_id) throw new Error('You cannot unlock your own request');

    // Already unlocked?
    const { data: existing } = await supabase
      .from('lead_unlocks')
      .select('id')
      .eq('request_id', request_id)
      .eq('provider_id', provider_id)
      .maybeSingle();
    if (existing) throw new Error('You already unlocked this lead');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: LEAD_PRICE_CENTS,
            product_data: {
              name: `Lead: ${request.title}`,
              description: `${request.category} · ${request.city} — DesiZoom Services`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: 'lead',
        request_id: request.id,
        provider_id,
      },
      success_url,
      cancel_url,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
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
