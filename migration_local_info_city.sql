-- Give local_info a city, because the code has always assumed it had one.
--
-- fetchLocalInfo() runs `.eq('city', city)` against this table, but the column
-- was never created. PostgREST returns 400, the client does `const { data }`
-- without checking `error`, and the page renders "No curated entries yet" —
-- an empty state that looks like a content gap rather than the failure it is.
-- Same shape of bug as the geocoding one: a swallowed error, silently wrong.
--
-- NULL city means "everywhere". 911 is not an Edison fact, and neither is a
-- national utility hotline. Rows with a city show only in that city.

begin;

alter table public.local_info
  add column if not exists city text;

comment on column public.local_info.city is
  'City as "City, ST", matching profiles/posts. NULL = show in every city.';

-- The six seeded rows are genuinely Edison, New Jersey — real numbers, real
-- websites, wrong place for anyone else. Scope them so they stop being served
-- to the whole country the moment the query starts working.
update public.local_info
   set city = 'Edison, NJ'
 where city is null;

-- 911 is the exception: true everywhere.
update public.local_info
   set city = null
 where name = '911';

create index if not exists idx_local_info_city on public.local_info(city);

commit;

-- Confirm: every row should have a city, except 911.
select coalesce(city, '(everywhere)') as city, type, name
  from public.local_info
 order by city nulls first, type, name;
