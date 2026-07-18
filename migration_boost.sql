-- ── Boost + Sponsored posts ───────────────────────────────────────────────────
alter table public.posts
  add column if not exists is_sponsored boolean default false,
  add column if not exists boosted_until timestamptz;

create index if not exists posts_sponsored_idx on public.posts(is_sponsored) where is_sponsored;
create index if not exists posts_boosted_idx on public.posts(boosted_until) where boosted_until is not null;
