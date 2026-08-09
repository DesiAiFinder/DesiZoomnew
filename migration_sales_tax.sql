-- ── Sales tax foundation ─────────────────────────────────────────────────────
-- Mirrors how DoorDash and Uber Eats actually operate:
--
--   Collect tax on every order, always.
--   Then a per-jurisdiction flag decides who remits it:
--     • we are the registered marketplace facilitator → the tax stays with us
--       (added to Stripe's application_fee) and WE file and pay it
--     • we are not                                    → the tax rides through
--       to the merchant in their payout and THEY file and pay it
--   Show both parties which, every month.
--
-- The point of the table below is that the CPA's answer becomes a one-row
-- UPDATE rather than a code change. Start with everything pass-through, and
-- flip a state to we_remit the day you register there.
--
-- Safe to run more than once.

create table if not exists public.tax_jurisdictions (
  code        text primary key,           -- 'TX', 'NJ', 'CA' …
  name        text not null,
  we_remit    boolean not null default false,  -- are we the registered facilitator here?
  registered  boolean not null default false,  -- do we hold a sales tax permit here?
  accepting   boolean not null default false,  -- may merchants sign up in this state?
  note        text,
  updated_at  timestamptz default now()
);

comment on table public.tax_jurisdictions is
  'Per-state tax posture. we_remit=false means the merchant is seller of record and the tax is included in their payout.';

-- Texas is where we operate and where physical presence makes the facilitator
-- question live. Everywhere else stays closed to merchants until deliberately
-- opened — every state you accept a merchant in is a state you may have to
-- register and file in.
insert into public.tax_jurisdictions (code, name, we_remit, registered, accepting, note)
values ('TX', 'Texas', false, false, true,
        'Home state. Physical presence — facilitator status to be confirmed with CPA.')
on conflict (code) do nothing;

-- Read-only to the app; only an admin changes posture.
alter table public.tax_jurisdictions enable row level security;

drop policy if exists "anyone reads tax jurisdictions" on public.tax_jurisdictions;
create policy "anyone reads tax jurisdictions"
  on public.tax_jurisdictions for select using (true);

drop policy if exists "admins manage tax jurisdictions" on public.tax_jurisdictions;
create policy "admins manage tax jurisdictions"
  on public.tax_jurisdictions for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Per-order tax record ─────────────────────────────────────────────────────
-- Recorded on every order so the monthly statement can be produced from data
-- rather than reconstructed later.
alter table public.orders
  add column if not exists tax_cents        integer not null default 0,
  add column if not exists tax_jurisdiction text,     -- 'TX'
  add column if not exists tax_remitted_by  text;     -- 'platform' | 'merchant' | null

comment on column public.orders.tax_remitted_by is
  'Who owes this tax to the state. platform = we keep and remit it; merchant = it was included in their payout.';

-- ── Monthly statement ────────────────────────────────────────────────────────
-- What DoorDash calls the "Subtotal Tax Breakdown": per merchant, per month,
-- how much tax was collected and who is responsible for remitting it.
create or replace view public.tax_monthly_breakdown as
select
  date_trunc('month', o.created_at)              as month,
  o.owner_id,
  r.name                                          as business,
  coalesce(o.tax_jurisdiction, 'unknown')         as jurisdiction,
  coalesce(o.tax_remitted_by, 'uncollected')      as remittance_responsibility,
  count(*)                                        as orders,
  sum(o.subtotal_cents)                           as taxable_basis_cents,
  sum(o.tax_cents)                                as tax_cents
from public.orders o
left join public.restaurants r on r.id = o.restaurant_id
where o.status <> 'pending'
group by 1, 2, 3, 4, 5
order by 1 desc, 3;

-- ── Where are we approaching a registration threshold? ───────────────────────
-- Economic nexus arrives silently and applies retroactively. Check quarterly.
create or replace view public.sales_by_state as
select
  split_part(r.city, ',', 2)                      as state,   -- ' TX' from 'Little Elm, TX'
  count(*)                                        as orders,
  sum(o.subtotal_cents) / 100.0                   as sales_dollars
from public.orders o
join public.restaurants r on r.id = o.restaurant_id
where o.status <> 'pending'
group by 1
order by sales_dollars desc;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- select * from public.tax_jurisdictions;
-- select * from public.sales_by_state;
-- select * from public.tax_monthly_breakdown limit 20;
