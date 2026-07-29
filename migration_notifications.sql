-- In-app notifications (refunds, cancellations, and anything else we need to
-- tell a user about). Push is best-effort; this is the reliable record they
-- can always find in their profile.

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  url        text,
  is_read    boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_user_idx
  on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "own notifications read" on public.notifications;
create policy "own notifications read" on public.notifications
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "own notifications update" on public.notifications;
create policy "own notifications update" on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "admins full notifications" on public.notifications;
create policy "admins full notifications" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- Inserts come from edge functions using the service role, which bypasses RLS.
