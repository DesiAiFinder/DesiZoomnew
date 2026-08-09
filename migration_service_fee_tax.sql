-- ── Service fee + tax collection ─────────────────────────────────────────────
-- Run after migration_sales_tax.sql.
--
-- Service fee (option C): 2% of the food subtotal + $0.69, capped at $1.99.
-- Charged to the customer, kept by DesiZoom. It exists because Stripe's fixed
-- 30c means a 6% commission loses money on any order under about $9.68.
--
-- Tax: collected only where tax_jurisdictions says we are BOTH registered and
-- the remitter. Collecting tax you aren't registered to collect is its own
-- offence, so the default is off and stays off until the permit is in hand.
--
-- Safe to run more than once.

-- Rate per jurisdiction, in basis points. 825 = 8.25%.
--
-- NB: this is a single rate per state. Texas is 6.25% state plus up to 2% local,
-- and the local part varies by city. 8.25% is correct for Little Elm, Frisco and
-- Plano. It will NOT be correct once you operate somewhere with a different
-- local rate — at that point move to Stripe Tax, which resolves rates per
-- address. See TAX_COMPLIANCE.md.
alter table public.tax_jurisdictions
  add column if not exists rate_bps integer not null default 0;

comment on column public.tax_jurisdictions.rate_bps is
  'Sales tax rate in basis points (825 = 8.25%). Single rate per state — replace with Stripe Tax before operating across differing local rates.';

update public.tax_jurisdictions
set rate_bps = 825,
    note = 'Home state. 8.25% covers Little Elm / Frisco / Plano. Facilitator status to be confirmed with CPA.'
where code = 'TX' and rate_bps = 0;

-- Record what the customer was actually charged, so the Money tab and any
-- future filing are built from data rather than recomputed guesses.
alter table public.orders
  add column if not exists service_fee_cents integer not null default 0;

comment on column public.orders.service_fee_cents is
  'Customer-side platform fee. DesiZoom revenue, never part of the merchant payout.';

-- ── Turning tax on ───────────────────────────────────────────────────────────
-- Only after the Texas sales tax permit is issued AND the CPA confirms we are
-- the marketplace facilitator:
--
--   update public.tax_jurisdictions
--   set registered = true, we_remit = true
--   where code = 'TX';
--
-- If the CPA says the merchant is seller of record instead, set registered=true
-- and leave we_remit=false: tax is still collected, but it rides through in the
-- merchant's payout and they file it.

-- ── Verify ───────────────────────────────────────────────────────────────────
-- select code, name, rate_bps, registered, we_remit, accepting
-- from public.tax_jurisdictions;
