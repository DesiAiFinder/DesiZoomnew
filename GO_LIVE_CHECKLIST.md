# Going live on Stripe

Test mode and live mode are **separate worlds**. Nothing copies across — not
keys, not webhooks, not connected accounts, not orders. Treat this as setting up
a second Stripe integration that happens to share your code.

---

## Tax position

Texas is settled: **registered = true, we_remit = true, rate 8.25%**. DesiZoom
collects the tax and files it. Confirmed as correct for our situation.

What that commits us to once live:

- Filing on whatever schedule the Comptroller assigns (monthly or quarterly)
- Admin → Money gives the figure: the "We remit" number, filtered by period
- `tax_monthly_breakdown` is the per-merchant detail if it's ever queried

**Other states are a separate decision.** `tax_jurisdictions` has only TX in it.
Any other state a merchant signs up in collects no tax until a row is added and
we're registered there. That's the safe default — don't accept merchants outside
Texas without deciding this first.

---

## Before you flip anything

These aren't Stripe requirements dressed up as caution. Each one is something
that costs real money or real trust once live.

**1. The CPA conversation.** Real orders create real sales tax liability from
the first transaction. Today's test orders are noise; a live order in an
unregistered state is not. See `CPA_QUESTIONS.md`.

**2. A merchant agreement.** Nothing currently sets out commission, payout
timing, refund responsibility, or who remits tax. When a restaurant disputes a
payout — and one eventually will — a written agreement is the difference
between a conversation and an argument.

**3. Terms of service, privacy policy, refund policy.** You have none. Stripe
asks for a link to these during activation, and taking card payments without a
stated refund policy invites chargebacks you can't defend. Even short ones are
far better than nothing.

**4. A working backup.** `backup.cmd` runs — make sure it has run recently and
that a copy lives somewhere other than the laptop.

**5. Test the whole loop once more in test mode**, end to end: order, pay,
kitchen alert, status change, customer sees it, then refund it. Confirm the
refund actually reverses. You've never tested a refund.

---

## Stripe activation

Dashboard → **Activate account**. You'll need:

- Legal business name and structure (LLC, sole proprietor…)
- EIN, or SSN if sole proprietor
- Business address and phone
- Your bank account for payouts
- A description of what you sell — say "online ordering marketplace for local
  restaurants and services", not "app"
- Your website, and links to terms and privacy

Activation review is usually hours, occasionally a few days. **Start it before
you need it.**

Because you're a Connect platform, also complete **Connect → Settings**: the
platform name, support email and branding customers see during merchant
onboarding.

---

## The switch itself

Live keys are entirely different values. Three secrets change, in three places.

**1. Frontend — Vercel → Environment Variables**

```
VITE_STRIPE_PUBLISHABLE_KEY = pk_live_...
```

Redeploy afterwards. Vite bakes this in at build time, so an env change alone
does nothing.

**2. Backend — Supabase secrets**

```
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

**3. The webhook — and this is where today went wrong.**

Create a **new endpoint in live mode**. Test-mode endpoints do not fire for live
payments. Stripe → Webhooks → Add endpoint:

```
https://rroyfpheqwalxylgeidu.supabase.co/functions/v1/stripe-webhook
```

Events: `checkout.session.completed` and `charge.refunded`.

Then reveal the **live** signing secret with the eye icon, copy the whole
thing, and:

```
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase functions deploy stripe-webhook
```

A truncated paste here cost a full day. The value is roughly 38 characters. Look
at it before pressing Enter.

**4. Redeploy every function that touches Stripe**

```
npx supabase functions deploy create-order-session create-checkout-session create-ticket-session create-booking-session create-boost-session create-lead-session create-connect-account refund-payment stripe-webhook
```

---

## Every merchant must reconnect

**This is the part people forget.** Test-mode connected accounts don't exist in
live mode. Every restaurant's `stripe_account_id` currently points at a test
account that live payments cannot pay out to.

So after switching:

```sql
-- See who needs to redo it
select r.name, p.email, p.stripe_account_id
from public.restaurants r join public.profiles p on p.id = r.owner_id;
```

Each owner must go through Connect onboarding again via the Payouts section of
My Business. Until they do, their checkout fails with "This restaurant has not
set up payments yet."

Tell them before it happens, not after a customer finds it.

---

## First live order

Do this yourself, with your own card, for a small real amount.

- [ ] Place the order — money genuinely leaves your account
- [ ] Stripe shows the payment succeeded
- [ ] Webhook delivered **200** (check Event deliveries — do not assume)
- [ ] Order moved from `pending` to `paid`
- [ ] Restaurant got the alert and the chime
- [ ] Status changes reach the customer's tracker
- [ ] `payments` row written with the right commission
- [ ] Admin → Money reflects it
- [ ] **Refund it**, and confirm the money comes back and the order reverses
- [ ] Payout appears in the restaurant's Stripe balance

Only after all ten should you tell a merchant they're live.

---

## What changes about your life

**Disputes.** A customer can charge back. Stripe takes $15 plus the amount, and
you lose the fee. Keep order records and a written refund policy.

**Payout timing.** Your first live payout typically takes 7–14 days, then
settles into a rolling schedule. Merchants will ask; know the answer.

**Test data stays behind.** All 13 test orders, the test payments, the test
Connect accounts — none of it appears in live. Your live Money tab starts at
zero, which is correct.

**Both modes stay usable.** You can keep testing in the sandbox afterwards. Just
never mix the keys — a `sk_test_` with a live webhook secret fails exactly the
way it did today.
