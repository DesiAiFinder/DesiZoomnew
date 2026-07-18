-- ── Admin helper: is_admin() ──────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Reports (flag/report content) ─────────────────────────────────────────────
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  reporter_id  uuid references auth.users(id) on delete set null,
  reason       text not null,
  details      text,
  status       text default 'open',   -- open | resolved | dismissed
  created_at   timestamptz default now()
);

alter table public.reports enable row level security;

-- Any signed-in user can report
create policy "users create reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Admins see and manage all reports
create policy "admins read reports"
  on public.reports for select
  using (public.is_admin());

create policy "admins update reports"
  on public.reports for update
  using (public.is_admin());

create index if not exists reports_status_idx on public.reports(status, created_at);

-- ── Admin moderation powers on posts ──────────────────────────────────────────
create policy "admins update any post"
  on public.posts for update
  using (public.is_admin());

create policy "admins delete any post"
  on public.posts for delete
  using (public.is_admin());

-- Admins can read all posts including deactivated ones
create policy "admins read all posts"
  on public.posts for select
  using (public.is_admin());

-- ── Admin revenue access ──────────────────────────────────────────────────────
create policy "admins read all payments"
  on public.payments for select
  using (public.is_admin());
