import { Link } from 'react-router-dom';

/**
 * Our Story.
 *
 * Deliberately says nothing about which cities we cover. Naming cities dates
 * the page the moment a merchant signs up somewhere else, and a reader who
 * doesn't see their own town assumes the answer is no. "Wherever you are" is
 * true today and stays true.
 *
 * The 6% is kept prominently. It is the single most persuasive fact we have
 * for a restaurant owner, and burying it helps nobody.
 */

const CONTACT = 'info@desizoom.com';

export default function About() {
  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#4a1b0c,#2a1500)' }}>
        <div className="eyebrow">Our Story</div>
        <h1>
          Everything desi in your city.<br />
          <span style={{ color: 'var(--accent)' }}>All in one place.</span>
        </h1>
        <p>Food, deals, services, events and community — from the local businesses already around you.</p>
      </div>

      <div style={{ padding: '28px 32px 64px', maxWidth: 860 }}>

        {/* The problem, before the product. A reader who recognises this will
            read the rest; one who is told "DesiZoom is a platform" will not. */}
        <p style={P}>
          Every desi family knows the drill. You want a good biryani, a priest for a housewarming,
          a caterer who actually understands the menu, or to find out when the next Diwali event is.
          So you ask a WhatsApp group. Then a Facebook group. Then a friend of a friend. And when you
          move somewhere new, you start over from nothing.
        </p>
        <p style={P}>
          Meanwhile the businesses that could help you are right there — a few miles away, quietly
          doing good work, invisible because there was never one place to look.
        </p>
        <p style={{ ...P, fontWeight: 600, marginBottom: 28 }}>
          DesiZoom is that one place. Free to use, open to any desi, anywhere.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
          gap: 16, marginBottom: 28,
        }}>
          <div style={{ ...CARD, background: 'var(--accent-soft)' }}>
            <div style={{ ...KICKER, color: 'var(--accent-text)' }}>For everyone</div>
            <div style={H}>Explore nearby</div>
            <Point t="Food and deals" d="Order pickup from desi restaurants — no delivery-app markup on your food." />
            <Point t="Services you need" d="Caterers, priests, mehndi artists, photographers, tutors and more." />
            <Point t="Events and community" d="Temple events, garba nights, desi films, roommates and local info." last />
          </div>

          <div style={{ ...CARD, background: 'white' }}>
            <div style={{ ...KICKER, color: 'var(--muted)' }}>For local businesses</div>
            <div style={H}>Get discovered</div>
            <Point t="Create a free profile" d="Show what you offer, your hours and how to reach you. No cost, ever." />
            <Point t="Promote what's new" d="Post deals, photos, services and events to people already looking." />
            <Point
              t={<>Restaurant pickup at <span style={{ color: 'var(--accent-text)' }}>6%</span></>}
              d="Not the 15–30% delivery apps take. No monthly fee, no tablet, no contract."
              last
            />
          </div>
        </div>

        <div style={{
          background: 'var(--navy)', color: 'white', borderRadius: 14,
          padding: '20px 22px', display: 'flex', gap: 18, alignItems: 'center',
          flexWrap: 'wrap', marginBottom: 26,
        }}>
          <img
            src="/shreyan.jpg" alt="Shreyan Jamalpur"
            style={{ width: 72, height: 90, objectFit: 'cover', borderRadius: 9, flex: '0 0 72px' }}
          />
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ ...KICKER, color: 'var(--accent)' }}>Who built this</div>
            <div style={{ fontSize: 15.5, fontWeight: 700 }}>Shreyan Jamalpur</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.78)', marginTop: 5 }}>
              Shreyan is a high school senior who thought it was strange that finding a caterer, a priest
              or a good biryani still meant asking around. He sketched out DesiZoom in his notebook.
              He and his dad have been building it ever since.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap', marginBottom: 22 }}>
          <Link to="/add-business" className="btn">List your business free</Link>
          <Link to="/search" className="btn btn-ghost">Explore your city</Link>
        </div>

        <div style={{
          borderTop: '1px solid var(--border)', paddingTop: 16,
          fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7,
        }}>
          Free to use. Nothing to install — open desizoom.com and add it to your home screen.<br />
          Questions, or want to be listed?{' '}
          <a href={`mailto:${CONTACT}`} style={{ fontWeight: 600 }}>{CONTACT}</a>
        </div>

      </div>
    </>
  );
}

function Point({ t, d, last }: { t: React.ReactNode; d: string; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 13 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>{d}</div>
    </div>
  );
}

const P: React.CSSProperties = { fontSize: 14.5, lineHeight: 1.75, margin: '0 0 13px', maxWidth: 660 };
const CARD: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 14, padding: '19px 21px' };
const KICKER: React.CSSProperties = { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 };
const H: React.CSSProperties = { fontSize: 17, fontWeight: 700, margin: '5px 0 15px', letterSpacing: '-0.2px' };
