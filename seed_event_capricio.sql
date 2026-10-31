-- Band Capricio — Halloween Concert Night, Frisco, tonight.
--
-- Came to us as a flyer forwarded in WhatsApp, which is the point: no API
-- carries this. A private promoter renting a club, selling VIP tables over
-- two phone numbers, promoted through Radio Sangam and Telugu media.
-- Ticketmaster has never heard of it and never will.
--
-- Facts only, from the flyer. No image copied, no entry price claimed —
-- the flyer gives phone numbers for VIP tables but no general ticket price,
-- so we say what we know and point people at the organisers.

with author as (
  select id from auth.users where lower(email) = 'laxqee@gmail.com' limit 1
)
insert into public.posts
  (user_id, type, title, description, city, venue, event_date, ticket_price_cents, is_active)
select
  a.id,
  'event',
  'Band Capricio — Halloween Concert Night',
  'Live music with Band Capricio, doors from 7 PM. Emcees Aarya and Pavitra.' || chr(10) || chr(10) ||
  'Presented by ANLF with Yolo Entertainments and Vinessa Events. For entry, VIP tables or sponsorship, call (959) 237-9019 or (913) 490-9813.' || chr(10) ||
  'Community listing · info@desizoom.com to claim or correct.',
  'Frisco, TX',
  'Frisco Flyers Club, 6300 Flyers Way, Frisco, TX 75034',
  timestamptz '2026-10-31 19:00:00 America/Chicago',
  null::integer,
  true
from author a
where not exists (
  select 1 from public.posts p
  where p.title = 'Band Capricio — Halloween Concert Night'
);

-- select title, city, venue, event_date at time zone 'America/Chicago'
-- from posts where type='event' and is_active order by event_date;
