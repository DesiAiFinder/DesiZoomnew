-- Record merchant agreement acceptance.
--
-- A checkbox nobody can later prove was ticked is worth nothing. These three
-- columns are the evidence: who agreed, when, and to which version of the
-- terms — because the terms will change, and a dispute in 2028 is about what
-- the merchant agreed to in 2026, not about today's page.
--
-- Deliberately on `businesses`, not `profiles`: one owner may list several
-- businesses, and each listing is its own agreement.

begin;

alter table public.businesses
  add column if not exists terms_accepted_at      timestamptz,
  add column if not exists terms_accepted_version text;

comment on column public.businesses.terms_accepted_at is
  'When the owner ticked the merchant agreement box. NULL = signed up before we asked.';
comment on column public.businesses.terms_accepted_version is
  'MERCHANT_TERMS_VERSION at the moment of acceptance, e.g. 2026-10-15.';

commit;

-- Who has not accepted (expected: the pre-existing test rows, then nobody).
select name, city, created_at, terms_accepted_at, terms_accepted_version
  from public.businesses
 order by terms_accepted_at nulls first, created_at;
