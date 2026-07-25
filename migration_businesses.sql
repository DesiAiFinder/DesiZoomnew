-- ── Unified business profiles ─────────────────────────────────────────────────
-- One profile per business of any type. The transactional engines stay separate:
--   restaurant/grocery  → restaurants + menu_items + orders        (6%)
--   everything else     → service_providers + offerings + bookings (8%)
--
-- Safe to run at any time: every reference to restaurants / service_providers
-- is guarded, so this works even if those migrations haven't been run yet.
-- (Re-run this file after you add them, and it will link + backfill them.)

create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  business_type text not null default 'other',
  -- restaurant | grocery | catering | photo | priest | beauty | venue | other
  city          text not null,
  address       text,
  phone         text,
  email         text,
  website       text,
  description   text,
  logo_url      text,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- One business per owner for now (simple; can relax later)
create unique index if not exists businesses_owner_uidx on public.businesses(owner_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.businesses enable row level security;

drop policy if exists "public read active businesses" on public.businesses;
create policy "public read active businesses" on public.businesses
  for select using (is_active = true or auth.uid() = owner_id or public.is_admin());

drop policy if exists "owner insert business" on public.businesses;
create policy "owner insert business" on public.businesses
  for insert with check (auth.uid() = owner_id);

drop policy if exists "owner update business" on public.businesses;
create policy "owner update business" on public.businesses
  for update using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "owner delete business" on public.businesses;
create policy "owner delete business" on public.businesses
  for delete using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "admins full businesses" on public.businesses;
create policy "admins full businesses" on public.businesses
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Link + backfill engine tables (only if they exist) ───────────────────────
DO $$
BEGIN
  ---------------------------------------------------------------- restaurants
  IF to_regclass('public.restaurants') IS NOT NULL THEN
    ALTER TABLE public.restaurants
      ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;

    INSERT INTO public.businesses (owner_id, name, business_type, city, address, phone, description, logo_url, is_active)
    SELECT r.owner_id, r.name, 'restaurant', r.city, r.address, r.phone, r.pickup_note, r.logo_url, r.is_active
    FROM public.restaurants r
    WHERE r.business_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = r.owner_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.restaurants r
    SET business_id = b.id
    FROM public.businesses b
    WHERE r.business_id IS NULL AND b.owner_id = r.owner_id;

    RAISE NOTICE 'restaurants linked to businesses';
  ELSE
    RAISE NOTICE 'skipped restaurants (table not found — run migration_food_ordering.sql, then re-run this file)';
  END IF;

  ---------------------------------------------------------- service_providers
  IF to_regclass('public.service_providers') IS NOT NULL THEN
    ALTER TABLE public.service_providers
      ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;

    INSERT INTO public.businesses (owner_id, name, business_type, city, phone, email, website, description, is_active)
    SELECT p.user_id, p.business_name, 'other', p.city, p.phone, p.email, p.website, p.description, true
    FROM public.service_providers p
    WHERE p.business_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = p.user_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.service_providers p
    SET business_id = b.id
    FROM public.businesses b
    WHERE p.business_id IS NULL AND b.owner_id = p.user_id;

    RAISE NOTICE 'service_providers linked to businesses';
  ELSE
    RAISE NOTICE 'skipped service_providers (table not found — run migration_services.sql, then re-run this file)';
  END IF;
END $$;

-- ── What exists now? ─────────────────────────────────────────────────────────
SELECT
  to_regclass('public.businesses')        IS NOT NULL AS businesses_ok,
  to_regclass('public.restaurants')       IS NOT NULL AS restaurants_ok,
  to_regclass('public.service_providers') IS NOT NULL AS providers_ok,
  to_regclass('public.menu_items')        IS NOT NULL AS menu_items_ok,
  to_regclass('public.orders')            IS NOT NULL AS orders_ok,
  to_regclass('public.service_offerings') IS NOT NULL AS offerings_ok;
