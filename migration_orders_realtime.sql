-- ── Live order updates ───────────────────────────────────────────────────────
-- Adds `orders` to the realtime publication so the customer's status tracker
-- and the business's incoming-order bar update without a refresh, the same way
-- Messages already works.
--
-- RLS still applies to realtime: "participants read orders" means a customer
-- only ever receives their own rows, and an owner only their restaurant's.
-- Safe to run more than once.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
    raise notice 'orders added to supabase_realtime';
  else
    raise notice 'orders already in supabase_realtime';
  end if;
end $$;

-- Realtime sends only the changed columns unless the table replicates the full
-- row. We need the whole row (status, totals, customer) on every UPDATE.
alter table public.orders replica identity full;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- select tablename from pg_publication_tables
-- where pubname = 'supabase_realtime' and schemaname = 'public';
