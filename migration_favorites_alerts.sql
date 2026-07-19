-- ── Favorites (saved posts) ───────────────────────────────────────────────────
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);

alter table public.favorites enable row level security;

create policy "users manage own favorites"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists favorites_user_idx on public.favorites(user_id);

-- ── Keyword alerts ────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  city       text not null,
  keyword    text,               -- null = any post of that type
  post_type  text,               -- null = any type
  is_active  boolean default true,
  created_at timestamptz default now()
);

alter table public.alerts enable row level security;

create policy "users manage own alerts"
  on public.alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists alerts_city_idx on public.alerts(city, is_active);
