-- ============================================================
-- DesiZoom — Supabase Schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  display_name text,
  city        text default 'Edison, NJ',
  role        text default 'user' check (role in ('user','admin','service_provider')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Posts ─────────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  type         text not null check (type in ('deal','marketplace','roommate','event')),
  title        text not null,
  description  text,
  city         text not null,
  price        text,
  discount     text,
  category     text,
  votes_count  integer default 0 not null,
  details      jsonb default '{}'::jsonb,
  event_date   timestamptz,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Votes ─────────────────────────────────────────────────────────────────────
create table if not exists public.votes (
  id       uuid primary key default uuid_generate_v4(),
  post_id  uuid references public.posts(id) on delete cascade not null,
  user_id  uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

-- Keep votes_count in sync
create or replace function public.update_votes_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set votes_count = votes_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set votes_count = greatest(0, votes_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_vote_change on public.votes;
create trigger on_vote_change
  after insert or delete on public.votes
  for each row execute procedure public.update_votes_count();

-- ── Comments ──────────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid references public.posts(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  body       text not null,
  created_at timestamptz default now()
);

-- ── Local Info ────────────────────────────────────────────────────────────────
create table if not exists public.local_info (
  id          uuid primary key default uuid_generate_v4(),
  type        text not null check (type in ('utility','emergency','government','trash_recycling','city_info')),
  -- 'City, ST', matching profiles/posts. NULL means the row shows everywhere
  -- (911, national hotlines). The code always filtered on this; the column was
  -- missing in production until migration_local_info_city.sql.
  city        text,
  name        text not null,
  description text,
  phone       text,
  website     text,
  address     text,
  subtype     text,
  notes       text,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── RLS Policies ──────────────────────────────────────────────────────────────

-- profiles
alter table public.profiles enable row level security;
create policy "Public read profiles"  on public.profiles for select using (true);
create policy "Own profile update"    on public.profiles for update using (auth.uid() = id);

-- posts
alter table public.posts enable row level security;
create policy "Public read posts"  on public.posts for select using (is_active = true);
create policy "Auth insert posts"  on public.posts for insert with check (auth.uid() = user_id);
create policy "Own post update"    on public.posts for update using (auth.uid() = user_id);
create policy "Own post delete"    on public.posts for delete using (auth.uid() = user_id);

-- votes
alter table public.votes enable row level security;
create policy "Public read votes"   on public.votes for select using (true);
create policy "Auth insert votes"   on public.votes for insert with check (auth.uid() = user_id);
create policy "Own vote delete"     on public.votes for delete using (auth.uid() = user_id);

-- comments
alter table public.comments enable row level security;
create policy "Public read comments"  on public.comments for select using (true);
create policy "Auth insert comments"  on public.comments for insert with check (auth.uid() = user_id);
create policy "Own comment delete"    on public.comments for delete using (auth.uid() = user_id);

-- local_info (read-only for public, admin manages via dashboard)
alter table public.local_info enable row level security;
create policy "Public read local_info" on public.local_info for select using (is_active = true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_posts_city      on public.posts(city);
create index if not exists idx_posts_type      on public.posts(type);
create index if not exists idx_posts_votes     on public.posts(votes_count desc);
create index if not exists idx_posts_created   on public.posts(created_at desc);
create index if not exists idx_comments_post   on public.comments(post_id);
create index if not exists idx_votes_post      on public.votes(post_id);

-- ── Sample Data (Edison, NJ) ──────────────────────────────────────────────────
-- Uncomment to seed sample posts:
/*
insert into public.local_info (type, name, description, phone, website) values
  ('utility',   'PSE&G',              'Electric & gas utility',                    '1-800-436-7734', 'https://www.pseg.com'),
  ('utility',   'American Water',     'Water utility for Edison, NJ',              '1-800-652-6987', 'https://amwater.com'),
  ('emergency', 'Edison Police (Non-Emergency)', 'For non-emergency police calls', '732-287-0600',   null),
  ('emergency', '911',                'Emergency services',                        '911',             null),
  ('government','Edison Township',    'Main city government website',              '732-287-0900',   'https://www.edisontwp.org'),
  ('trash_recycling','Trash Day',     'Weekly trash pickup — check your zone',     null,             'https://www.edis