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

// Commission: 8% (covers Stripe's ~2.9% + 30¢ processing fee, nets platform ~5%)
function calcCommission(priceCents: number): number {
  return Math.round(priceCents * 0.08);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { post_id, buyer_id, success_url, cancel_url } = await req.json();
    if (!post_id || !buyer_id) throw new Error('post_id and buyer_id required');

    // Fetch post details
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('id, title, price_cents, stripe_account_id, is_sold, user_id')
      .eq('id', post_id)
      .single();

    if (postErr || !post) throw new Error('Post not found');
    if (post.is_sold) throw new Error('This item has already been sold');
    if (!post.price_cents) throw new Error('This item has no price set');
    if (post.user_id === buyer_id) throw new Error('You cannot buy your own listing');

    // Look up seller's Stripe account from their profile
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', post.user_id)
      .single();

    const stripeAccountId = sellerProfile?.stripe_account_id;
    if (!stripeAccountId) throw new Error('Seller has not connected their bank account yet. Please ask the seller to set up payments.');

    const commission = calcCommission(post.price_cents);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: post.price_cents,
            product_data: {
              name: post.title,
              description: 'DesiZoom Marketplace',
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: commission,
        transfer_data: {
          destination: stripeAccountId,
        },
      },
      metadata: {
        post_id: post.id,
        buyer_id,
        seller_id: post.user_id,
        commission_cents: commission.toString(),
      },
      success_url: success_url || 'https://desizoomnew.vercel.app/marketplace?payment=success',
      cancel_url: cancel_url || 'https://desizoomnew.vercel.app/marketplace?payment=cancelled',
    });

    // Pre-create a pending payment record
    await supabase.from('payments').insert({
      post_id: post.id,
      buyer_id,
      seller_id: post.user_id,
      amount_cents: post.price_cents,
      commission_cents: commission,
      stripe_session_id: session.id,
      stripe_account_id: stripeAccountId,
      status: 'pending',
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
