-- ── Food ordering (pickup) — ChowNow-style, low commission ────────────────────

-- A restaurant, owned by a user (owner receives payouts via profiles.stripe_account_id)
create table if not exists public.restaurants (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  cuisine       text,                       -- e.g. "South Indian", "Punjabi"
  city          text not null,
  address       text,
  phone         text,
  logo_url      text,
  pickup_note   text,                        -- e.g. "Ready in ~20 min, park in front"
  is_open       boolean default true,        -- accepting orders right now
  is_active     boolean default true,        -- listed at all
  created_at    timestamptz default now()
);

-- Menu items
create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  description   text,
  category      text default 'Main',         -- Appetizers | Main | Breads | Rice | Desserts | Drinks
  price_cents   integer not null,
  image_url     text,
  is_veg        boolean default true,
  is_available  boolean default true,
  sort          integer default 0,
  created_at    timestamptz default now()
);

-- Orders
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants(id) on delete cascade,
  owner_id          uuid not null references auth.users(id) on delete cascade,
  customer_id       uuid not null references auth.users(id) on delete cascade,
  customer_name     text,
  customer_phone    text,
  pickup_time       text,                    -- e.g. "ASAP" or "6:30 PM"
  note              text,
  subtotal_cents    integer not null,
  commission_cents  integer not null,
  status            text default 'pending',  -- pending | paid | preparing | ready | picked_up | cancelled
  stripe_session_id text,
  created_at        timestamptz default now()
);

-- Order line items (snapshot name/price so history is stable)
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  item_name     text not null,
  price_cents   integer not null,
  quantity      integer not null default 1
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.restaurants enable row level security;
alter table public.menu_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Restaurants: public read active; owner manages own
create policy "public read active restaurants"
  on public.restaurants for select
  using (is_active = true or auth.uid() = owner_id or public.is_admin());
create policy "owners manage restaurants"
  on public.restaurants for all
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

-- Menu: public read available; owner manages
create policy "public read menu"
  on public.menu_items for select
  using (
    is_available = true
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
    or public.is_admin()
  );
create policy "owners manage menu"
  on public.menu_items for all
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));

-- Orders: customer + restaurant owner (and admin) can read; owner updates status
create policy "participants read orders"
  on public.orders for select
  using (auth.uid() = customer_id or auth.uid() = owner_id or public.is_admin());
create policy "owners update orders"
  on public.orders for update
  using (auth.uid() = owner_id or public.is_admin());

create policy "participants read order items"
  on public.order_items for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or o.owner_id = auth.uid()))
    or public.is_admin()
  );

create index if not exists menu_restaurant_idx on public.menu_items(restaurant_id, category, sort);
create index if not exists orders_owner_idx on public.orders(owner_id, status, created_at);
create index if not exists orders_customer_idx on public.orders(customer_id, created_at);
create index if not exists restaurants_city_idx on public.restaurants(city, is_active);

-- Menu item photos reuse the existing 'post-images' storage bucket.
