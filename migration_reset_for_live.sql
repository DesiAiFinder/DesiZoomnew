-- Reset to an empty site before the first real merchant.
--
-- Everything currently on DesiZoom is made-up test content, and Supabase is
-- shared between Stripe test and live mode. Left in place it would show as
-- real revenue in Admin → Money on day one, and a visitor could click "Order
-- now" on a restaurant that does not exist.
--
-- BACK UP FIRST. Run backup.cmd and confirm the file is non-zero before this.
-- There is no undo.
--
-- KEPT deliberately:
--   profiles          — your login and admin role. Wiping this locks you out.
--   tax_jurisdictions — the Texas config (registered, we_remit, 8.25%).
--   auth.users        — untouched; sign-ins keep working.

begin;

-- ── Transactions ─────────────────────────────────────────────────────────────
-- Live reporting must start at zero or you will never fully trust it.
truncate table
  public.order_items,
  public.orders,
  public.payments,
  public.tickets,
  public.service_bookings,
  public.service_requests,
  public.lead_unlocks
restart identity cascade;

-- ── Listings and content ─────────────────────────────────────────────────────
truncate table
  public.menu_items,
  public.restaurants,
  public.businesses,
  public.service_offerings,
  public.service_providers,
  public.organizations,
  public.live_streams,
  public.news_items
restart identity cascade;

-- ── Community activity ───────────────────────────────────────────────────────
truncate table
  public.votes,
  public.comments,
  public.posts,
  public.favorites,
  public.reviews,
  public.reports,
  public.messages,
  public.conversations
restart identity cascade;

-- ── Notifications ────────────────────────────────────────────────────────────
-- Push subscriptions are test-device tokens; they re-register on next allow.
truncate table
  public.alerts,
  public.notifications,
  public.push_subscriptions
restart identity cascade;

-- ── Connect accounts ─────────────────────────────────────────────────────────
-- This is the one people forget. Every stripe_account_id points at a TEST-mode
-- Connect account that live payments cannot pay out to. Clearing them forces
-- each owner through onboarding again instead of failing at checkout in a way
-- that looks like our bug.
update public.profiles set stripe_account_id = null;

commit;

-- ── Confirm ──────────────────────────────────────────────────────────────────
-- Every count should be 0, and the last two rows are what we intended to keep.
select 'orders' t, count(*) from public.orders
union all select 'payments',     count(*) from public.payments
union all select 'restaurants',  count(*) from public.restaurants
union all select 'businesses',   count(*) from public.businesses
union all select 'posts',        count(*) from public.posts
union all select 'menu_items',   count(*) from public.menu_items
union all select 'tickets',      count(*) from public.tickets
union all select 'connect ids',  count(*) from public.profiles where stripe_account_id is not null
union all select 'KEEP profiles',        count(*) from public.profiles
union all select 'KEEP tax_juris',       count(*) from public.tax_jurisdictions;
