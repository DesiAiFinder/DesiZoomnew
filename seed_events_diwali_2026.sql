-- Seeded Diwali 2026 events for DFW.
--
-- Source sheet: marketing/events-to-seed.csv (only the HIGH-confidence rows).
-- Every entry is factual detail — name, date, time, venue, entry cost —
-- written in our own words, with the organiser credited and a link back to
-- their own page. No descriptions or flyer images are copied.
--
-- Posted ONCE each, with the venue's real city. Events reach at least 50
-- miles (DEFAULT_RADIUS = 50, clamped 50-100 in eventRadiusFor), and the
-- /events page also lists everything else in the state grouped by city, so
-- all of DFW sees these from one row. Duplicating a listing per city to
-- force reach is what makes a site look like spam.
--
-- TIMES ARE WRITTEN WITH AN EXPLICIT ZONE. A bare '2026-11-07 17:00' goes
-- into timestamptz as UTC and displays six hours early — that is exactly
-- the bug that put the DTABS mela at 10 AM.
--
-- Re-runnable: skips any event already present with the same title and date.

with author as (
  -- Seeded listings are owned by the admin account. If this returns no row
  -- the insert is a no-op rather than a constraint error, so check the
  -- address matches the account you actually use.
  select id from auth.users where lower(email) = 'laxqee@gmail.com' limit 1
),
seed(title, description, city, venue, event_date, ticket_price_cents) as (
  values
  (
    'Frisco Diwali Mela 2026 — Festival of Lights',
    'Free Diwali mela with Raam Leela, a live concert, a drone and laser show, a Diwali bazaar and food stalls. Runs 3:30 PM to 10 PM. Entry and parking are free.' || chr(10) || chr(10) ||
    'Organised by DFW Gujarati Samaj. Details and updates: https://friscodiwali.org/' || chr(10) ||
    'Community listing — not posted by the organiser. Is this your event? Email info@desizoom.com to claim or correct it.',
    'Frisco, TX',
    'Kaleidoscope Park, 6635 Warren Pkwy, Frisco, TX 75034',
    timestamptz '2026-11-01 15:30:00 America/Chicago',
    -- Cast needed: every row in this column is null, so Postgres infers
    -- text for the whole VALUES column and the insert fails on type.
    -- Typing the first row types the column.
    null::integer
  ),
  (
    'Diwali Mahotsav — Govatsa Dwadashi',
    'Day one of a six-day Diwali Mahotsav. Govatsa Dwadashi pooja at 6 PM, kids'' sparklers, and fireworks over the temple at 8 PM. Free and open to all.' || chr(10) || chr(10) ||
    'Organised by Radha Krishna Temple of Dallas. Full schedule: https://www.radhakrishnatemple.net/diwali-mela-dallas' || chr(10) ||
    'Community listing — not posted by the organiser. Is this your event? Email info@desizoom.com to claim or correct it.',
    'Allen, TX',
    'Radha Krishna Temple of Dallas, 1450 N Watters Rd, Allen, TX 75013',
    timestamptz '2026-11-05 18:00:00 America/Chicago',
    null
  ),
  (
    'Diwali Mela and Dhanteras Pooja',
    'Day two. Diwali Mela from 6 PM with food and vendor stalls, Dhanteras and Shri Yantra pooja at 6 PM, and fireworks at 8 PM. Free and open to all.' || chr(10) || chr(10) ||
    'Organised by Radha Krishna Temple of Dallas. Full schedule: https://www.radhakrishnatemple.net/diwali-mela-dallas' || chr(10) ||
    'Community listing — not posted by the organiser. Is this your event? Email info@desizoom.com to claim or correct it.',
    'Allen, TX',
    'Radha Krishna Temple of Dallas, 1450 N Watters Rd, Allen, TX 75013',
    timestamptz '2026-11-06 18:00:00 America/Chicago',
    null
  ),
  (
    'Diwali Bhajan Clubbing Concert',
    'An evening of bhajans and kirtan, singing together. Tickets are $5, up to ten per order, sold by the temple.' || chr(10) || chr(10) ||
    'Organised by Radha Krishna Temple of Dallas. Tickets: https://www.radhakrishnatemple.net/tickets?event=bhajan-clubbing' || chr(10) ||
    'Community listing — not posted by the organiser. Tickets are sold on the temple''s own site, not through DesiZoom. Is this your event? Email info@desizoom.com to claim or correct it.',
    'Allen, TX',
    'Radha Krishna Temple of Dallas, 1450 N Watters Rd, Allen, TX 75013',
    timestamptz '2026-11-06 18:30:00 America/Chicago',
    -- Deliberately null, not 500. A price here would render a Buy Tickets
    -- button, and we are not selling these — the temple is.
    null
  ),
  (
    '11,111 Diya Lighting and Diwali Leela',
    'Choti Diwali. The Diwali Leela on stage at 5 PM, the lighting of 11,111 diyas in the courtyard from 6 PM, and the Grand Fireworks Show. Free and open to all.' || chr(10) || chr(10) ||
    'Organised by Radha Krishna Temple of Dallas. Full schedule: https://www.radhakrishnatemple.net/diwali-mela-dallas' || chr(10) ||
    'Community listing — not posted by the organiser. Is this your event? Email info@desizoom.com to claim or correct it.',
    'Allen, TX',
    'Radha Krishna Temple of Dallas, 1450 N Watters Rd, Allen, TX 75013',
    timestamptz '2026-11-07 17:00:00 America/Chicago',
    null
  ),
  (
    'Diwali Day — Lakshmi Pooja and Grand Fireworks',
    'Diwali itself. Special satsang with Swami Mukundananda at 10:30 AM, Dhanalakshmi and Mahalakshmi pooja at 5 PM, diya lighting at 7:30 PM, and the Grand Fireworks Show. Free and open to all.' || chr(10) || chr(10) ||
    'Organised by Radha Krishna Temple of Dallas. Full schedule: https://www.radhakrishnatemple.net/diwali-mela-dallas' || chr(10) ||
    'Community listing — not posted by the organiser. Is this your event? Email info@desizoom.com to claim or correct it.',
    'Allen, TX',
    'Radha Krishna Temple of Dallas, 1450 N Watters Rd, Allen, TX 75013',
    timestamptz '2026-11-08 17:00:00 America/Chicago',
    null
  ),
  (
    'Govardhan Pooja and Annakoot',
    'Govardhan Pooja and Annakoot at 6 PM, a mountain of food offered and then shared as mahaprasad. Gujarati New Year archana at 11 AM the same day. Free and open to all.' || chr(10) || chr(10) ||
    'Organised by Radha Krishna Temple of Dallas. Full schedule: https://www.radhakrishnatemple.net/diwali-mela-dallas' || chr(10) ||
    'Community listing — not posted by the organiser. Is this your event? Email info@desizoom.com to claim or correct it.',
    'Allen, TX',
    'Radha Krishna Temple of Dallas, 1450 N Watters Rd, Allen, TX 75013',
    timestamptz '2026-11-09 18:00:00 America/Chicago',
    null
  )
)
insert into public.posts
  (user_id, type, title, description, city, venue, event_date, ticket_price_cents, is_active)
select a.id, 'event', s.title, s.description, s.city, s.venue, s.event_date, s.ticket_price_cents, true
from seed s cross join author a
where not exists (
  select 1 from public.posts p
  where p.title = s.title and p.event_date = s.event_date
);

-- Check what went in, in local time:
--   select title, city, venue,
--          event_date at time zone 'America/Chicago' as local_time
--   from posts where type = 'event' and is_active
--   order by event_date;
