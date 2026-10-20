// Ticket purchase checkout: buyer pays for event tickets through DesiZoom.
// Platform keeps 5%, organizer receives the rest via Stripe Connect.
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

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { event_id, quantity, success_url, cancel_url, embedded } = await req.json();

    // Identify the buyer from the JWT, never from the request body. A body
    // value can be set to anyone's id by whoever calls this endpoint, which
    // would attribute a purchase — and the resulting ticket/order/booking — to
    // another account. refund-payment already did this correctly; these didn't.
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user: authUser } } = await supabase.auth.getUser(jwt);
    if (!authUser) throw new Error('You must be signed in.');
    const buyer_id = authUser.id;
    const qty = Math.max(1, parseInt(quantity) || 1);
    if (!event_id) throw new Error('event_id required');

    const { data: event } = await supabase
      .from('posts')
      .select('id, title, user_id, ticket_price_cents, tickets_total, tickets_sold, event_date, is_active')
      .eq('id', event_id)
      .single();

    if (!event || !event.is_active) throw new Error('Event not found');
    if (!event.ticket_price_cents) throw new Error('This is a free event');
    if (event.user_id === buyer_id) throw new Error('You cannot buy tickets to your own event');

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', event.user_id)
      .single();
    if (!profile?.stripe_account_id) {
      throw new Error('The organizer has not set up payments yet.');
    }

    // ── Claim the seats BEFORE opening checkout ──────────────────────────────
    // This used to be `if (tickets_sold + qty > tickets_total) throw` — a read,
    // then a decision, with nothing holding the seats in between. Two people
    // buying the last two seats at once both read the same count, both passed,
    // and both paid. reserve_tickets does it in one conditional UPDATE, so
    // Postgres serialises concurrent callers and the second one simply fails.
    const { data: reserved, error: rErr } = await supabase
      .rpc('reserve_tickets', { p_event_id: event.id, p_qty: qty });
    if (rErr) throw rErr;
    if (!reserved) throw new Error('Not enough tickets remaining');

    // From here on the seats are held. Every failure path must give them back,
    // or an abandoned checkout silently shrinks the event.
    const release = async () => {
      await supabase.rpc('release_tickets', { p_event_id: event.id, p_qty: qty })
        .then(() => {}, (e) => console.error('release_tickets failed', e));
    };

    try {
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
        // Hold the seats ~31 minutes, not Stripe's default 24 hours. On expiry
        // Stripe sends checkout.session.expired and the webhook puts them back.
        // A sold-out event whose seats are stuck behind abandoned tabs until
        // tomorrow is its own kind of broken. Stripe's minimum is exactly 30
        // minutes and it rejects anything under, so don't trim this to 30 —
        // a second of clock skew would fail the call.
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        ...(embedded
          ? { ui_mode: 'embedded' as const, redirect_on_completion: 'never' as const }
          : { success_url, cancel_url }),
      });

      await supabase.from('tickets').update({ stripe_session_id: session.id }).eq('id', ticket.id);

      return new Response(
        JSON.stringify({ url: session.url, client_secret: session.client_secret }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    } catch (inner) {
      // Stripe rejected the session, or the ticket row failed to write. The
      // seats are already claimed, so hand them back before giving up.
      await release();
      throw inner;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Log it. Supabase's client only surfaces "non-2xx status code" to the
    // browser, so without this the reason never reaches anyone.
    console.error('failed:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
