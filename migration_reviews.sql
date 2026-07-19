-- ── Reviews for service bookings ──────────────────────────────────────────────
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.service_bookings(id) on delete cascade unique,
  offering_id   uuid references public.service_offerings(id) on delete set null,
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id   uuid not null references auth.users(id) on delete cascade,
  rating        integer not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz default now()
);

alter table public.reviews enable row level security;

-- Anyone can read reviews (they drive trust)
create policy "public read reviews"
  on public.reviews for select using (true);

-- Only the customer of a paid/completed booking can review it
create policy "customers write reviews"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.service_bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
        and b.status in ('paid', 'completed')
    )
  );

-- Aggregate rating per provider
create or replace view public.provider_ratings as
select provider_user_id,
       round(avg(rating)::numeric, 1) as avg_rating,
       count(*) as review_count
from public.reviews
group by provider_user_id;

create index if not exists reviews_provider_idx on public.reviews(provider_user_id);
create index if not exists reviews_offering_idx on public.reviews(offering_id);
