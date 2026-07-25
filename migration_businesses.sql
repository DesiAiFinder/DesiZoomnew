-- ── Unified business profiles ─────────────────────────────────────────────────
-- One profile per business of any type. The transactional engines stay separate:
--   restaurant/grocery  → restaurants + menu_items + orders   (6%)
--   everything else     → service_providers + offerings + bookings (8%)
-- The wizard creates a businesses row AND the matching engine row, linked
-- via business_id. Existing restaurants/providers keep working untouched.

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

-- Link the engine rows to their business profile
alter table public.restaurants
  add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.service_providers
  add column if not exists business_id uuid references public.businesses(id) on delete set null;

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

drop policy if exists "admins full businesses" on public.businesses;
create policy "admins full businesses" on public.businesses
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Backfill: give existing restaurants/providers a business profile ─────────
insert into public.businesses (owner_id, name, business_type, city, address, phone, description, logo_url, is_active)
select r.owner_id, r.name, 'restaurant', r.city, r.address, r.phone, r.pickup_note, r.logo_url, r.is_active
from public.restaurants r
where r.business_id is null
  and not exists (select 1 from public.businesses b where b.owner_id = r.owner_id)
on conflict do nothing;

update public.restaurants r
set business_id = b.id
from public.businesses b
where r.business_id is null and b.owner_id = r.owner_id;

insert into public.businesses (owner_id, name, business_type, city, phone, email, website, description, is_active)
select p.user_id, p.business_name, 'other', p.city, p.phone, p.email, p.website, p.description, true
from public.service_providers p
where p.business_id is null
  and not exists (select 1 from public.businesses b where b.owner_id = p.user_id)
on conflict do nothing;

update public.service_providers p
set business_id = b.id
from public.businesses b
where p.business_id is null and b.owner_id = p.user_id;
