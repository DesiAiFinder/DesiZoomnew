-- ── Desi News (RSS-fed headlines + community-submitted local news) ─────────────
create table if not exists public.news_items (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  url          text not null,
  source       text,                       -- outlet name or "Community"
  category     text default 'India',       -- India | Cricket | US Desi | Bollywood | Local | Business
  city         text,                        -- set for community/local submissions
  image_url    text,
  submitted_by uuid references auth.users(id) on delete set null,  -- null = RSS-fetched
  status       text default 'approved',     -- rss items auto-approved; community => pending
  published_at timestamptz default now(),
  created_at   timestamptz default now(),
  unique (url)
);

alter table public.news_items enable row level security;

-- Everyone reads approved news
create policy "public read approved news"
  on public.news_items for select
  using (status = 'approved' or submitted_by = auth.uid() or public.is_admin());

-- Signed-in users can submit local news (goes to pending)
create policy "users submit news"
  on public.news_items for insert
  with check (auth.uid() = submitted_by);

-- Admins moderate
create policy "admins manage news"
  on public.news_items for update
  using (public.is_admin());
create policy "admins delete news"
  on public.news_items for delete
  using (public.is_admin());

create index if not exists news_status_idx on public.news_items(status, published_at desc);
create index if not exists news_category_idx on public.news_items(category, status);

-- Schedule daily refresh (enable pg_cron + pg_net, then run):
-- select cron.schedule('fetch-news-daily','0 */6 * * *',
--   $$ select net.http_post(
--        url := 'https://rroyfpheqwalxylgeidu.supabase.co/functions/v1/fetch-news',
--        headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb); $$);
