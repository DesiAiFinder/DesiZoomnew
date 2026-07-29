-- SECURITY FIX #2 — profiles email/stripe_account_id are world-readable.
-- Run AFTER migration_fix_profile_role.sql. Safe to run more than once.
--
-- Problem: schema.sql has
--     create policy "Public read profiles" on public.profiles for select using (true);
-- The anon key is public (it ships in the JS bundle), so anyone can run
--     supabase.from('profiles').select('email')
-- and dump every user's email address, plus stripe_account_id.
--
-- Fix: profiles becomes own-row-or-admin. The genuinely public fields
-- (display name, city, join date) move to a narrow view.

-- ── 1. Narrow public view for seller trust signals ───────────────────────────
-- Deliberately NOT security_invoker: this view is the sanctioned public window
-- onto profiles, so it reads past the row policy below but exposes only these
-- four columns. Never add email or stripe_account_id here.
-- NB: no `city` column here. schema.sql declares one but the live table has
-- never had it — see LocationContext.tsx, which reads/writes profiles.city and
-- has been failing silently in production.
create or replace view public.public_profiles as
  select id, display_name, created_at
  from public.profiles;

alter view public.public_profiles set (security_invoker = off);

grant select on public.public_profiles to anon, authenticated;

-- ── 2. Lock the base table down to own-row-or-admin ──────────────────────────
-- Covers every current reader:
--   AuthContext .select('role')            → own row  ✓
--   LocationContext .select('city')        → own row  ✓ (column missing; see above)
--   SellerOnboard / Marketplace
--     .select('stripe_account_id')         → own row  ✓
--   Admin fetchAllUsers .select('*')       → is_admin() ✓
--   fetchSellerStats display_name          → now uses public_profiles
alter policy "Public read profiles"
  on public.profiles
  using (auth.uid() = id or public.is_admin());


-- ── Verify ───────────────────────────────────────────────────────────────────
-- Run each separately; the SQL editor only shows the last result.

-- (a) SELECT policy should now read: (auth.uid() = id) OR is_admin()
--     -- select policyname, cmd, qual from pg_policies
--     -- where schemaname='public' and tablename='profiles';

-- (b) The view returns rows and has no email column:
--     -- select * from public.public_profiles limit 3;

-- (c) Sanity check from the app itself, signed OUT, in the browser console:
--     -- await supabase.from('profiles').select('email')   → expect [] / error
--     -- await supabase.from('public_profiles').select('*') → expect rows
