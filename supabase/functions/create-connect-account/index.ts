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
    const { user_id, return_url } = await req.json();
    if (!user_id) throw new Error('user_id required');

    // Check if seller already has a connected account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user_id)
      .single();

    let accountId = profile?.stripe_account_id;

    // Create new Express account if needed
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: { transfers: { requested: true } },
      });
      accountId = account.id;

      // Save to profiles table
      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user_id);
    }

    // Create onboarding link (valid for ~10 min)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${return_url}?stripe=refresh`,
      return_url: `${return_url}?stripe=success`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, account_id: accountId }),
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
