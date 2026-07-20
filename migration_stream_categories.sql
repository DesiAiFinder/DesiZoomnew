-- ── Live stream categories ────────────────────────────────────────────────────
alter table public.live_streams
  add column if not exists category text default 'community';
-- values: news | event | cultural | religious | community | sports | other

create index if not exists streams_category_idx on public.live_streams(category, status);

-- Broadcast scope: local (city only) or national (everyone)
alter table public.live_streams
  add column if not exists audience text default 'national';
