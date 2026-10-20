import { Link, useLocation } from 'react-router-dom';

/**
 * 404.
 *
 * There was no catch-all route, so any unknown path rendered an entirely
 * blank page — no header, no footer, no way back. That matters more than it
 * sounds: every flyer, QR code and WhatsApp forward is a chance for someone
 * to arrive at a mistyped or stale URL, and a white screen reads as "this
 * site is broken", not "that page moved".
 */
export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#3d1509,#2a1500)' }}>
        <div className="eyebrow">404</div>
        <h1>That page isn't here</h1>
        <p>The link may be old, or there's a typo in the address.</p>
      </div>

      <div style={{ padding: '28px 32px 64px', maxWidth: 640 }}>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: '0 0 6px' }}>
          Nothing lives at <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 5 }}>{pathname}</code>.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--muted)', margin: '0 0 22px' }}>
          Try one of these instead:
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
          {[
            { to: '/', label: 'Home' },
            { to: '/order', label: 'Order food' },
            { to: '/deals', label: 'Deals' },
            { to: '/events', label: 'Events' },
            { to: '/services', label: 'Book a service' },
            { to: '/about', label: 'Our Story' },
          ].map((l) => (
            <Link
              key={l.to} to={l.to} className="chip"
              style={{ textDecoration: 'none', padding: '8px 16px' }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>
          Landed here from a link we gave you? Tell us at{' '}
          <a href="mailto:info@desizoom.com" style={{ fontWeight: 600 }}>info@desizoom.com</a> and we'll fix it.
        </div>
      </div>
    </>
  );
}
