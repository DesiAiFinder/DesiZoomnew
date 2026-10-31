# DesiZoom runbook

What DesiZoom depends on, who owns it, and what breaks if it lapses.

**No secrets in this file, ever.** Keys, passwords and tokens belong in a
password manager. This file records *where* things live and *who* can get
at them, which is the part that is genuinely hard to reconstruct later.

Last reviewed: 2026-10-30

---

## The one-minute version

The live site is built by Vercel from the GitHub repo. All application
state — users, listings, orders, payments — is in Supabase. Money moves
through Stripe. The domain is registered at Network Solutions with DNS
hosted at Vercel, and email is Microsoft 365 through GoDaddy.

Losing the laptop costs nothing. Losing the **Supabase** account costs
everything, because it is the only place the data exists apart from the
dumps in `backups/`.

---

## Services

| Service | What it does | Account / owner | Breaks if lost |
|---|---|---|---|
| GitHub — `DesiAiFinder/DesiZoomnew` | Source of truth for all code | _fill in_ | Site keeps running; no further changes possible |
| Vercel — project `desizoomnew` | Builds and serves the site, hosts DNS | _fill in_ | Site goes down |
| Supabase — project `rroyfpheqwalxylgeidu` | Database, auth, storage, edge functions | _fill in_ | **Total loss of all data** |
| Stripe | Payments, Connect payouts, refunds | _fill in_ | No orders or ticket sales; payouts stall |
| Network Solutions | Domain registration for desizoom.com | _fill in_ | Domain lapses, everything stops |
| GoDaddy / Microsoft 365 | info@ and shreyan@desizoom.com | _fill in_ | Mail to the addresses on every flyer bounces |
| Google Cloud | Maps / Places API key | _fill in_ | City detection and nearby search degrade |
| Ticketmaster, TMDB, OpenWeather | Auto-populated events, films, weather | _fill in_ | Those sections go quiet; nothing else affected |

Fill in the owning account for each, and whether a second person has
recovery access. A service reachable by exactly one email address on one
phone is the actual risk here — not the code.

### Renewals to diary

| What | Renews | Notes |
|---|---|---|
| desizoom.com registration | _fill in_ | Network Solutions. The one that takes everything down. |
| Microsoft 365 mailboxes | _fill in_ | GoDaddy |

---

## Where the data lives, and what backs it up

| Data | Lives in | Backed up by | Covered? |
|---|---|---|---|
| Application code, migrations, edge functions | Git | GitHub remote | Yes |
| Posters, outreach lists, WhatsApp message | Git (`marketing/`) | GitHub remote | Yes |
| Users, listings, orders, payments, waitlist | Supabase Postgres | `backup.cmd` → `backups/` | **Only as recent as the last run** |
| Uploaded images: flyers, logos, menu photos | Supabase Storage | nothing | **No** |
| API keys, Stripe secrets, DB password | Vercel + Supabase env | password manager | _verify_ |

Two known gaps, both deliberate rather than overlooked:

**Supabase Storage is not in the database dump.** `pg_dump` captures the
rows that reference images, not the images. Restoring a dump alone gives
you listings whose photos all 404. While the bucket is small, downloading
it occasionally from the Supabase dashboard is enough.

**Free-tier Supabase has no point-in-time recovery.** Check what your plan
actually includes under Project Settings → Database. If it includes
nothing, `backups/` is the only copy that exists anywhere.

---

## Routine

**Before any migration, and monthly otherwise:**

```
backup.cmd
```

Writes `backups/desizoom-<timestamp>.sql`. The script refuses to call
anything under 10KB a backup — `pg_dump` can exit 0 having written
nothing, and a cheerful "Done" over an empty file is worse than a visible
failure.

Then copy it off this machine. A backup on the same disk as the original
is not a backup.

`backups/` is gitignored on purpose: the dumps contain real customer data
and must never reach GitHub.

**One-time setup on a new machine:**

```
setx DZ_DB_PASS "the database password"
```

Then open a new terminal. Needs `pg_dump` on PATH
(`C:\Program Files\PostgreSQL\17\bin`).

---

## Rebuilding from scratch

If the laptop is gone and you are starting on a new machine:

1. `git clone https://github.com/DesiAiFinder/DesiZoomnew.git`
2. `npm install`
3. Create `.env.local` with the `VITE_*` keys — the names are in
   `src/config/env.ts`, the values come from Vercel → Settings →
   Environment Variables, or from your password manager.
4. `npm run dev`

Vercel redeploys from GitHub on its own; nothing on your machine is in
that path. Supabase and Stripe are untouched by any of this — the site
would have kept serving the whole time.

---

## Things that will bite

**Edge function secrets are separate from Vercel's.** Supabase functions
read their own secrets (`npx supabase secrets set`). Setting a key in
Vercel does not give it to `create-order-session`.

**A CLI redeploy can silently re-enable `verify_jwt`.** `supabase/config.toml`
pins `verify_jwt = false` for `stripe-webhook`. Without it the webhook
starts rejecting Stripe and orders stop being marked paid — with no error
anywhere you would normally look.

**Stripe test and live are entirely separate.** Keys, webhooks and
connected accounts all exist twice. A webhook configured in test mode
receives nothing from live traffic.

**Google OAuth must stay "In production".** In "Testing" status, sign-in
silently fails for everyone who is not on the test-user list.
