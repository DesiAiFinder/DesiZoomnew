-- ── Live org data: auto-refresh support ───────────────────────────────────────
alter table public.organizations
  add column if not exists leadership_url text,      -- direct link to their leadership/team page
  add column if not exists last_checked timestamptz, -- when refresh-orgs last ran for this org
  add column if not exists site_ok boolean default true;

-- Schedule the refresh function to run daily at 6am UTC (requires pg_cron + pg_net,
-- enable in Dashboard -> Database -> Extensions). Replace YOUR_PROJECT_REF + anon key.
-- select cron.schedule(
--   'refresh-orgs-daily',
--   '0 6 * * *',
--   $$ select net.http_post(
--        url := 'https://rroyfpheqwalxylgeidu.supabase.co/functions/v1/refresh-orgs',
--        headers := '{"Content-Type": "application/json"}'::jsonb,
--        body := '{}'::jsonb
--      ); $$
-- );
