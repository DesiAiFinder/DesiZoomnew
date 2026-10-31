-- DFW desi events found on Sulekha, November 2026.
--
-- Sulekha is where this community's promoter-run events actually live:
-- the Capricio concert, Kumar Vishwas, the Gujarati Samaj garba. None of
-- them appear on Ticketmaster, which returns zero desi events within 200
-- miles of DFW. Sulekha is the list to check from now on.
--
-- NOT INCLUDED, deliberately: Jubin Nautiyal Live in Concert (Nov 14,
-- Curtis Culwell Center) — Sulekha's page says the organiser cancelled it
-- and refunds are being processed. Listing a cancelled concert would send
-- people to Garland for nothing. This is why nothing publishes unreviewed.
--
-- Ticket prices appear in the description but ticket_price_cents stays
-- null: a value there renders a Buy Tickets button, and these are sold by
-- the promoters on Sulekha, not by us.

with author as (
  select id from auth.users where lower(email) = 'laxqee@gmail.com' limit 1
),
seed(title, description, city, venue, event_date) as (
  values
  (
    'Apne Apne Ram — Kumar Vishwas Live in Dallas',
    'An evening of Hindi poetry with Kumar Vishwas. Doors 6 PM, show 7 PM, about two hours.' || chr(10) || chr(10) ||
    'Presented by Samarthanam USA. Tickets $59 to $299 on Sulekha: https://events.sulekha.com/apne-apne-ram-kumar-vishwas-live-in-dallas_event-in_plano-tx_402296' || chr(10) ||
    'Community listing · info@desizoom.com to claim or correct.',
    'Plano, TX',
    'The Grand Center, 300 Chisholm Pl, Plano, TX 75075',
    timestamptz '2026-11-01 19:00:00 America/Chicago'
  ),
  (
    'Diwali — Journey from Darkness to Light',
    'A Diwali gathering and meditation from 4:30 PM at the Tapasya Dham retreat.' || chr(10) || chr(10) ||
    'Organised by the Brahma Kumaris Meditation Center. Details: https://events.sulekha.com/diwali-journey-from-darkness-to-light_event-in_pilot-point-tx_402534' || chr(10) ||
    'Community listing · info@desizoom.com to claim or correct.',
    'Pilot Point, TX',
    'Tapasya Dham Retreat Place, 14135 Friendship Rd, Pilot Point, TX 76258',
    timestamptz '2026-11-07 16:30:00 America/Chicago'
  )
)
insert into public.posts
  (user_id, type, title, description, city, venue, event_date, ticket_price_cents, is_active)
select a.id, 'event', s.title, s.description, s.city, s.venue, s.event_date, null::integer, true
from seed s cross join author a
where not exists (
  select 1 from public.posts p
  where p.title = s.title and p.event_date = s.event_date
);

-- Capricio: Sulekha lists the venue as Frisco Flyers Event Center and
-- tickets from $27.99, which the flyer did not say.
update public.posts
set venue = 'Frisco Flyers Event Center, 6300 Flyers Way, Frisco, TX 75034',
    description = 'Live music with Band Capricio, doors from 7 PM. Emcees Aarya and Pavitra.' || chr(10) || chr(10) ||
      'Presented by ANLF with Yolo Entertainments and Vinessa Events. Tickets from $27.99 on Sulekha: https://events.sulekha.com/band-capricio-live-in-dallas-halloween-concert-night-2026_event-in_frisco-tx_401676' || chr(10) ||
      'For VIP tables or sponsorship, call (959) 237-9019 or (913) 490-9813.' || chr(10) ||
      'Community listing · info@desizoom.com to claim or correct.'
where title = 'Band Capricio — Halloween Concert Night';

-- select title, city, event_date at time zone 'America/Chicago' as local_time
-- from posts where type='event' and is_active order by event_date;
