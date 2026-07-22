-- ============================================================
--  DesiZoom — pre-launch test-data cleanup (with in-DB backup)
--  Scope: CONTENT ONLY. Keeps user accounts, seeded
--         Organizations, RSS news, and cached Local Info.
--
--  This script FIRST copies every content table to a *_backup
--  table inside the same database, THEN clears the originals.
--  So nothing is truly lost — you can restore from *_backup
--  until you drop them (see bottom).
--
--  Run in: Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================

-- The content tables we clear (kept tables are NOT listed here):
--   posts, votes, comments, reports, favorites, alerts,
--   restaurants, menu_items, orders, order_items,
--   service_providers, service_offerings, service_bookings, service_requests,
--   lead_unlocks, tickets, payments, live_streams,
--   conversations, messages

-- ── PHASE 1 + 2: back up each table, then clear it ───────────
DO $$
DECLARE
  t text;
  content_tables text[] := ARRAY[
    'order_items', 'orders', 'menu_items', 'restaurants',
    'service_bookings', 'service_offerings', 'service_providers', 'service_requests',
    'lead_unlocks',
    'tickets', 'payments',
    'live_streams',
    'reviews', 'reports', 'favorites', 'alerts', 'votes', 'comments',
    'messages', 'conversations',
    'posts'
  ];
BEGIN
  -- 1) Snapshot every existing content table into <name>_backup
  FOREACH t IN ARRAY content_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TABLE IF EXISTS public.%I', t || '_backup');
      EXECUTE format('CREATE TABLE public.%I AS SELECT * FROM public.%I', t || '_backup', t);
      RAISE NOTICE 'backed up: % -> %_backup', t, t;
    END IF;
  END LOOP;

  -- 2) Clear the originals (children-first via CASCADE)
  FOREACH t IN ARRAY content_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
      RAISE NOTICE 'cleared: %', t;
    END IF;
  END LOOP;
END $$;

-- ── PHASE 3: verify (wiped tables = 0, kept tables intact) ───
SELECT 'posts' AS table, count(*) FROM public.posts
UNION ALL SELECT 'restaurants', count(*) FROM public.restaurants
UNION ALL SELECT 'orders', count(*) FROM public.orders
UNION ALL SELECT 'live_streams', count(*) FROM public.live_streams
UNION ALL SELECT 'tickets', count(*) FROM public.tickets
UNION ALL SELECT 'payments', count(*) FROM public.payments
UNION ALL SELECT 'posts_backup (SAFETY COPY)', count(*) FROM public.posts_backup
UNION ALL SELECT 'profiles (KEPT)', count(*) FROM public.profiles
UNION ALL SELECT 'organizations (KEPT)', count(*) FROM public.organizations
UNION ALL SELECT 'news_items (KEPT)', count(*) FROM public.news_items;

-- ============================================================
--  RESTORE (if you need it) — copies rows back from a backup:
--    INSERT INTO public.posts SELECT * FROM public.posts_backup;
--  (repeat per table you want back)
--
--  WHEN YOU'RE CONFIDENT, delete the safety copies to free space:
--    DO $$
--    DECLARE r record;
--    BEGIN
--      FOR r IN SELECT tablename FROM pg_tables
--               WHERE schemaname='public' AND tablename LIKE '%\_backup'
--      LOOP EXECUTE format('DROP TABLE public.%I', r.tablename); END LOOP;
--    END $$;
-- ============================================================
