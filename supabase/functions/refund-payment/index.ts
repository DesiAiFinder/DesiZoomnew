// Refund a payment. Callable by a platform admin, or by the seller/business
// that received the money (e.g. a restaurant cancelling an order).
//
// The actual database roll-back (order status, tickets back on sale, item
// relisted…) is handled by the `charge.refunded` webhook, so this function
// only has to authorise the request and tell Stripe to refund.
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
    // ── Who is asking? (trust the JWT, never a user id from the body) ────────
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('You must be signed in.');

    const { session_id, reason } = await req.json();
    if (!session_id) throw new Error('session_id required');

    // ── Find the payment ─────────────────────────────────────────────────────
    const { data: payment } = await supabase
      .from('payments')
      .select('id, buyer_id, seller_id, amount_cents, status, kind, stripe_session_id')
      .eq('stripe_session_id', session_id)
      .maybeSingle();
    if (!payment) throw new Error('Payment not found.');
    if (payment.status === 'refunded') throw new Error('This payment was already refunded.');

    // ── Is this person allowed to refund it? ─────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = profile?.role === 'admin';
    const isSeller = !!payment.seller_id && payment.seller_id === user.id;
    if (!isAdmin && !isSeller) {
      throw new Error('Only an admin or the seller can refund this payment.');
    }

    // ── Resolve the payment intent from the checkout session ────────────────
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const pi = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
    if (!pi) throw new Error('No payment found for this session.');

    // reverse_transfer pulls the money back from the connected account;
    // refund_application_fee returns our commission too, so books stay clean.
    const refund = await stripe.refunds.create({
      payment_intent: pi,
      reason: reason === 'requested_by_customer' ? 'requested_by_customer' : undefined,
      refund_application_fee: true,
      reverse_transfer: true,
    });

    // Mark it straight away; the webhook will also confirm and roll back the
    // related order/ticket/booking.
    await supabase.from('payments').update({ status: 'refunded' }).eq('id', payment.id);

    // ── Tell the customer, so money doesn't just quietly reappear ───────────
    if (payment.buyer_id) {
      const amount = `$${(payment.amount_cents / 100).toFixed(2)}`;
      const what =
        payment.kind === 'order'   ? 'Your food order was cancelled' :
        payment.kind === 'booking' ? 'Your booking was cancelled' :
        payment.kind === 'ticket'  ? 'Your event tickets were refunded' :
                                     'Your payment was refunded';
      const message = `${amount} is on its way back to your card. It usually takes 5–10 business days.`;

      // In-app record (shows in the profile's alerts/history)
      await supabase.from('notifications').insert({
        user_id: payment.buyer_id, title: what, body: message, url: '/profile',
      }).then(() => {}, () => {}); // table is optional — ignore if absent

      // Push notification if they've allowed them
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ user_id: payment.buyer_id, title: what, body: message, url: '/profile' }),
        });
      } catch (e) {
        console.error('refund push failed (non-fatal)', e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, refund_id: refund.id, amount_cents: refund.amount }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
