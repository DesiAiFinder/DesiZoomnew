// Food pickup order checkout: customer pays for a cart; platform keeps 6%,
// restaurant receives the rest via Stripe Connect.
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

const COMMISSION_RATE = 0.06; // 6% — far below DoorDash's ~30%

interface CartItem { id: string; name: string; price_cents: number; quantity: number; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { restaurant_id, customer_id, items, customer_name, customer_phone, pickup_time, note, success_url, cancel_url, embedded } = await req.json();
    if (!restaurant_id || !customer_id || !Array.isArray(items) || items.length === 0) {
      throw new Error('restaurant_id, customer_id and items required');
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, owner_id, is_open, is_active')
      .eq('id', restaurant_id)
      .single();
    if (!restaurant || !restaurant.is_active) throw new Error('Restaurant not found');
    if (!restaurant.is_open) throw new Error('This restaurant is not accepting orders right now');
    if (restaurant.owner_id === customer_id) throw new Error('You cannot order from your own restaurant');

    // Re-fetch item prices from DB (never trust client prices)
    const ids = (items as CartItem[]).map((i) => i.id);
    const { data: menu } = await supabase
      .from('menu_items')
      .select('id, name, price_cents, is_available')
      .in('id', ids)
      .eq('restaurant_id', restaurant_id);
    const priceMap = new Map((menu ?? []).map((m) => [m.id, m]));

    const lineItems: { name: string; price_cents: number; quantity: number }[] = [];
    let subtotal = 0;
    for (const ci of items as CartItem[]) {
      const m = priceMap.get(ci.id);
      if (!m || !m.is_available) throw new Error(`"${ci.name}" is no longer available`);
      const qty = Math.max(1, Math.min(20, ci.quantity));
      lineItems.push({ name: m.name, price_cents: m.price_cents, quantity: qty });
      subtotal += m.price_cents * qty;
    }

    const { data: profile } = await supabase
      .from('profiles').select('stripe_account_id').eq('id', restaurant.owner_id).single();
    if (!profile?.stripe_account_id) throw new Error('This restaurant has not set up payments yet.');

    const commission = Math.round(subtotal * COMMISSION_RATE);

    // Create pending order + items
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        restaurant_id, owner_id: restaurant.owner_id, customer_id,
        customer_name: customer_name || null, customer_phone: customer_phone || null,
        pickup_time: pickup_time || 'ASAP', note: note || null,
        subtotal_cents: subtotal, commission_cents: commission, status: 'pending',
      })
      .select().single();
    if (oErr) throw oErr;

    await supabase.from('order_items').insert(
      lineItems.map((li) => ({ order_id: order.id, item_name: li.name, price_cents: li.price_cents, quantity: li.quantity }))
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems.map((li) => ({
        price_data: { currency: 'usd', unit_amount: li.price_cents, product_data: { name: li.name } },
        quantity: li.quantity,
      })),
      payment_intent_data: {
        application_fee_amount: commission,
        transfer_data: { destination: profile.stripe_account_id },
      },
      metadata: { kind: 'order', order_id: order.id },
      ...(embedded
        ? { ui_mode: 'embedded' as const, redirect_on_completion: 'never' as const }
        : { success_url, cancel_url }),
    });

    await supabase.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id);

    return new Response(JSON.stringify({ url: session.url, client_secret: session.client_secret }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
