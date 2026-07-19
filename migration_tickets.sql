-- ── Event ticketing (5% commission) ───────────────────────────────────────────

-- Ticketing fields on event posts
alter table public.posts
  add column if not exists ticket_price_cents integer,   -- null = free event
  add column if not exists tickets_total integer,        -- null = unlimited
  add column if not exists tickets_sold integer default 0,
  add column if not exists venue text;

-- Ticket purchases
create table if not exists public.tickets (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.posts(id) on delete cascade,
  buyer_id          uuid not null references auth.users(id) on delete cascade,
  organizer_id      uuid not null references auth.users(id) on delete cascade,
  quantity          integer not null default 1,
  amount_cents      integer not null,
  commission_cents  integer not null,
  status            text default 'pending',   -- pending | paid | refunded
  stripe_session_id text,
  created_at        timestamptz default now()
);

alter table public.tickets enable row level security;

create policy "buyers and organizers read tickets"
  on public.tickets for select
  using (auth.uid() = buyer_id or auth.uid() = organizer_id or public.is_admin());

-- Inserts/updates happen via edge function (service role)

create index if not exists tickets_event_idx on public.tickets(event_id);
create index if not exists tickets_buyer_idx on public.tickets(buyer_id);
