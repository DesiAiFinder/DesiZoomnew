-- ── Indian Connections: local organizations + leadership ─────────────────────
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  org_type    text default 'cultural',  -- cultural | temple | professional | student | nonprofit | sports | other
  city        text not null,
  description text,
  website     text,
  email       text,
  phone       text,
  address     text,
  logo_url    text,
  leaders     jsonb default '[]',       -- [{ name, role, phone?, email? }]
  is_active   boolean default true,
  created_at  timestamptz default now()
);

alter table public.organizations enable row level security;

create policy "public read active orgs"
  on public.organizations for select
  using (is_active = true or public.is_admin());

create policy "admins manage orgs"
  on public.organizations for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists orgs_city_idx on public.organizations(city);

-- ── Live Streaming (link submissions with admin approval) ─────────────────────
create table if not exists public.live_streams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  city        text not null,
  platform    text default 'youtube',   -- youtube | facebook | instagram | other
  stream_url  text not null,
  status      text default 'pending',   -- pending | approved | rejected | ended
  starts_at   timestamptz,
  created_at  timestamptz default now()
);

alter table public.live_streams enable row level security;

-- Everyone can see approved streams
create policy "public read approved streams"
  on public.live_streams for select
  using (status = 'approved' or auth.uid() = user_id or public.is_admin());

-- Signed-in users can submit
create policy "users submit streams"
  on public.live_streams for insert
  with check (auth.uid() = user_id);

-- Admins approve/reject/end
create policy "admins manage streams"
  on public.live_streams for update
  using (public.is_admin());

create index if not exists streams_status_idx on public.live_streams(status, created_at);

-- ── Sample organizations (edit/remove as needed) ──────────────────────────────
insert into public.organizations (name, org_type, city, description, website, leaders) values
  ('DFW Telugu Association', 'cultural', 'Dallas, TX', 'Cultural events, Ugadi & Deepavali celebrations for the DFW Telugu community.', 'https://tantex.org', '[{"name":"Add Leader Name","role":"President"}]'),
  ('India Association of North Texas', 'cultural', 'Dallas, TX', 'Umbrella organization serving the Indian community of North Texas since 1962.', 'https://iant.org', '[{"name":"Add Leader Name","role":"President"}]')
on conflict do nothing;
