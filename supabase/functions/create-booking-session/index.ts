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

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calcCommission(priceCents: number): number {
  return Math.round(priceCents * 0.08);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const {
      offering_id, customer_id, requested_date, requested_time,
      note, customer_phone, success_url, cancel_url, embedded,
    } = await req.json();
    if (!offering_id || !customer_id || !requested_date) {
      throw new Error('offering_id, customer_id and requested_date required');
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
