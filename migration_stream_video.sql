-- ── Uploaded video support for streams ────────────────────────────────────────
alter table public.live_streams
  add column if not exists source text default 'link';   -- link | upload

-- Storage bucket for uploaded videos (public read)
insert into storage.buckets (id, name, public, file_size_limit)
values ('stream-videos', 'stream-videos', true, 524288000)   -- 500 MB cap
on conflict (id) do update set file_size_limit = 524288000, public = true;

create policy "public read stream videos"
  on storage.objects for select
  using (bucket_id = 'stream-videos');

create policy "auth users upload stream videos"
  on storage.objects for insert
  with check (
    bucket_id = 'stream-videos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own stream videos"
  on storage.objects for delete
  using (
    bucket_id = 'stream-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
