import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    console.error('Webhook signature failed:', message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { post_id, buyer_id, seller_id, kind, request_id, provider_id, booking_id, ticket_id, event_id, quantity, order_id } = session.metadata ?? {};

    // Food pickup order paid → mark paid, record revenue
    if (session.payment_status === 'paid' && kind === 'order' && order_id) {
      await supabase.from('orders').update({ status: 'paid' }).eq('id', order_id);
      const { data: o } = await supabase
        .from('orders').select('customer_id, owner_id, subtotal_cents, commission_cents').eq('id', order_id).single();
      if (o) {
        await supabase.from('payments').insert({
          buyer_id: o.customer_id, seller_id: o.owner_id,
          amount_cents: o.subtotal_cents, commission_cents: o.commission_cents,
          stripe_session_id: session.id, status: 'completed', kind: 'order',
        });
      }
      console.log(`🍛 Order paid: ${order_id}`);
    }

    // Ticket purchase paid → confirm, increment sold count, record revenue
    if (session.payment_status === 'paid' && kind === 'ticket' && ticket_id) {
      await supabase.from('tickets').update({ status: 'paid' }).eq('id', ticket_id);

      const qty = parseInt(quantity ?? '1') || 1;
      const { data: ev } = await supabase.from('posts').select('tickets_sold').eq('id', event_id).single();
      await supabase.from('posts').update({ tickets_sold: (ev?.tickets_sold ?? 0) + qty }).eq('id', event_id);

      const { data: t } = await supabase
        .from('tickets').select('buyer_id, organizer_id, amount_cents, commission_cents').eq('id', ticket_id).single();
      if (t) {
        await supabase.from('payments').insert({
          buyer_id: t.buyer_id, seller_id: t.organizer_id,
          amount_cents: t.amount_cents, commission_cents: t.commission_cents,
          stripe_session_id: session.id, status: 'completed', kind: 'ticket',
        });
      }
      console.log(`🎟️ Tickets paid: ${ticket_id} x${qty}`);
    }

    // Service booking paid → confirm and record revenue
    if (session.payment_status === 'paid' && kind === 'booking' && booking_id) {
      await supabase
        .from('service_bookings')
        .update({ status: 'paid' })
        .eq('id', booking_id);

      const { data: b } = await supabase
        .from('service_bookings')
        .select('customer_id, provider_user_id, amount_cents, commission_cents')
        .eq('id', booking_id)
        .single();
      if (b) {
        await supabase.from('payments').insert({
          buyer_id: b.customer_id,
          seller_id: b.provider_user_id,
          amount_cents: b.amount_cents,
          commission_cents: b.commission_cents,
          stripe_session_id: session.id,
          status: 'completed',
          kind: 'booking',
        });
      }
      console.log(`📅 Booking paid: ${booking_id}`);
    }

    // Service lead unlock
    if (session.payment_status === 'paid' && kind === 'lead' && request_id && provider_id) {
      const leadAmount = session.amount_total ?? 1000;
      await supabase.from('lead_unlocks').insert({
        request_id,
        provider_id,
        amount_cents: leadAmount,
        stripe_session_id: session.id,
      });
      // Lead fee is 100% platform revenue → record it for admin totals
      await supabase.from('payments').insert({
        buyer_id: buyer_id ?? null, seller_id: null,
        amount_cents: leadAmount, commission_cents: leadAmount,
        stripe_session_id: session.id, status: 'completed', kind: 'lead',
      });
      console.log(`🔓 Lead unlocked: request=${request_id} provider=${provider_id}`);
    }

    if (session.payment_status === 'paid' && post_id) {
      if (kind === 'boost') {
        // Boost purchase: pin listing for 7 days
        const boostedUntil = new Date(Date.now() + 7 * 86400000).toISOString();
        await supabase
          .from('posts')
          .update({ boosted_until: boostedUntil })
          .eq('id', post_id);
        // Boost fee is 100% platform revenue → record it for admin totals
        const boostAmount = session.amount_total ?? 299;
        await supabase.from('payments').insert({
          buyer_id: buyer_id ?? null, seller_id: null, post_id,
          amount_cents: boostAmount, commission_cents: boostAmount,
          stripe_session_id: session.id, status: 'completed', kind: 'boost',
        });
        console.log(`🚀 Boost activated: post=${post_id} until=${boostedUntil}`);
      } else {
        // Marketplace sale
        await supabase
          .from('posts')
          .update({ is_sold: true })
          .eq('id', post_id);

        await supabase
          .from('payments')
          .update({ status: 'completed', kind: 'sale' })
          .eq('stripe_session_id', session.id);

        console.log(`✅ Sale completed: post=${post_id} buyer=${buyer_id} seller=${seller_id}`);
      }
    }
  }

  // Handle refunds
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const sessionId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (sessionId) {
      // Find payment by session and mark refunded
      const { data: payment } = await supabase
        .from('payments')
        .select('id, post_id')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (payment) {
        await supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('id', payment.id);

        // Unmark as sold so it can be relisted
        await supabase
          .from('posts')
          .update({ is_sold: false })
          .eq('id', payment.post_id);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
