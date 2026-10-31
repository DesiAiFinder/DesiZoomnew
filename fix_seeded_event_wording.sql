-- Tidy-up for the already-seeded Diwali listings.
--
-- Two changes:
--   1. The DTABS mela is filed under Dallas but the venue is in Frisco.
--      The near-you split and the "Elsewhere in TX" grouping both key off
--      `city`, so it was being sorted away from the people closest to it.
--   2. The claim notice was written for a listing page and reads as a
--      paragraph on a card. Shortened, same meaning.
--
-- seed_events_diwali_2026.sql carries the new wording too, so a re-run
-- stays consistent with what is already live.

update public.posts
set city = 'Frisco, TX'
where type = 'event' and title ilike '%dtabs%';

update public.posts
set description = replace(
      replace(
        description,
        'Community listing — not posted by the organiser. Tickets are sold on the temple''s own site, not through DesiZoom. Is this your event? Email info@desizoom.com to claim or correct it.',
        'Community listing · tickets are sold by the temple, not through DesiZoom · info@desizoom.com to claim or correct.'
      ),
      'Community listing — not posted by the organiser. Is this your event? Email info@desizoom.com to claim or correct it.',
      'Community listing · info@desizoom.com to claim or correct.'
    )
where type = 'event'
  and description like '%Community listing — not posted by the organiser%';

-- Check:
--   select title, city,
--          event_date at time zone 'America/Chicago' as local_time,
--          right(description, 120) as tail
--   from posts where type = 'event' and is_active order by event_date;
