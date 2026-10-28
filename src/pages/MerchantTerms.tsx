/**
 * Merchant Agreement.
 *
 * Every number here is pulled from what the code actually does — 6% on items
 * only, the capped customer service fee, destination charges so DesiZoom
 * absorbs Stripe's processing cost, Texas tax remitted by us. If any of those
 * change in create-order-session, this page is wrong and must change with it.
 *
 * MERCHANT_TERMS_VERSION is written to businesses.terms_accepted_version at
 * signup. Bump it whenever the substance changes, never for a typo fix — the
 * version is what tells you which terms a given merchant actually agreed to.
 *
 * NOT legal advice. A reasonable, honest starting point that reflects how the
 * product genuinely works. Have a lawyer read it before volume grows.
 */

export const MERCHANT_TERMS_VERSION = '2026-10-15';

const CONTACT = 'info@desizoom.com';

type Block = string | { h: string } | { list: string[] };

const BLOCKS: Block[] = [
  `This agreement is between DesiZoom and you, the business listing on DesiZoom. It covers what each of us is responsible for, what we charge, and how you get paid. It is written to be read.`,

  { h: '1. What DesiZoom is' },
  `DesiZoom is a platform. We list your business, show it to customers nearby, and — if you take orders or bookings — collect payment on your behalf and pass it to you.`,
  `We are not a restaurant, caterer or service provider. We do not prepare food, handle it, deliver it, or perform the services customers book. You do.`,

  { h: '2. What you are responsible for' },
  { list: [
    `That you are authorised to represent the business you list.`,
    `Holding every licence, permit, insurance and registration your trade requires — food handling, health inspection, liability cover, professional certification, whatever applies to you.`,
    `The accuracy of everything on your listing: prices, menu items, hours, photos, descriptions and availability.`,
    `Fulfilling the orders and bookings you accept, on time and as described.`,
    `The safety and quality of what you provide, including food safety and allergen information.`,
    `Your own taxes on the income you earn, other than the sales tax described in section 6.`,
  ]},
  `If a customer has a complaint about what they received, it is yours to resolve. We will help where we reasonably can, but we cannot answer for food we did not cook or work we did not do.`,

  { h: '3. What we charge' },
  `Listing on DesiZoom is free. There is no monthly fee, no setup fee, no contract and no minimum.`,
  `We charge commission only when you actually get paid through the platform:`,
  { list: [
    `Food pickup and delivery orders — 6% of the item subtotal.`,
    `Service bookings — 8% of the booking price.`,
    `Event tickets — 5% of the ticket price.`,
  ]},
  `Commission is calculated on your items only. If you charge a delivery or shipping fee, you keep 100% of it — that is your work, not ours.`,
  `Customers pay a separate small service fee to DesiZoom, shown to them at checkout. It is ours, it does not come out of your money, and it does not change what you receive.`,
  `Card processing costs are paid by DesiZoom out of our commission. You are not charged a separate processing fee on top of the rates above.`,

  { h: '4. How you get paid' },
  `Payments go through Stripe. You connect your own Stripe account; your bank details are yours and we never see them.`,
  `On each order we deduct our commission and send the rest to your Stripe account. Stripe pays out to your bank on its own schedule — typically a few business days, and longer for your first payout.`,
  `You can see every order and payout in your Stripe dashboard and in My Business on DesiZoom.`,
  `We cannot pay you for orders placed before you finish connecting Stripe. Until that is done, customers cannot check out with you at all.`,

  { h: '5. Refunds and cancellations' },
  `Our refund policy applies to customers and is published on the site.`,
  `If you cancel or decline an order, the customer is refunded in full and no commission is charged.`,
  `If an order is refunded after you have been paid, the refunded amount — including our commission on it — is reversed from your Stripe balance.`,
  `If a customer disputes a charge with their bank, we will share the order record with you and work it out together. Where the dispute concerns what you provided, the amount may be recovered from your payouts.`,

  { h: '6. Sales tax' },
  `Where DesiZoom is registered as a marketplace facilitator, we calculate sales tax, collect it from the customer, hold it, and remit it to the state. Texas works this way today. You do not remit sales tax on orders placed through DesiZoom in those states, and you should not include it in your prices.`,
  `Where we are not registered, no sales tax is collected through the platform and your own tax obligations are unchanged.`,
  `Set your menu and service prices excluding sales tax. We add it at checkout where it applies.`,
  `This is how we understand our obligations, not tax advice. Ask your own accountant how it affects you.`,

  { h: '7. Your content' },
  `Photos, menus, descriptions and logos you upload stay yours. By posting them you let us display and promote them on DesiZoom and in our own marketing for your business.`,
  `Only post content you have the right to post. Don't upload other people's photos.`,

  { h: '8. Suspension and ending this' },
  `You can remove your listing at any time, for any reason, with no notice and no fee. Orders already accepted still need fulfilling.`,
  `We may suspend or remove a listing that is unsafe, dishonest, unlicensed, repeatedly fails to fulfil orders, or breaks these terms. Where it is not urgent we will tell you first and give you a chance to fix it.`,
  `Money already earned is still paid out.`,

  { h: '9. Limits' },
  `DesiZoom is provided as-is. We work hard to keep it running and accurate, but we don't guarantee a particular number of customers, orders or revenue, or that the service will never be interrupted.`,
  `To the extent the law allows, our liability to you is limited to the commission we earned from you in the three months before the claim.`,

  { h: '10. Changes' },
  `We may update this agreement. If we change something that affects what you pay or how you get paid, we will tell you by email before it takes effect. Continuing to use DesiZoom afterwards means you accept the new version.`,

  { h: 'Questions' },
  `Email ${CONTACT}. A real person reads it.`,
];

export default function MerchantTerms() {
  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#3d1509,#2a1500)' }}>
        <div className="eyebrow">📄 For businesses</div>
        <h1>Merchant Agreement</h1>
        <p>Version {MERCHANT_TERMS_VERSION}</p>
      </div>

      <div style={{ padding: '28px 32px 64px', maxWidth: 720 }}>
        {BLOCKS.map((b, i) => {
          if (typeof b === 'string') {
            return (
              <p key={i} style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text)', margin: '0 0 14px' }}>{b}</p>
            );
          }
          if ('h' in b) {
            return <h2 key={i} style={{ fontSize: 16, margin: '26px 0 10px' }}>{b.h}</h2>;
          }
          return (
            <ul key={i} style={{ margin: '0 0 14px', paddingLeft: 22 }}>
              {b.list.map((li, j) => (
                <li key={j} style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text)', marginBottom: 6 }}>{li}</li>
              ))}
            </ul>
          );
        })}

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 32, paddingTop: 16, fontSize: 12.5, color: 'var(--muted)' }}>
          DesiZoom · {CONTACT}
        </div>
      </div>
    </>
  );
}
