-- ── Attribute posts to a business ────────────────────────────────────────────
-- A deal posted by someone who owns a business should carry that business's
-- name and logo, and link through to where they actually transact (ordering
-- menu for restaurants/grocery, booking flow for everyone else).
--
-- Posts by users with no business keep showing the individual's display name,
-- exactly as before. Safe to run more than once.

alter table public.posts
  add column if not exists business_id uuid references public.businesses(id) on delete set null;

create index if not exists posts_business_idx on public.posts(business_id);

-- Backfill: any existing post whose author owns a business gets attributed,
-- so the 20 posts already live become testable immediately.
update public.posts p
set    business_id = b.id
from   public.businesses b
where  b.owner_id = p.user_id
  and  p.business_id is null;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- Run separately; the SQL editor only shows the last statement's result.

-- (a) How many posts got attributed, and to whom:
--   select p.title, p.type, b.name as business, b.business_type
--   from public.posts p
--   join public.businesses b on b.id = p.business_id
--   order by p.created_at desc;

-- (b) Posts still unattributed (expected: authors with no business):
--   select count(*) from public.posts where business_id is null;
