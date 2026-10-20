-- Stop events overselling.
--
-- THE BUG. create-ticket-session read tickets_sold, compared it to
-- tickets_total, then created a Stripe session. Nothing was reserved in
-- between. Two people buying the last two seats at the same moment both read
-- "9 of 10 sold", both passed the check, and both paid. The webhook then did
-- `select tickets_sold` followed by `update tickets_sold = value + qty`, which
-- is a lost update: run twice concurrently and one increment vanishes, so the
-- count silently under-reports what was actually sold.
--
-- THE FIX. Seats are claimed by a single conditional UPDATE. Postgres locks
-- the row for the duration of that statement, so two concurrent callers are
-- serialised: the first succeeds, the second sees the new value and fails its
-- WHERE clause. No application-level check can give that guarantee.
--
-- Seats are now held from the moment checkout opens, not from payment, and
-- released if the session expires, is refunded, or never completes. That is
-- the only way the person who clicks first is the person who gets the seat.

begin;

-- Reserve seats. Returns true if the seats were claimed, false if they weren't
-- available. tickets_total IS NULL means unlimited.
create or replace function public.reserve_tickets(p_event_id uuid, p_qty int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed int;
begin
  if p_qty is null or p_qty < 1 then
    return false;
  end if;

  update public.posts
     set tickets_sold = coalesce(tickets_sold, 0) + p_qty
   where id = p_event_id
     and is_active = true
     and (tickets_total is null
          or coalesce(tickets_sold, 0) + p_qty <= tickets_total);

  get diagnostics claimed = row_count;
  return claimed = 1;
end;
$$;

-- Give seats back: expired checkout, refund, or a Stripe call that failed
-- after we had already reserved. Never drops below zero.
create or replace function public.release_tickets(p_event_id uuid, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
     set tickets_sold = greatest(0, coalesce(tickets_sold, 0) - greatest(0, coalesce(p_qty, 0)))
   where id = p_event_id;
end;
$$;

-- Only our Edge Functions (service role) may move inventory. A visitor being
-- able to call reserve_tickets directly would be the same hole by another door.
revoke execute on function public.reserve_tickets(uuid, int) from public, anon, authenticated;
revoke execute on function public.release_tickets(uuid, int) from public, anon, authenticated;
grant  execute on function public.reserve_tickets(uuid, int) to service_role;
grant  execute on function public.release_tickets(uuid, int) to service_role;

-- A seat count can never be negative, and never exceed capacity. Belt and
-- braces: if a future code path gets this wrong, the write fails loudly here
-- instead of quietly overselling.
alter table public.posts
  drop constraint if exists posts_tickets_sold_sane;
alter table public.posts
  add constraint posts_tickets_sold_sane
  check (
    tickets_sold is null
    or (tickets_sold >= 0 and (tickets_total is null or tickets_sold <= tickets_total))
  );

commit;

-- Any event already oversold by the old code? Expect zero rows.
select id, title, tickets_sold, tickets_total
  from public.posts
 where tickets_total is not null
   and coalesce(tickets_sold, 0) > tickets_total;
