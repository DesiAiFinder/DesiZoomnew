-- ── Seed: DFW-area Indian community organizations ─────────────────────────────
-- Leadership entries are placeholders — update with current officers' names
-- and contact details (from each org's website) via the Supabase table editor:
--   update organizations set leaders = '[{"name":"...","role":"President","phone":"...","email":"..."}]' where name = '...';

-- Remove earlier sample rows
delete from public.organizations where leaders::text like '%Add Leader Name%';

insert into public.organizations (name, org_type, city, description, website, leaders) values
  ('DATA — Dallas Area Telugu Association', 'cultural', 'Dallas, TX',
   'One of the largest Telugu associations in North Texas — cultural programs, Ugadi and Deepavali events, community services.',
   'https://www.dallasata.org', '[{"name":"","role":"President"}]'),

  ('TANTEX — Telugu Association of North Texas', 'cultural', 'Dallas, TX',
   'Serving the North Texas Telugu community since 1986 — literary, cultural and charitable programs.',
   'https://www.tantex.org', '[{"name":"","role":"President"}]'),

  ('IANT — India Association of North Texas', 'cultural', 'Dallas, TX',
   'Umbrella organization for the Indian community of North Texas since 1962 — Anand Bazaar, Republic Day and India Nite events.',
   'https://www.iant.org', '[{"name":"","role":"President"}]'),

  ('DFW Hindu Temple — Ekta Mandir', 'temple', 'Irving, TX',
   'One of the largest Hindu temples in the DFW metroplex — daily poojas, festivals and community programs.',
   'https://www.dfwhindutemple.org', '[{"name":"","role":"Chairman"}]'),

  ('Metroplex Tamil Sangam', 'cultural', 'Dallas, TX',
   'Tamil cultural association of DFW — Pongal celebrations, Tamil school and literary events.',
   'https://www.metroplextamilsangam.org', '[{"name":"","role":"President"}]'),

  ('MAD — Malayalee Association of Dallas', 'cultural', 'Dallas, TX',
   'Kerala community of DFW — Onam, Vishu celebrations and community support programs.',
   'https://www.maddallas.org', '[{"name":"","role":"President"}]'),

  ('Gujarati Samaj of Dallas Fort Worth', 'cultural', 'Dallas, TX',
   'Gujarati community organization — Navratri garba, cultural events and youth programs.',
   'https://www.gsdfw.org', '[{"name":"","role":"President"}]'),

  ('DFW Maharashtra Mandal', 'cultural', 'Dallas, TX',
   'Marathi community of DFW — Ganesh Utsav, Diwali programs and Marathi school.',
   'https://www.dfwmm.org', '[{"name":"","role":"President"}]'),

  ('Bangladesh Association of North Texas', 'cultural', 'Dallas, TX',
   'Bengali community programs, Pohela Boishakh and cultural events across the metroplex.',
   null, '[{"name":"","role":"President"}]'),

  ('DFW Sikh Gurdwara — Garland', 'temple', 'Garland, TX',
   'Sikh place of worship serving the DFW metroplex — langar, Punjabi school and community services.',
   null, '[{"name":"","role":"President"}]')
on conflict do nothing;
