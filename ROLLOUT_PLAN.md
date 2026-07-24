# DesiZoom — Rollout Plan (updated)

Work top to bottom. `[x]` = already done. Project ref: `rroyfpheqwalxylgeidu`.

---

## Phase 1 — Code push (frontend)

One push covers everything built recently: pill-nav header + single search, hero greeting
+ "Your city today" cards, radius search (50 mi default), pickup distance warnings,
English nav labels, copy cleanup + new footer, admin revenue-by-stream +
Restaurants/Orders/Orgs tabs, admin full delete, owner "Remove listing" button.

- [ ] `git add -A && git commit -m "Launch batch" && git push`
- [ ] Confirm Vercel build goes green and desizoomnew.vercel.app shows the new header

---

## Phase 2 — Database migrations (Supabase → SQL Editor)

Run any base migrations from the old list you haven't yet, then these NEW ones:

- [ ] `migration_payments_kind.sql` — adds `kind` to payments; boost/lead revenue can be recorded
- [ ] `migration_admin_full_access.sql` — admin can delete anything (RLS policies)
- [ ] Verify you're admin: `select public.is_admin();` while logged in, or check profiles.role

> Full base-migration order (only if starting fresh): schema → photos_messaging → admin →
> boost → services → service_bookings → reviews → favorites_alerts → tickets →
> food_ordering → news → connections_live → stream_categories → stream_video → vod →
> org_refresh → stripe → seed_organizations.

---

## Phase 3 — Edge functions (Supabase CLI)

- [x] `supabase functions deploy stripe-webhook --no-verify-jwt` ✅ (deployed)
- [ ] `supabase functions deploy create-checkout-session`
- [ ] Deploy the rest if not current:
  `create-order-session`, `create-booking-session`, `create-ticket-session`,
  `create-lead-session`, `create-boost-session`, `create-connect-account`,
  `fetch-news --no-verify-jwt`, `refresh-orgs --no-verify-jwt`,
  `notify-alerts`, `notify-providers`, `send-push`
- [ ] Schedule cron: `fetch-news` every few hours, `refresh-orgs` daily

---

## Phase 4 — Stripe LIVE mode

Test and live are fully separate: new keys, new webhook, Connect re-enabled.

1. [ ] **Activate account** (business details + payout bank) — required to leave test mode
2. [ ] Toggle **Live mode**, copy `sk_live_…` and `pk_live_…`
3. [ ] `supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx`
4. [ ] Enable **Connect → Express** in live + set platform branding (name, logo, support email)
5. [ ] Add **live webhook endpoint**:
   - URL: `https://rroyfpheqwalxylgeidu.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `charge.refunded`
   - [ ] `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx` (the LIVE signing secret)

Note: test-mode Connect accounts don't carry over — sellers/restaurants reconnect once in live.

---

## Phase 5 — Remaining config

- [ ] **Google Cloud**: Places API **and Geocoding API** both enabled, billing on
      (Geocoding powers radius search + pickup distance — without it they fall back to exact city)
- [ ] **VAPID**: `npx web-push generate-vapid-keys` →
      `supabase secrets set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT=mailto:info@desizoom.com`
      and `VITE_VAPID_PUBLIC_KEY` in Vercel
- [ ] **Vercel env vars** current: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
      `VITE_GOOGLE_PLACES_API_KEY`, `VITE_OPENWEATHER_API_KEY`, `VITE_TICKETMASTER_API_KEY`,
      `VITE_VAPID_PUBLIC_KEY`, `VITE_ADMIN_PASSWORD` → redeploy after changes
- [ ] Custom domain pointed + HTTPS (if using desizoom.com)

---

## Phase 6 — Live smoke tests (real card, small amounts, then refund)

After each, check Admin → Overview: payment appears with the right **Type** and status `completed`.

- [ ] Marketplace sale (8%)
- [ ] Food order (6%) — appears in customer profile AND restaurant dashboard AND admin Orders tab
- [ ] Service booking (8%)
- [ ] Event ticket (5%) — QR shows in profile
- [ ] Boost ($2.99) — now appears in revenue (new)
- [ ] Lead unlock ($10) — now appears in revenue (new)
- [ ] Seller Connect onboarding completes in live mode

---

## Phase 7 — Cleanup (AFTER smoke tests, BEFORE inviting users)

- [ ] Run `cleanup_before_launch.sql` — backs up every content table to `*_backup`, then wipes.
      Keeps accounts, organizations, news. **Never run this once real users are active.**
- [ ] Delete throwaway test accounts (Supabase → Authentication → Users; keep admin)
- [ ] Verify: wiped tables show 0, `posts_backup` shows your old count

---

## Phase 8 — Seed & launch

- [ ] Seed real content: 1–2 restaurants with menus, 5–10 deals, 2–3 events
- [ ] Final smoke test on the live domain (sign up fresh, browse, one purchase)
- [ ] Invite first ~20 Little Elm / DFW users
- [ ] Lead marketing with what has content (Deals, Businesses, News, feed); grow
      Order Food / Bookings / Live as they fill in
- [ ] After a few stable days: drop `*_backup` tables (snippet at bottom of cleanup script)

---

## Later / optional

- [ ] Terms of Use + Privacy Policy pages (footer links)
- [ ] Reviews / service-provider moderation tab in admin
- [ ] Full news manager (approved RSS items list) in admin
- [ ] Locale flexibility (currency, km, dynamic cities) when expanding beyond the US
