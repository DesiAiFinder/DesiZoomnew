# DesiZoom — Go-Live Rollout Plan

Work top to bottom. Each phase depends on the ones above it. Boxes are yours to check off.

---

## Phase 0 — Accounts & keys to gather first

You'll need these before anything else works. Collect them into a password manager.

- [ ] **Supabase** project (already have) → Project URL + `anon` key + `service_role` key
- [ ] **Stripe** account, switched to **Live mode** → live secret key (`sk_live_…`) + publishable key (`pk_live_…`)
- [ ] **Google Cloud** → enable **Places API** *and* **Geocoding API**, turn on billing, create an API key (restrict to your domain)
- [ ] **OpenWeather** API key (free tier is fine)
- [ ] **Ticketmaster** Discovery API key (only if you want national event listings)
- [ ] **VAPID** keys for web push (generate in Phase 5)
- [ ] **Domain** (e.g. desizoom.com) + **Vercel** project connected to your GitHub repo

---

## Phase 1 — Database (Supabase → SQL Editor)

Run each file's contents in the SQL Editor, **in this order**. Most are idempotent, but order matters because later ones reference earlier tables.

1. [ ] `supabase/schema.sql` (base tables — only if this is a fresh project)
2. [ ] `migration_photos_messaging.sql`
3. [ ] `migration_admin.sql`
4. [ ] `migration_boost.sql`
5. [ ] `migration_services.sql`
6. [ ] `migration_service_bookings.sql`
7. [ ] `migration_reviews.sql`
8. [ ] `migration_favorites_alerts.sql`
9. [ ] `migration_tickets.sql`
10. [ ] `migration_food_ordering.sql`
11. [ ] `migration_news.sql`
12. [ ] `migration_connections_live.sql`
13. [ ] `migration_stream_categories.sql`
14. [ ] `migration_stream_video.sql`
15. [ ] `migration_vod.sql`
16. [ ] `migration_org_refresh.sql`
17. [ ] `migration_stripe.sql` (creates the `payments` table — it's in your outputs folder)
18. [ ] `seed_organizations.sql` (seed the Desi Organizations list)

- [ ] Make yourself an admin: `update public.profiles set role = 'admin' where id = '<your-user-id>';`
- [ ] **Do NOT run `cleanup_before_launch.sql` yet** — that's the very last step (Phase 8).

---

## Phase 2 — Edge functions (Supabase CLI)

### 2a. Set the function secrets (once)

```
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx        # from Phase 3
supabase secrets set VAPID_PUBLIC_KEY=xxx                    # from Phase 5
supabase secrets set VAPID_PRIVATE_KEY=xxx                   # from Phase 5
supabase secrets set VAPID_SUBJECT=mailto:info@desizoom.com
```
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't set them.)

### 2b. Deploy every function

```
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy fetch-news --no-verify-jwt
supabase functions deploy refresh-orgs --no-verify-jwt
supabase functions deploy create-checkout-session
supabase functions deploy create-order-session
supabase functions deploy create-booking-session
supabase functions deploy create-ticket-session
supabase functions deploy create-lead-session
supabase functions deploy create-boost-session
supabase functions deploy create-connect-account
supabase functions deploy notify-alerts
supabase functions deploy notify-providers
supabase functions deploy send-push
```

- [ ] `stripe-webhook`, `fetch-news`, `refresh-orgs` use `--no-verify-jwt` (called by Stripe / cron, not a logged-in user)
- [ ] The `create-*-session` functions keep JWT verification (called from the app by a signed-in user)

### 2c. Schedule the recurring ones (Supabase → Database → Cron, or pg_cron)

- [ ] `fetch-news` — every few hours (refreshes the news strip)
- [ ] `refresh-orgs` — daily (refreshes organization info)

---

## Phase 3 — Stripe (live)

- [ ] Toggle the dashboard to **Live mode** and copy the live keys
- [ ] **Enable Connect** → Express accounts (this is how sellers/restaurants/providers connect their bank)
- [ ] Set your platform **branding** (name, logo, support email/phone) — Connect requires it
- [ ] Create a **webhook endpoint**:
  - URL: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
  - Events: `checkout.session.completed` (at minimum)
  - Copy the **Signing secret** (`whsec_…`) → that's your `STRIPE_WEBHOOK_SECRET` in Phase 2a
- [ ] Fill in your **business profile / payout details** so Stripe can actually move money
- [ ] Confirm currency is correct (USD) and commission logic matches: marketplace 8%, bookings 8%, tickets 5%, food 6%, boosts $2.99, lead unlock $10

---

## Phase 4 — Frontend env vars (Vercel → Project → Settings → Environment Variables)

Set these, then redeploy. They must match your `.env.local`.

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_GOOGLE_PLACES_API_KEY`
- [ ] `VITE_OPENWEATHER_API_KEY`
- [ ] `VITE_TICKETMASTER_API_KEY`
- [ ] `VITE_VAPID_PUBLIC_KEY` (from Phase 5)
- [ ] `VITE_ADMIN_PASSWORD` (your admin gate)
- [ ] Point your custom **domain** at the Vercel project + confirm HTTPS
- [ ] Trigger a fresh deploy after setting vars

---

## Phase 5 — Web push (VAPID)

- [ ] Generate a key pair: `npx web-push generate-vapid-keys`
- [ ] Public key → `VAPID_PUBLIC_KEY` (secret) **and** `VITE_VAPID_PUBLIC_KEY` (frontend) — same value
- [ ] Private key → `VAPID_PRIVATE_KEY` (secret only)
- [ ] `VAPID_SUBJECT` → `mailto:info@desizoom.com`
- [ ] Test: enable alerts in a profile, trigger one, confirm the browser notification arrives

---

## Phase 6 — Seed real content (so it doesn't look empty)

Density beats features. Before inviting anyone:

- [ ] Add a handful of real **restaurants** with menus (or onboard 1–2 owners you know)
- [ ] Post 5–10 real **deals** from local desi businesses
- [ ] Add 2–3 upcoming **events**
- [ ] Confirm the seeded **Organizations** show up in Local Info
- [ ] Verify the **news strip** and **radio** are playing

---

## Phase 7 — Test every money flow IN LIVE MODE

Do one real, small transaction per flow, then refund it. After each, check the `payments` table got a row and the status flipped `pending → paid`.

- [ ] Marketplace sale (8%)
- [ ] Service booking (8%)
- [ ] Event ticket (5%) — confirm QR code appears in profile
- [ ] Food order (6%) — confirm it shows in customer profile *and* the restaurant dashboard
- [ ] Boost a listing ($2.99)
- [ ] Lead unlock ($10)
- [ ] Confirm a seller's Stripe Connect onboarding completes and they can receive a payout

---

## Phase 8 — Final cleanup & launch

- [ ] Run **`cleanup_before_launch.sql`** to wipe test content (keeps accounts, orgs, news; backs up to `*_backup` tables first)
- [ ] Delete throwaway test accounts in Supabase → Authentication → Users (keep your admin)
- [ ] Final smoke test on the live domain (sign up, browse, one purchase)
- [ ] Announce to your first ~20 Little Elm / DFW users
- [ ] After a few days of confidence, drop the `*_backup` tables (snippet at the bottom of the cleanup script)

---

## Still optional / later

- [ ] Terms of Use + Privacy Policy pages (nice for trust; Stripe likes having them)
- [ ] Strip "US/America" wording if you ever expand beyond the US
- [ ] Locale flexibility (currency, km vs miles, dynamic city list) — only when expanding abroad
