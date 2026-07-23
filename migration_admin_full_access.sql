-- Gives admin accounts FULL access (select/insert/update/DELETE) on every
-- content table, so an admin can remove any ad, listing, restaurant, order,
-- stream, news item, review, booking, ticket, etc.
--
-- RLS policies are permissive (OR'd), so this ADDS admin power without
-- affecting normal users' existing policies. Safe to run more than once.
-- Requires public.is_admin() (created in migration_admin.sql).

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'posts', 'comments', 'votes', 'reports', 'payments',
    'restaurants', 'menu_items', 'orders', 'order_items',
    'live_streams', 'news_items', 'organizations',
    'service_providers', 'service_offerings', 'service_requests', 'service_bookings',
    'reviews', 'tickets', 'favorites', 'alerts', 'lead_unlocks',
    'local_info', 'push_subscriptions'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      -- make sure RLS is on (policies are ignored otherwise)
      EXECUTE format('alter table public.%I enable row level security', t);
      EXECUTE format('drop policy if exists "admins full access" on public.%I', t);
      EXECUTE format(
        'create policy "admins full access" on public.%I for all using (public.is_admin()) with check (public.is_admin())',
        t
      );
      RAISE NOTICE 'admin full access granted on %', t;
    END IF;
  END LOOP;
END $$;
