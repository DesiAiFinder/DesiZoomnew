-- The byline on a listing comes from profiles.display_name (surfaced via
-- the public_profiles view — see fetchSellerStats). With no display name
-- set, seeded community listings were showing the admin account's own
-- identity, which reads as a person posting rather than the site.
--
-- "DesiZoom" rather than "Admin": it is what these listings actually are,
-- it matches the "Community listing" note in each description, and it
-- doesn't look like an internal role leaked onto a public page.

update public.profiles
set display_name = 'DesiZoom'
where lower(email) = 'laxqee@gmail.com';

-- Check:
--   select display_name, created_at from public_profiles
--   where id = (select id from auth.users where lower(email)='laxqee@gmail.com');
