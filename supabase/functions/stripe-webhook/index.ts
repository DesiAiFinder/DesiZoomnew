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
    const { post_id, buyer_id, seller_id } = session.metadata ?? {};

    if (session.payment_status === 'paid' && post_id) {
      // Mark post as sold
      await supabase
        .from('posts')
        .update({ is_sold: true })
        .eq('id', post_id);

      // Update payment record to completed
      await supabase
        .from('payments')
        .update({ status: 'completed' })
        .eq('stripe_session_id', session.id);

      console.log(`✅ Sale completed: post=${post_id} buyer=${buyer_id} seller=${seller_id}`);
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
