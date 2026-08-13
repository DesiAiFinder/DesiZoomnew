import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--navy)', color: 'rgba(255,255,255,0.7)',
      padding: '40px 32px 28px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 32 }}>
          {/* Brand */}
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: 'white', marginBottom: 10 }}>
              Desi<span style={{ color: 'var(--accent)' }}>Zoom</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Everything Desi in one place: food, deals, services, events &amp; more for your desi community.
            </p>
          </div>

          {/* Explore links */}
          <div style={{ flex: '0 0 140px' }}>
            <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white', marginBottom: 12 }}>Explore</div>
            {[
              { to: '/deals',       label: 'Deals' },
              { to: '/events',      label: 'Events' },
              { to: '/search',      label: 'Businesses' },
              { to: '/order',       label: 'Order Food' },
              { to: '/marketplace', label: 'Marketplace' },
              { to: '/services',    label: 'Bookings' },
              { to: '/roommates',   label: 'Accommodations' },
              { to: '/radio',       label: 'Radio' },
            ].map((l) => (
              <div key={l.to} style={{ marginBottom: 8 }}>
                <Link to={l.to} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                >{l.label}</Link>
              </div>
            ))}
          </div>

          {/* Community links */}
          <div style={{ flex: '0 0 140px' }}>
            <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white', marginBottom: 12 }}>Community</div>
            {[
              { to: '/local-info',   label: 'Local Info' },
              { to: '/adda',         label: 'Community' },
              { to: '/connections',  label: 'Organizations' },
              { to: '/live',         label: 'Live & Streams' },
              { to: '/add-business', label: '🏪 List your business' },
              { to: '/about',        label: 'Our Story' },
            ].map((l) => (
              <div key={l.to} style={{ marginBottom: 8 }}>
                <Link to={l.to} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                >{l.label}</Link>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 12, display: 'block' }}>
              © {new Date().getFullYear()} DesiZoom. Built in Little Elm, Texas by a father and son.
            </span>
            {/* Stripe looks for these during account activation, and a stated
                refund policy is what makes a chargeback defensible. */}
            <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
              {[
                { to: '/about',   label: 'Our Story' },
              { to: '/terms',   label: 'Terms' },
                { to: '/privacy', label: 'Privacy' },
                { to: '/refunds', label: 'Refunds' },
              ].map((l) => (
                <Link key={l.to} to={l.to} style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <a href="mailto:info@desizoom.com" style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>info@desizoom.com</a>
        </div>
      </div>
    </footer>
  );
}
