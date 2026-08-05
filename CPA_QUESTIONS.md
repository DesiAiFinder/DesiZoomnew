# CPA meeting — DesiZoom

Print this and take it. Read section 1 out loud at the start; it saves fifteen
minutes of explanation and gets you better answers in the time you're paying
for. Ask for a **Texas sales tax / marketplace facilitator** specialist, not a
general small-business accountant — this is a niche area.

---

## 1. Our setup (read this first)

- Entity: **[fill in — LLC? sole proprietor? S-corp?]**, based in Little Elm, TX.
- We run an app connecting desi customers to local desi businesses.
- Live since July 2026. Very low volume so far: ~13 orders, under $100 total.
- Payments run through **Stripe Connect using destination charges.** The
  customer pays us; Stripe transfers the money to the business's own connected
  Stripe account; we retain an "application fee" as our commission. Stripe's
  processing fee comes out of our side.
- Our commission by transaction type:
  - Restaurant food orders — 6% of the food subtotal
  - Service bookings (caterers, priests, photographers) — 8%
  - Event tickets — 5%
  - Marketplace item sales between individuals — 8%
  - Listing "boost" promotions — flat $2.99, paid to us directly
- The business sets its own prices. We never take possession of goods.
- **We currently collect no sales tax at all.** That's the main reason we're here.
- We plan to operate in other states eventually, and the app already lets
  customers browse from anywhere.

---

## 2. Sales tax — the main questions

1. **Are we a marketplace provider in Texas** for these transactions, or is
   each business the seller of record?

2. **Does the answer differ by revenue stream?** Prepared food vs a booked
   service vs an event ticket vs a used item sold between two individuals —
   are these treated the same?

3. **Does pickup differ from delivery?**

4. **If we are the facilitator:** what must we register for, what do we file,
   and how often? What's involved in doing this correctly from here on?

5. **If we're not:** can we collect tax at checkout and pass it through to the
   business in their payout, with them remitting? What exactly must our
   merchant agreement say for that to hold up?

6. **Should we get a Texas sales tax permit now regardless**, as a precaution?

7. **Is our customer-facing service fee taxable?** (We're planning a $0.99–$1.99
   flat fee per order.)

8. **Is our commission itself subject to any Texas tax** as a service?

9. **We've collected no tax on the orders to date.** What, if anything, do we
   need to do about that?

---

## 3. Operating in more than one state

10. **When do we become obligated in another state?** What thresholds should we
    be monitoring, and are they sales-dollar, transaction-count, or both?

11. **Should we restrict merchant signups to Texas for now?** (Our instinct is
    yes — we can enforce it in the product.)

12. **If a business in, say, New Jersey signs up and takes one order — what
    have we just triggered?**

---

## 4. Income tax and reporting

13. **What counts as our taxable income** — the full amount customers pay, or
    only our commission?

14. **Who issues 1099-Ks to our merchants — Stripe or us?** We believe it
    depends on our Connect account type. **[Bring: which type `create-connect-
    account` uses — Standard, Express, or Custom.]**

15. **Do we need to issue any other 1099s?**

16. **What records must we keep per transaction**, and for how long?

---

## 5. Practical

17. **Should we use Stripe Tax?** (0.5% per transaction, calculates rates and
    produces filing data automatically.) Would you work from its reports?

18. **Would you handle our filings**, and what would that cost as we grow —
    one state versus five?

19. **Is our current entity structure right** for a platform holding customer
    money in transit, or should it change?

20. **What should we get in writing in the merchant agreement** on tax
    responsibility?

---

## 6. Bring with you

- This document
- A sample order breakdown: $30 food → $28.20 to restaurant, $1.80 to us,
  Stripe takes ~$1.17 of our share
- Which Stripe Connect account type we use
- Your entity formation documents
- A rough forecast: ~15 merchants and maybe 100 orders/month by year end

---

## 7. What you want to leave with

- A yes/no on whether you're the facilitator in Texas
- A decision on whether to register now
- One sentence you can put in the merchant agreement about tax
- A number to watch that tells you when another state becomes a problem
- Their fee to handle it going forward
