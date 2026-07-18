-- ── VOD support: ended streams remain publicly viewable as recordings ─────────
alter table public.live_streams
  add column if not exists ended_at timestamptz;

-- Replace the public read policy so ended streams (VODs) are also visible
drop policy if exists "public read approved streams" on public.live_streams;

create policy "public read approved and ended streams"
  on public.live_streams for select
  using (
    status in ('approved', 'ended')
    or auth.uid() = user_id
    or public.is_admin()
  );
