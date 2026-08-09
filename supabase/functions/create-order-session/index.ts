// Food pickup order checkout: customer pays for a cart; platform keeps 6%,
// restaurant receives the rest via Stripe Connect.
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

const COMMISSION_RATE = 0.06; // 6% — matches DoorDash pickup, far below their 15–30% delivery

// Customer-side service fee (option C): 2% + $0.69, capped at $1.99.
//
// These are Stripe destination charges, so DesiZoom pays the processing fee
// (2.9% + $0.30) out of its own commission. Without this, 6% of a $5 order is
// $0.30 against $0.45 of Stripe cost — every small order lost money, and more
// of them made it worse. Capped so large catering orders are never penalised.
// The restaurant's 6% is untouched by any of this.
const SERVICE_FEE_BPS = 200;        // 2%
const SERVICE_FEE_FLAT_CENTS = 69;
const SERVICE_FEE_MAX_CENTS = 199;

function serviceFee(subtotalCents: number): number {
  const raw = Math.round(subtotalCents * SERVICE_FEE_BPS / 10000) + SERVICE_FEE_FLAT_CENTS;
  return Math.min(raw, SERVICE_FEE_MAX_CENTS);
}

/** 'TX' from 'Little Elm, TX'. Null if the city isn't in that shape. */
function stateOf(city: string | null | undefined): string | null {
  const part = (city ?? '').split(',')[1]?.trim().toUpperCase();
  return part && part.length === 2 ? part : null;
}


interface CartItem { id: string; name: string; price_cents: number; quantity: number; }

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { restaurant_id, items, customer_name, customer_phone, pickup_time, note, fulfillment_type, delivery_address, success_url, cancel_url, embedded } = await req.json();

    // Identify the buyer from the JWT, never from the request body. A body
    // value can be set to anyone's id by whoever calls this endpoint, which
    // would attribute a purchase — and the resulting ticket/order/booking — to
    // another account. refund-payment already did this correctly; these didn't.
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user: authUser } } = await supabase.auth.getUser(jwt);
    if (!authUser) throw new Error('You must be signed in.');
    const customer_id = authUser.id;
    if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
      throw new Error('restaurant_id and items required');
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, city, owner_id, is_open, is_active, offers_pickup, offers_delivery, offers_shipping, delivery_fee_cents, delivery_minimum_cents, shipping_fee_cents')
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

    // ── Fulfillment: validate the chosen method and compute its fee ──────────
    const method = (fulfillment_type as string) || 'pickup';
    const supports =
      method === 'pickup'   ? restaurant.offers_pickup !== false :
      method === 'delivery' ? !!restaurant.offers_delivery :
      method === 'shipping' ? !!restaurant.offers_shipping : false;
    if (!supports) throw new Error(`This business does not offer ${method}.`);
    if (method !== 'pickup' && !delivery_address) throw new Error('An address is required for delivery or shipping.');
    if (method === 'delivery' && (restaurant.delivery_minimum_cents ?? 0) > subtotal) {
      throw new Error(`Delivery requires a minimum order of $${((restaurant.delivery_minimum_cents ?? 0) / 100).toFixed(2)}.`);
    }
    const fulfillmentFee =
      method === 'delivery' ? (restaurant.delivery_fee_cents ?? 0) :
      method === 'shipping' ? (restaurant.shipping_fee_cents ?? 0) : 0;

    // Commission applies to the items only — the business keeps 100% of the
    // delivery/shipping fee since they're doing that work themselves.
    const commission = Math.round(subtotal * COMMISSION_RATE);
    const serviceFeeCents = serviceFee(subtotal);

    // ── Sales tax ────────────────────────────────────────────────────────────
    // Collected only where we are registered. Charging tax you have no permit
    // to charge is its own offence, so an unregistered state collects nothing.
    // Whether we then keep it or pass it to the merchant is `we_remit`.
    const stateCode = stateOf(restaurant.city);
    let taxCents = 0;
    let taxJurisdiction: string | null = null;
    let taxRemittedBy: string | null = null;

    if (stateCode) {
      const { data: juris } = await supabase
        .from('tax_jurisdictions')
        .select('code, rate_bps, registered, we_remit')
        .eq('code', stateCode)
        .maybeSingle();

      if (juris?.registered && juris.rate_bps > 0) {
        // Tax the food only. Whether the service fee is also taxable is a
        // live question for the CPA — see TAX_COMPLIANCE.md — so it is
        // deliberately excluded until that's answered.
        taxCents = Math.round(subtotal * juris.rate_bps / 10000);
        taxJurisdiction = juris.code;
        taxRemittedBy = juris.we_remit ? 'platform' : 'merchant';
      }
    }

    // What DesiZoom retains from the charge. The service fee is ours. Tax is
    // ours to hold only when we're the one filing it — otherwise it rides
    // through to the merchant in their payout and they remit.
    const platformFee = commission + serviceFeeCents + (taxRemittedBy === 'platform' ? taxCents : 0);

    // Create pending order + items
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        restaurant_id, owner_id: restaurant.owner_id, customer_id,
        customer_name: customer_name || null, customer_phone: customer_phone || null,
        pickup_time: pickup_time || 'ASAP', note: note || null,
        fulfillment_type: method,
        delivery_address: method === 'pickup' ? null : delivery_address,
        delivery_fee_cents: fulfillmentFee,
        subtotal_cents: subtotal, commission_cents: commission, status: 'pending',
        service_fee_cents: serviceFeeCents,
        tax_cents: taxCents, tax_jurisdiction: taxJurisdiction, tax_remitted_by: taxRemittedBy,
      })
      .select().single();
    if (oErr) throw oErr;

    await supabase.from('order_items').insert(
      lineItems.map((li) => ({ order_id: order.id, item_name: li.name, price_cents: li.price_cents, quantity: li.quantity }))
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        ...lineItems.map((li) => ({
          price_data: { currency: 'usd', unit_amount: li.price_cents, product_data: { name: li.name } },
          quantity: li.quantity,
        })),
        ...(fulfillmentFee > 0 ? [{
          price_data: {
            currency: 'usd', unit_amount: fulfillmentFee,
            product_data: { name: method === 'delivery' ? 'Delivery fee' : 'Shipping fee' },
          },
          quantity: 1,
        }] : []),
        {
          price_data: {
            currency: 'usd', unit_amount: serviceFeeCents,
            product_data: { name: 'Service fee' },
          },
          quantity: 1,
        },
        ...(taxCents > 0 ? [{
          price_data: {
            currency: 'usd', unit_amount: taxCents,
            product_data: { name: 'Sales tax' },
          },
          quantity: 1,
        }] : []),
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
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
    // Log it. Supabase's client only surfaces "non-2xx status code" to the
    // browser, so without this the reason never reaches anyone.
    console.error('failed:', message);
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
