# Sales tax — how it works here, and what's left

**Status: the machinery is built, the compliance isn't.** Code can collect,
route and report tax. It cannot register you with a state or decide whether
Texas treats you as the marketplace facilitator. Those are the two things
standing between this and being compliant, and neither is a coding task.

## The model (same as DoorDash and Uber Eats)

**1. Collect on every order, everywhere.** The customer always pays the correct
tax for where the food is sold. No exceptions, no per-state behaviour at
checkout.

**2. Route it based on who's responsible.** `tax_jurisdictions.we_remit`
decides:

| we_remit | Who is seller of record | Where the tax goes | Who files |
|---|---|---|---|
| `false` (default) | The merchant | Included in their Stripe payout | Merchant |
| `true` | DesiZoom | Kept on our side, added to `application_fee_amount` | DesiZoom |

This is exactly DoorDash's split. In their facilitator states the merchant
payout *excludes* tax; everywhere else it's *included* and the merchant remits.

**3. Report both ways.** `tax_monthly_breakdown` gives each merchant a monthly
statement showing tax collected and, crucially, a
`remittance_responsibility` column reading `platform` or `merchant`. DoorDash
publishes the same thing. Nobody should ever have to guess.

**4. Watch the thresholds.** `sales_by_state` shows volume per state. Economic
nexus arrives silently and applies retroactively — check it quarterly.

## Why it defaults to pass-through

Below a state's threshold the merchant is seller of record and passing tax
through in their payout is correct. You are below every state's threshold today
and will be for a while. Texas is the exception worth resolving, because
physical presence is a different test from economic nexus.

**A contract does not override a statute.** If a state decides you're the
facilitator, your merchant agreement saying otherwise gives you a claim against
the merchant — not a defence against the state.

## What's still to do

**1. The CPA conversation.** See `CPA_QUESTIONS.md`. The one answer that
unblocks everything: is DesiZoom the marketplace provider in Texas? If yes,
`update tax_jurisdictions set we_remit = true, registered = true where code='TX'`
and register with the Comptroller. If no, the default already matches reality.

**2. Get a Texas sales tax permit.** Free, online. You cannot lawfully collect
tax you're not registered to collect, so this gates step 3 for anything you
remit yourself.

**3. Turn on tax calculation.** Stripe Tax is the right tool — 0.5% per
transaction, handles every state and city, tracks thresholds. In the Stripe
dashboard: enable Tax, set the origin address, assign a product tax code
(prepared food is taxed differently from groceries in many states).

Then in `create-order-session`, compute tax with the Tax API *before* creating
the session, so the amount is known when `application_fee_amount` is set:

```
tax = await stripe.tax.calculations.create({ ... })
taxCents = tax.tax_amount_exclusive
// add a tax line item to the session, then:
application_fee_amount = commission + (weRemit ? taxCents : 0)
```

Order of operations matters. With `automatic_tax` the amount isn't known until
checkout, which is too late to decide who keeps it.

**4. Restrict merchant signup by state.** `tax_jurisdictions.accepting` exists
for this; the gate in `AddBusiness` isn't wired yet. Every state you accept a
merchant in is a state you may have to register and file in. Customers browsing
from anywhere costs you nothing — merchants taking payment is what creates the
obligation.

## Today's actual position

No tax is collected on any order. At the current volume — a handful of orders
totalling under $100 — the exposure is trivial and easily corrected. At fifteen
restaurants doing real volume it is not, and it accrues with penalties and
interest.

Sort it before the merchants arrive, not after.
