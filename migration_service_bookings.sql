-- ── Service offerings, availability & bookings (8% commission model) ──────────

-- Provider availability
alter table public.service_providers
  add column if not exists available_days text[] default '{}',   -- e.g. {Sat,Sun}
  add column if not exists availability_note text;               -- e.g. "Evenings after 6pm on weekdays"

-- Offerings: "Satyanarayana Pooja — $100"
create table if not exists public.service_offerings (
  id             uuid primary key default gen_random_uuid(),
  provider_id    uuid not null references public.service_providers(id) on delete cascade,
  title          text not null,
  category       text not null,
  description    text,
  price_cents    integer not null,
  duration_label text,                 -- e.g. "~2 hours"
  is_active      boolean default true,
  created_at     timestamptz default now()
);

-- Bookings: customer books an offering for a date; pays through DesiZoom
create table if not exists public.service_bookings (
  id                uuid primary key default gen_random_uuid(),
  offering_id       uuid not null references public.service_offerings(id) on delete cascade,
  provider_user_id  uuid not null references auth.users(id) on delete cascade,
  customer_id       uuid not null references auth.users(id) on delete cascade,
  requested_date    date not null,
  requested_time    text,              -- e.g. "10:00 AM"
  note              text,
  customer_phone    text,              -- revealed to provider after payment
  amount_cents      integer not null,
  commission_cents  integer not null,
  status            text default 'pending',  -- pending | paid | completed | cancelled | refunded
  stripe_session_id text,
  created_at        timestamptz default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.service_offerings enable row level security;
alter table public.service_bookings  enable row level security;

create policy "public read active offerings"
  on public.service_offerings for select
  using (is_active = true or public.is_admin()
         or exists (select 1 from public.service_providers p where p.id = provider_id and p.user_id = auth.uid()));

create policy "providers manage own offerings"
  on public.service_offerings for all
  using (exists (select 1 from public.service_providers p where p.id = provider_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.service_providers p where p.id = provider_id and p.user_id = auth.uid()));

-- Bookings: only the two parties (and admins) can see; inserts via edge function (service role)
create policy "participants read bookings"
  on public.service_bookings for select
  using (auth.uid() = customer_id or auth.uid() = provider_user_id or public.is_admin());

create policy "participants update bookings"
  on public.service_bookings for update
  using (auth.uid() = customer_id or auth.uid() = provider_user_id or public.is_admin());

create index if not exists offerings_category_idx on public.service_offerings(category, is_active);
create index if not exists bookings_provider_idx on public.service_bookings(provider_user_id, status);
create index if not exists bookings_customer_idx on public.service_bookings(customer_id, status);
