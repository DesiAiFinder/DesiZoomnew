// Ticket purchase checkout: buyer pays for event tickets through DesiZoom.
// Platform keeps 5%, organizer receives the rest via Stripe Connect.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { event_id, buyer_id, quantity, success_url, cancel_url } = await req.json();
    const qty = Math.max(1, parseInt(quantity) || 1);
    if (!event_id || !buyer_id) throw new Error('event_id and buyer_id required');

    const { data: event } = await supabase
      .from('posts')
      .select('id, title, user_id, ticket_price_cents, tickets_total, tickets_sold, event_date, is_active')
      .eq('id', event_id)
      .single();

    if (!event || !event.is_active) throw new Error('Event not found');
    if (!event.ticket_price_cents) throw new Error('This is a free event');
    if (event.user_id === buyer_id) throw new Error('You cannot buy tickets to your own event');
    if (event.tickets_total && (event.tickets_sold + qty) > event.tickets_total) {
      throw new Error('Not enough tickets remaining');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', event.user_id)
      .single();
    if (!profile?.stripe_account_id) {
      throw new Error('The organizer has not set up payments yet.');
    }

    const amount = event.ticket_price_cents * qty;
    const commission = Math.round(amount * 0.05); // 5% platform fee

    const { data: ticket, error: tErr } = await supabase
      .from('tickets')
      .insert({
        event_id: event.id,
        buyer_id,
        organizer_id: event.user_id,
        quantity: qty,
        amount_cents: amount,
        commission_cents: commission,
        status: 'pending',
      })
      .select()
      .single();
    if (tErr) throw tErr;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: event.ticket_price_cents,
            product_data: {
              name: `Ticket: ${event.title}`,
              description: 'DesiZoom Events',
            },
          },
          quantity: qty,
        },
      ],
      payment_intent_data: {
        application_fee_amount: commission,
        transfer_data: { destination: profile.stripe_account_id },
      },
      metadata: {
        kind: 'ticket',
        ticket_id: ticket.id,
        event_id: event.id,
        quantity: qty.toString(),
      },
      success_url,
      cancel_url,
    });

    await supabase.from('tickets').update({ stripe_session_id: session.id }).eq('id', ticket.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
