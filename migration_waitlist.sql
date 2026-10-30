-- Waitlist / "notify me" capture.
--
-- Why this exists: on launch day 41 people arrived from a WhatsApp post,
-- 7 opened Order Food and 6 opened Deals — and found almost nothing,
-- because the test data was cleared before going live. Each of those is a
-- person who told us exactly what they want and then left with no way for
-- us to reach them when it exists.
--
-- Deliberately NOT tied to auth.users. Asking someone to create an account
-- to be told when a restaurant opens is a worse trade than asking for an
-- email, and the whole point is to capture people who have no reason to
-- sign up yet. They become real accounts later, when there is something
-- worth signing in for.

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  city        text not null,
  -- What they were looking at when they asked: 'restaurants' | 'deals' | 'events'
  topic       text not null,
  -- Set when the person is signed in; null for anonymous visitors.
  user_id     uuid references auth.users(id) on delete set null,
  notified_at timestamptz,
  created_at  timestamptz not null default now()
);

-- One row per person per city per topic. Someone tapping "Notify me" twice
-- should not create a duplicate we would then email twice.
create unique index if not exists waitlist_unique
  on public.waitlist (lower(email), city, topic);

create index if not exists waitlist_pending
  on public.waitlist (topic, city) where notified_at is null;

alter table public.waitlist enable row level security;

-- Anonymous visitors must be able to insert — that is the entire feature.
drop policy if exists waitlist_insert on public.waitlist;
create policy waitlist_insert on public.waitlist
  for insert to anon, authenticated with check (true);

-- Nobody may read it back. An open read policy on a table of email
-- addresses hands the whole list to anyone with the anon key, which is
-- public by design. Admin reads go through the service role in the
-- dashboard or an edge function, never the browser.
drop policy if exists waitlist_select on public.waitlist;

-- Who is waiting, and for what:
--   select topic, city, count(*) from waitlist
--   where notified_at is null group by 1,2 order by 3 desc;
