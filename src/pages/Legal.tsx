import { useLocation } from 'react-router-dom';

/**
 * Terms, Privacy and Refunds.
 *
 * Written to be read, not to be impressive — short, plain, and honest about
 * what DesiZoom actually is: a platform connecting customers to independent
 * local businesses. Stripe asks for links to these during account activation,
 * and a stated refund policy is what makes a chargeback defensible.
 *
 * NOT legal advice, and not a substitute for a lawyer looking at it. This is a
 * reasonable starting point that reflects how the product genuinely works.
 * Have it reviewed before volume grows.
 */

const UPDATED = 'August 2026';
const CONTACT = 'support@desizoom.com';   // ← set a real inbox you monitor

type Doc = { title: string; blocks: (string | { h: string })[] };

const DOCS: Record<string, Doc> = {
  terms: {
    title: 'Terms of Service',
    blocks: [
      `By using DesiZoom you agree to these terms. If you don't, please don't use the service.`,
      { h: 'What DesiZoom is' },
      `DesiZoom is a platform. We connect you with independent local businesses — restaurants, caterers, priests, photographers, event organisers and others. We are not a restaurant and we do not prepare, handle or deliver food. We do not provide the services you book.`,
      `The business you order from is responsible for its own food, service, pricing, accuracy, hygiene, licensing and quality. Any dispute about what you received is between you and that business, though we'll help where we reasonably can.`,
      { h: 'Your account' },
      `You need an account to order, post or book. Keep your login details to yourself — you're responsible for activity on your account. Give us accurate information, particularly your phone number, since businesses use it to reach you about your order.`,
      `You must be 18 or older to place a paid order.`,
      { h: 'Orders and payment' },
      `Prices are set by the business, not by us. When you place an order you're buying from that business; DesiZoom processes the payment on their behalf through Stripe.`,
      `You'll also pay a small service fee to DesiZoom, shown separately before you pay. Sales tax is added where it applies.`,
      `A business may decline or cancel an order — they may be closed, out of an item, or unable to make the pickup time. If they do, you're refunded in full.`,
      { h: 'Posting on DesiZoom' },
      `You can post deals, listings, events and questions. What you post must be accurate, lawful, and yours to post. Don't post anything misleading, offensive, discriminatory, or that infringes someone else's rights.`,
      `We can remove any post and suspend any account, at our discretion, particularly where something is unsafe or dishonest.`,
      { h: 'For businesses' },
      `If you list a business you confirm you're authorised to represent it, that your details and prices are accurate, and that you hold whatever licences and permits your trade requires.`,
      `We charge a commission on orders placed through DesiZoom, deducted before payout. Payouts go to your own Stripe account, typically within a few business days.`,
      `You're responsible for fulfilling orders you accept, and for the quality and safety of what you provide.`,
      { h: 'Limits' },
      `DesiZoom is provided as-is. We work to keep it accurate and available, but we don't guarantee that listings are correct, that a business will fulfil an order, or that the service will be uninterrupted.`,
      `To the extent the law allows, our liability to you is limited to the amount you paid us in service fees on the order concerned. Nothing here limits liability that can't lawfully be limited.`,
      { h: 'Changes' },
      `We may update these terms. If we change something significant we'll say so on the site. Continuing to use DesiZoom means you accept the current version.`,
      { h: 'Contact' },
      `Questions about these terms: ${CONTACT}`,
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    blocks: [
      `This explains what we collect, why, and what we do with it. Short version: we collect what's needed to run the service, and we don't sell it.`,
      { h: 'What we collect' },
      `Account details — your email, name and city.`,
      `Order details — what you ordered, from whom, your phone number, and a pickup or delivery address where relevant.`,
      `Location — if you allow it, we use your device location to work out your city so we can show you nearby businesses. You can decline; you'll just pick your city manually.`,
      `Payment details — handled entirely by Stripe. We never see or store your card number.`,
      `Usage — basic technical information such as pages viewed and errors encountered, so we can keep the site working.`,
      { h: 'How we use it' },
      `To take and fulfil your orders, to let businesses contact you about them, to send order updates, and to run and improve the service. That's it.`,
      { h: 'Who we share it with' },
      `The business you order from receives your name, phone number, order contents and — for delivery — your address. They need it to serve you.`,
      `Stripe processes payments. Supabase hosts our database. Google provides maps and location lookup. Each receives only what their function requires.`,
      `We do not sell your personal information, and we don't share it for advertising.`,
      `We'll disclose information if the law requires it.`,
      { h: 'Notifications' },
      `If you allow them, we send push notifications about your orders. You can turn these off in your browser or device settings at any time.`,
      { h: 'Keeping it' },
      `We keep order and payment records as long as needed to run the business and meet tax and accounting obligations. Other account data we keep while your account is open.`,
      { h: 'Your choices' },
      `You can ask us to correct or delete your information, or to send you a copy of it. Email ${CONTACT} and we'll deal with it. Some records — completed orders, tax records — we may need to retain by law.`,
      { h: 'Children' },
      `DesiZoom isn't intended for children under 13, and we don't knowingly collect their information.`,
      { h: 'Contact' },
      `Questions, or a request about your data: ${CONTACT}`,
    ],
  },

  refunds: {
    title: 'Refund Policy',
    blocks: [
      `Food is made to order, so refunds work a little differently from ordinary shopping. Here's exactly where you stand.`,
      { h: 'Before the restaurant starts' },
      `Full refund, no questions. If your order still shows "Ordered" and hasn't moved to "Preparing", contact us or the restaurant and we'll cancel and refund it.`,
      { h: "Once they've started cooking" },
      `We can't usually refund an order that's already being prepared — the food is made and the ingredients are used. If something has genuinely gone wrong, tell us anyway and we'll look at it.`,
      { h: 'If the restaurant cancels' },
      `Full refund, automatically. If they're closed, out of an item, or can't make your pickup time, you get everything back including the service fee.`,
      { h: 'If something is wrong with your order' },
      `Missing items, the wrong dish, or food that isn't right — contact the restaurant first, since they can often fix it immediately. If that doesn't resolve it, email ${CONTACT} within 48 hours with your order details and a photo if you have one, and we'll work it out with them.`,
      { h: "If you don't collect it" },
      `An order that's ready and not collected can't be refunded. The food was made and held for you.`,
      { h: 'Bookings and tickets' },
      `Services booked through DesiZoom — priests, caterers, photographers — follow the cancellation terms the provider sets, shown when you book.`,
      `Event tickets are refundable if the event is cancelled by the organiser. Otherwise it's up to the organiser.`,
      { h: 'How refunds arrive' },
      `Back to the card you paid with, usually within 5–10 business days depending on your bank. We'll email you when it's issued, and you'll see it in your profile.`,
      { h: 'Talk to us' },
      `We'd rather sort a problem out than have you dispute a charge with your bank. Email ${CONTACT} and we'll respond as quickly as we can.`,
    ],
  },
};

export default function Legal() {
  // Three explicit routes share this component; the path tells us which.
  const { pathname } = useLocation();
  const key = pathname.replace(/^\/+|\/+$/g, '');
  const content = DOCS[key] ?? DOCS.terms;

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#3d1509,#2a1500)' }}>
        <div className="eyebrow">📄 Legal</div>
        <h1>{content.title}</h1>
        <p>Last updated {UPDATED}</p>
      </div>

      <div style={{ padding: '28px 32px 64px', maxWidth: 720 }}>
        {content.blocks.map((b, i) =>
          typeof b === 'string' ? (
            <p key={i} style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text)', margin: '0 0 14px' }}>
              {b}
            </p>
          ) : (
            <h2 key={i} style={{ fontSize: 16, margin: '26px 0 10px' }}>{b.h}</h2>
          )
        )}

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 32, paddingTop: 16, fontSize: 12.5, color: 'var(--muted)' }}>
          DesiZoom · Little Elm, Texas · {CONTACT}
        </div>
      </div>
    </>
  );
}
