-- ── 1. Photo support ──────────────────────────────────────────────────────────
alter table public.posts
  add column if not exists image_urls text[] default '{}';

-- Storage bucket for post images (public read)
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Anyone can view images
create policy "public read post images"
  on storage.objects for select
  using (bucket_id = 'post-images');

-- Authenticated users can upload to their own folder
create policy "auth users upload post images"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own images
create policy "users delete own post images"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 2. Messaging ──────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references public.posts(id) on delete set null,
  buyer_id    uuid not null references auth.users(id) on delete cascade,
  seller_id   uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (post_id, buyer_id)
);

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references auth.users(id) on delete cascade,
  body             text not null,
  read             boolean default false,
  created_at       timestamptz default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Participants can see their conversations
create policy "participants read conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "buyers create conversations"
  on public.conversations for insert
  with check (auth.uid() = buyer_id);

-- Participants can read messages in their conversations
create policy "participants read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "participants send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "participants mark read"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);
create index if not exists conversations_buyer_idx on public.conversations(buyer_id);
create index if not exists conversations_seller_idx on public.conversations(seller_id);

-- ── Push notification subscriptions ──────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text unique not null,
  subscription jsonb not null,
  created_at   timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "users manage own subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists push_subs_user_idx on public.push_subscriptions(user_id);

-- ── 3. Seller trust signals ───────────────────────────────────────────────────
-- (profiles already has created_at; sales count derived from payments table)
-- View for seller stats
create or replace view public.seller_stats as
select
  seller_id,
  count(*) filter (where status = 'completed') as completed_sales
from public.payments
group by seller_id;
