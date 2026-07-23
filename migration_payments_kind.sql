-- Adds a revenue-stream label to payments and allows platform-only rows
-- (boost / lead) where there is no seller. Safe to run more than once.

alter table public.payments add column if not exists kind text default 'sale';
-- kind: 'sale' | 'order' | 'ticket' | 'booking' | 'boost' | 'lead'

-- Boost and lead revenue is 100% platform, so there is no counterparty.
alter table public.payments alter column buyer_id  drop not null;
alter table public.payments alter column seller_id drop not null;

-- Backfill: label any existing rows that are clearly marketplace sales.
update public.payments set kind = 'sale' where kind is null;
