import { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Help & FAQ.
 *
 * One page with anchors rather than a multi-page help centre. At this size a
 * knowledge base just means more places for answers to go stale, and Ctrl+F
 * beats navigation for twenty questions.
 *
 * Every answer here must match what the code actually does. The payout and
 * fee answers especially — those are the ones a merchant will quote back at
 * you. If create-order-session or create-ticket-session change, change this.
 */

const CONTACT = 'info@desizoom.com';

type QA = { q: string; a: React.ReactNode };

const STEPS = [
  { t: 'Create an account', d: 'Tap Sign in, then "New to DesiZoom?". Email and a password, or continue with Google.' },
  { t: 'List your business', d: 'Account menu → List your business. Name, type, city and how customers get their order. Takes about two minutes.' },
  { t: 'Connect your bank', d: 'My Business → Payouts → Connect. This is Stripe, our payment provider. You will need your bank details and either your SSN or your EIN.' },
  { t: 'Add your menu or services', d: 'My Business → Menu & Orders. Add items one by one, or upload a photo of your printed menu and we will read it for you.' },
  { t: 'Take your first order', d: 'Orders appear in My Business the moment they are paid, with a chime. Mark them Preparing, then Ready, then Picked up.' },
];

const BIZ: QA[] = [
  { q: 'How do I list my business?',
    a: <>Tap your account icon and choose <b>List your business</b>, or go to{' '}
       <Link to="/add-business">desizoom.com/add-business</Link>. You'll pick a type — restaurant, grocery,
       catering, priest, photography, mehndi, event hall or other — and that decides whether you take
       orders or bookings. Listing is free and you can take it down whenever you like.</> },

  { q: 'How do I connect my bank account?',
    a: <>My Business → <b>Payouts</b> → Connect. That opens Stripe, who handle all payments for DesiZoom.
       You enter your bank details with them directly — we never see or store your account number.
       Set aside about ten minutes and have your bank details and tax ID to hand.</> },

  { q: 'Why does Stripe ask for my SSN or EIN?',
    a: <>US law requires anyone receiving business payments to be identity-verified. Stripe does this, not us.
       A sole proprietor uses their SSN; a registered business uses its EIN. If you stop partway through,
       your bank isn't connected and customers can't check out with you — so finish it in one sitting.</> },

  { q: 'When do I get paid, and how often?',
    a: <>Money goes to your own Stripe account on every order, then Stripe pays out to your bank.
       <b> Your first payout can take up to two weeks</b> while Stripe verifies a new account. After that
       it settles into a rolling schedule, usually a few business days. You can see every payment and
       payout in your Stripe dashboard, reachable from My Business → Payouts.</> },

  { q: 'What does DesiZoom cost?',
    a: <>Listing is free. There's no monthly fee, no tablet, no contract and no minimum.
       We take <b>6% of the item total on food orders</b> — pickup or your own delivery — and
       <b> 5% on event tickets</b>. Card processing is included in that; you are not charged a separate
       processing fee. If you charge a delivery fee, you keep all of it. Posting deals and events is free;
       there's an optional $2.99 boost if you want a deal pinned to the top for a week.</> },

  { q: 'How do I add menu items? Can I upload a photo of my menu?',
    a: <>My Business → Menu & Orders. Add items by hand, or upload a photo or PDF of your printed menu and
       we'll read the names and prices out of it. Nothing is saved until you check it — a misread price is
       real money, so you confirm every line first. Adding items by hand still works exactly as before.</> },

  { q: 'How do I receive and manage orders?',
    a: <>A paid order appears in My Business straight away, with a chime and an alert bar. Open it and move
       it along: <b>Start preparing</b> → <b>Ready</b> → <b>Mark picked up</b>. The customer sees each step
       on their own tracker as you tap it, so they know when to leave.</> },

  { q: "How do I pause orders when I'm busy or closed?",
    a: <>My Business → Menu & Orders → toggle the restaurant closed. Your listing stays visible but nobody
       can check out until you open again. Better than letting orders pile up during a rush.</> },

  { q: 'How do I refund a customer?',
    a: <>Open the order in My Business and cancel it — the customer is refunded in full and our commission
       comes back to you too, so you're never charged on money you didn't keep. Call them first if the food
       is already made. If the order has already been marked picked up, email us at {CONTACT} and we'll
       refund it for you.</> },

  { q: 'How do I post a deal or an event?',
    a: <>Use <b>+ Post</b> anywhere on the site, or My Business → Promote. Deals appear in the Deals section
       and in the home feed for people nearby. Events appear under What's On, across your whole state, so
       people in neighbouring cities see them too. Both are free, as often as you like.</> },

  { q: 'How do I sell tickets to my event?',
    a: <>Post the event and set a ticket price and how many tickets you have. People buy on DesiZoom and the
       money goes to your Stripe account, minus 5%. Seats are held while someone is checking out and
       released if they abandon it, so you can't oversell. You'll need your bank connected first.</> },

  { q: 'How do I edit or remove my listing?',
    a: <>My Business → Edit for details, or <b>Hide listing</b> to take it off the site. Hiding is instant and
       reversible, and nothing is deleted. Orders you've already accepted still need fulfilling.</> },
];

const ALL: QA[] = [
  { q: 'Do I need an account?',
    a: <>Only to order, book, or post something. Browsing restaurants, deals, events, services and local
       info needs no account at all.</> },

  { q: 'How do I order food?',
    a: <>Order Food, pick a restaurant, add items, check out. You'll get a tracker showing Ordered →
       Preparing → Ready → Picked up, updating live as the restaurant works. Pay by card; your details go
       straight to Stripe and never touch DesiZoom.</> },

  { q: 'What is the service fee?',
    a: <>A small fee on food orders — 2% plus 69¢, never more than $1.99 — shown separately before you pay.
       It's what keeps DesiZoom running without charging restaurants the 15–30% the delivery apps do.
       Sales tax is added where it applies.</> },

  { q: 'How do refunds work?',
    a: <>Before the restaurant starts cooking, a full refund, no questions. Once they've started, we usually
       can't — the food is made — but tell us anyway if something's gone wrong. If the restaurant cancels,
       you're refunded in full including the service fee. Full details on our{' '}
       <Link to="/refunds">refund policy</Link> page.</> },

  { q: 'How do I post a room, a deal or an event?',
    a: <><b>You don't need a business.</b> Tap + Post and choose what it is — a room to rent, a deal you
       found, an event you know about, something to sell. It appears for people in your area. Free.</> },

  { q: 'How do I change my city or search further away?',
    a: <>Tap the city pill at the top. If you allow location, we detect your city automatically; pick one
       manually any time and that choice wins. The miles pill next to it sets how far to search.
       Events always search wider — 50 to 100 miles — because people travel for a mela.</> },

  { q: 'How do I add DesiZoom to my home screen?',
    a: <><b>iPhone:</b> open desizoom.com in Safari, tap Share, then "Add to Home Screen".{' '}
       <b>Android:</b> open it in Chrome, tap the ⋮ menu, then "Install app" or "Add to Home screen".
       It then opens like an app, full screen, and can send you order alerts. Nothing to download.</> },

  { q: 'Is it free?',
    a: <>Free to browse, free to post, free to list a business. Customers pay a small service fee on food
       orders; businesses pay commission only when they actually get paid.</> },
];

function Item({ qa, open, onToggle }: { qa: QA; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '15px 0', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 15, fontWeight: 700, color: 'var(--text)',
          display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline',
        }}
      >
        <span>{qa.q}</span>
        <span style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--text)', padding: '0 0 18px', maxWidth: 680 }}>
          {qa.a}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  // Everything open by default. A collapsed accordion hides the one answer the
  // person came for, and Ctrl+F can't find text that isn't rendered.
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setClosed((p) => {
    const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#3d1509,#2a1500)' }}>
        <div className="eyebrow">Help</div>
        <h1>Questions and answers</h1>
        <p>How to list a business, get paid, order food and everything else.</p>
      </div>

      <div style={{ padding: '28px 32px 64px', maxWidth: 780 }}>

        <h2 style={{ fontSize: 18, margin: '0 0 6px' }}>Getting started as a business</h2>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 18px' }}>
          Five steps, about fifteen minutes. Step 3 is the one worth doing in a single sitting.
        </p>
        <ol style={{ margin: '0 0 36px', padding: 0, listStyle: 'none', counterReset: 'dz' }}>
          {STEPS.map((s) => (
            <li key={s.t} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              <span style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent)', color: '#412402', fontWeight: 700, fontSize: 13.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{STEPS.indexOf(s) + 1}</span>
              <span>
                <b style={{ fontSize: 14.5 }}>{s.t}</b>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 2 }}>{s.d}</div>
              </span>
            </li>
          ))}
        </ol>

        <h2 id="business" style={{ fontSize: 18, margin: '0 0 4px' }}>For businesses</h2>
        <div style={{ marginBottom: 36 }}>
          {BIZ.map((qa) => (
            <Item key={qa.q} qa={qa} open={!closed.has(qa.q)} onToggle={() => toggle(qa.q)} />
          ))}
        </div>

        <h2 id="everyone" style={{ fontSize: 18, margin: '0 0 4px' }}>For all of us</h2>
        <div style={{ marginBottom: 32 }}>
          {ALL.map((qa) => (
            <Item key={qa.q} qa={qa} open={!closed.has(qa.q)} onToggle={() => toggle(qa.q)} />
          ))}
        </div>

        <div style={{
          background: 'var(--accent-soft)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '18px 20px',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Still stuck?</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>
            Email <a href={`mailto:${CONTACT}`} style={{ fontWeight: 700 }}>{CONTACT}</a>. A real person
            reads it, and we'd rather fix something than have you give up on it.
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 30, paddingTop: 15, fontSize: 12.5, color: 'var(--muted)' }}>
          See also: <Link to="/merchant-terms">Merchant Agreement</Link> · <Link to="/refunds">Refunds</Link> ·{' '}
          <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link>
        </div>
      </div>
    </>
  );
}
