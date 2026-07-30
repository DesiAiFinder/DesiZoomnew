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

        // Tell the restaurant, immediately. This is the only alert that reaches
        // them when the app isn't open, so it must not depend on the browser.
        if (o.owner_id) {
          const amount = `$${(o.subtotal_cents / 100).toFixed(2)}`;
          const title = '🍛 New order';
          const body = `${amount} order just came in. Tap to start preparing.`;

          await supabase.from('notifications').insert({
            user_id: o.owner_id, title, body, url: '/my-business',
          }).then(() => {}, () => {}); // table is optional — ignore if absent

          try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ user_id: o.owner_id, title, body, url: '/my-business' }),
            });
          } catch (e) {
            console.error('new-order push failed (non-fatal)', e);
          }
        }
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
    const paymentIntent = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (paymentIntent) {
      // We store the CHECKOUT SESSION id (cs_…), but a refund only gives us the
      // payment intent (pi_…). Ask Stripe which session that intent belongs to.
      let sessionId: string | undefined;
      try {
        const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
        sessionId = sessions.data[0]?.id;
      } catch (e) {
        console.error('Could not resolve session for refund', paymentIntent, e);
      }

      if (sessionId) {
        const { data: payment } = await supabase
          .from('payments')
          .select('id, post_id, kind')
          .eq('stripe_session_id', sessionId)
          .maybeSingle();

        // Fully refunded, or only part of it?
        const fully = charge.amount_refunded >= charge.amount;
        const newStatus = fully ? 'refunded' : 'partially_refunded';

        if (payment) {
          await supabase.from('payments').update({ status: newStatus }).eq('id', payment.id);
        }

        // Roll back whatever this payment was for
        const kind = payment?.kind ?? 'sale';

        if (kind === 'sale' && payment?.post_id) {
          // Relist the marketplace item
          await supabase.from('posts').update({ is_sold: false }).eq('id', payment.post_id);
        }

        if (kind === 'order') {
          await supabase.from('orders').update({ status: 'refunded' }).eq('stripe_session_id', sessionId);
        }

        if (kind === 'booking') {
          await supabase.from('service_bookings').update({ status: 'refunded' }).eq('stripe_session_id', sessionId);
        }

        if (kind === 'ticket') {
          const { data: t } = await supabase
            .from('tickets').select('id, event_id, quantity').eq('stripe_session_id', sessionId).maybeSingle();
          if (t) {
            await supabase.from('tickets').update({ status: 'refunded' }).eq('id', t.id);
            // Put the seats back on sale
            const { data: ev } = await supabase.from('posts').select('tickets_sold').eq('id', t.event_id).single();
            const back = Math.max(0, (ev?.tickets_sold ?? 0) - (t.quantity ?? 1));
            await supabase.from('posts').update({ tickets_sold: back }).eq('id', t.event_id);
          }
        }

        if (kind === 'boost' && payment?.post_id) {
          // Cancel the boost immediately
          await supabase.from('posts').update({ boosted_until: null }).eq('id', payment.post_id);
        }

        console.log(`↩️ Refund processed: kind=${kind} session=${sessionId} status=${newStatus}`);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
