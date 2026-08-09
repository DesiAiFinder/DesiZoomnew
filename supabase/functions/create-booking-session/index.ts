// Service booking checkout: customer pays for an offering (e.g. pooja) through
// DesiZoom. Platform keeps 8%, provider receives the rest via Stripe Connect.
// Contact details are revealed to both parties only after payment.
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

function calcCommission(priceCents: number): number {
  return Math.round(priceCents * 0.08);
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const {
      offering_id, requested_date, requested_time,
      note, customer_phone, success_url, cancel_url, embedded,
    } = await req.json();

    // Identify the buyer from the JWT, never from the request body. A body
    // value can be set to anyone's id by whoever calls this endpoint, which
    // would attribute a purchase — and the resulting ticket/order/booking — to
    // another account. refund-payment already did this correctly; these didn't.
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user: authUser } } = await supabase.auth.getUser(jwt);
    if (!authUser) throw new Error('You must be signed in.');
    const customer_id = authUser.id;
    if (!offering_id || !requested_date) {
      throw new Error('offering_id and requested_date required');
    }

    // Offering + provider
    const { data: offering } = await supabase
      .from('service_offerings')
      .select('id, title, category, price_cents, is_active, provider:service_providers(id, user_id, business_name, city)')
      .eq('id', offering_id)
      .single();

    if (!offering || !offering.is_active) throw new Error('This service is not available');
    const provider = offering.provider as unknown as { id: string; user_id: string; business_name: string; city: string };
    if (provider.user_id === customer_id) throw new Error('You cannot book your own service');

    // Provider must have connected Stripe (same as marketplace sellers)
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', provider.user_id)
      .single();
    if (!profile?.stripe_account_id) {
      throw new Error('This provider has not set up payments yet. Ask them to connect their bank in Marketplace.');
    }

    const commission = calcCommission(offering.price_cents);

    // Create pending booking first
    const { data: booking, error: bookErr } = await supabase
      .from('service_bookings')
      .insert({
        offering_id: offering.id,
        provider_user_id: provider.user_id,
        customer_id,
        requested_date,
        requested_time: requested_time || null,
        note: note || null,
        customer_phone: customer_phone || null,
        amount_cents: offering.price_cents,
        commission_cents: commission,
        status: 'pending',
      })
      .select()
      .single();
    if (bookErr) throw bookErr;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: offering.price_cents,
            product_data: {
              name: offering.title,
              description: `${provider.business_name} · ${requested_date}${requested_time ? ` ${requested_time}` : ''} — DesiZoom Services`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: commission,
        transfer_data: { destination: profile.stripe_account_id },
      },
      metadata: {
        kind: 'booking',
        booking_id: booking.id,
      },
      ...(embedded
        ? { ui_mode: 'embedded' as const, redirect_on_completion: 'never' as const }
        : { success_url, cancel_url }),
    });

    await supabase
      .from('service_bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', booking.id);

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
