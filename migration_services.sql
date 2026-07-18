-- ── Service Leads (Sulekha-style monetization) ────────────────────────────────

-- Providers: businesses/individuals offering services
create table if not exists public.service_providers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade unique,
  business_name text not null,
  categories    text[] default '{}',   -- e.g. {Catering, Priest Services}
  city          text not null,
  phone         text,
  email         text,
  website       text,
  description   text,
  is_approved   boolean default true,  -- flip to false if you want manual vetting
  created_at    timestamptz default now()
);

-- Requests: "I need a priest for a housewarming on Aug 2"
create table if not exists public.service_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  city          text not null,
  category      text not null,
  title         text not null,
  description   text,
  budget        text,
  contact_phone text,                  -- revealed only to unlocked providers
  contact_email text,
  status        text default 'open',   -- open | fulfilled | closed
  created_at    timestamptz default now()
);

-- Unlocks: provider paid to see a request's contact details
create table if not exists public.lead_unlocks (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.service_requests(id) on delete cascade,
  provider_id  uuid not null references auth.users(id) on delete cascade,
  amount_cents integer default 1000,
  stripe_session_id text,
  created_at   timestamptz default now(),
  unique (request_id, provider_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.service_providers enable row level security;
alter table public.service_requests  enable row level security;
alter table public.lead_unlocks      enable row level security;

-- Providers: public read (approved), owner manages own
create policy "public read approved providers"
  on public.service_providers for select
  using (is_approved = true or auth.uid() = user_id or public.is_admin());
create policy "users register as provider"
  on public.service_providers for insert
  with check (auth.uid() = user_id);
create policy "providers update own profile"
  on public.service_providers for update
  using (auth.uid() = user_id or public.is_admin());

-- Requests: everyone signed-in can read (contact fields are stripped client-side;
-- unlocked contact is fetched via the secure function below)
create policy "read open requests"
  on public.service_requests for select
  using (true);
create policy "users create requests"
  on public.service_requests for insert
  with check (auth.uid() = user_id);
create policy "owners update requests"
  on public.service_requests for update
  using (auth.uid() = user_id or public.is_admin());

-- Unlocks: provider sees own unlocks; inserts happen via service role (webhook)
create policy "providers see own unlocks"
  on public.lead_unlocks for select
  using (auth.uid() = provider_id or public.is_admin());

-- ── Secure contact reveal ─────────────────────────────────────────────────────
-- Returns contact details ONLY if the caller owns the request or has paid to unlock it.
create or replace function public.get_request_contact(req_id uuid)
returns table (contact_phone text, contact_email text, requester_name text)
language sql
security definer
stable
as $$
  select r.contact_phone, r.contact_email,
         coalesce(p.display_name, 'DesiZoom member') as requester_name
  from public.service_requests r
  left join public.profiles p on p.id = r.user_id
  where r.id = req_id
    and (
      r.user_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.lead_unlocks u
        where u.request_id = req_id and u.provider_id = auth.uid()
      )
    );
$$;

create index if not exists requests_city_status_idx on public.service_requests(city, status, created_at);
create index if not exists providers_city_idx on public.service_providers(city);
