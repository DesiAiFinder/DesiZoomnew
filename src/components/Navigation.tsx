import { useState } from 'react';
import { Link, useLocation as useRouterLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { CITIES } from '../config/env';

interface Props {
  onAuthOpen: () => void;
  onSearch: (q: string) => void;
}

export default function Navigation({ onAuthOpen, onSearch }: Props) {
  const { user, signOut, isAdmin } = useAuth();
  const { city, setCity, detectedCity } = useLocation();
  const routerLoc = useRouterLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [search, setSearch] = useState('');

  const navLinks = [
    { to: '/search',      label: 'Businesses' },
    { to: '/deals',       label: 'Deals' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/roommates',   label: 'Accommodations' },
    { to: '/events',      label: 'Events' },
    { to: '/local-info',  label: 'Local Info' },
    { to: '/services',    label: '🛠️ Services' },
    { to: '/adda',        label: '☕ Adda' },
    { to: '/connections', label: '🤝 Connections' },
    { to: '/live',        label: '🔴 Live' },
    { to: '/radio',       label: '📻 Radio' },
    { to: '/messages',    label: '💬 Messages' },
    ...(isAdmin ? [{ to: '/admin', label: '🔐 Admin' }] : []),
  ];

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Account';

  // Is the currently selected city the GPS-detected one?
  const isGPS = !!(detectedCity && city === detectedCity);

  return (
    <>
      <style>{`
        .nav-city-pill {
          display: flex; align-items: center; gap: 6px;
          height: 30px; padding: 0 11px; border-radius: 20px; cursor: pointer;
          font-size: 12px; font-weight: 600; white-space: nowrap;
          transition: opacity 0.15s; flex-shrink: 0;
        }
        .nav-city-pill.gps  { background: #fff3e0; color: #b84d00; border: 1px solid #e07820; }
        .nav-city-pill.manual { background: white; color: var(--text); border: 1px solid var(--border); }
        .gps-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
        .city-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: white; border: 1px solid var(--border);
          border-radius: 12px; padding: 6px; z-index: 50;
          box-shadow: 0 8px 24px rgba(28,35,64,0.12); min-width: 210px;
        }
        .city-opt {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; font-size: 13px; border-radius: 8px; cursor: pointer;
        }
        .city-opt:hover { background: #f5f5f5; }
        .city-opt.active { background: #fff3e0; color: #b84d00; font-weight: 700; }
        .gps-badge {
          margin-left: auto; font-size: 9px; font-weight: 700; padding: 2px 6px;
          border-radius: 10px; background: #dcfce7; color: #166534; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .dd-div { border: none; border-top: 1px solid var(--border); margin: 4px 0; }
        .dd-sec { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; padding: 4px 10px 2px; }
        @media (min-width: 769px) { .show-mobile { display: none !important; } }
        @media (max-width: 768px) { .hidden-mobile { display: none !important; } }
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'white', position: 'sticky', top: 0, zIndex: 30,
        flexWrap: 'wrap', gap: '8px',
      }}>
        {/* Logo */}
        <Link to="/" style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--text)', textDecoration: 'none', flexShrink: 0 }}>
          Desi<span style={{ color: 'var(--accent)' }}>Zoom</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden-mobile" style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 500, flexWrap: 'wrap' }}>
          {navLinks.map((l) => (
            <Link
              key={l.to} to={l.to}
              style={{
                color: routerLoc.pathname === l.to ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none', fontWeight: routerLoc.pathname === l.to ? 700 : 500,
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
          {/* Desktop search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(search); }}
            placeholder="Search…"
            className="hidden-mobile"
            style={{ width: 180, height: 32, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, background: 'var(--bg)', outline: 'none' }}
          />

          {/* ── City picker ─────────────────────────────── */}
          <div style={{ position: 'relative' }}>
            <button
              className={`nav-city-pill ${isGPS ? 'gps' : 'manual'}`}
              onClick={() => setCityOpen((o) => !o)}
            >
              {isGPS ? <><span className="gps-dot" />{city} ▾</> : <>📍 {city} ▾</>}
            </button>

            {cityOpen && (
              <div className="city-dropdown">
                {/* GPS city pinned at top */}
                {detectedCity && (
                  <>
                    <div
                      className={`city-opt ${city === detectedCity ? 'active' : ''}`}
                      onClick={() => { setCity(detectedCity); setCityOpen(false); }}
                    >
                      <span className="gps-dot" />
                      {detectedCity}
                      <span className="gps-badge">GPS</span>
                    </div>
                    <div className="dd-div" />
                    <div className="dd-sec">All cities</div>
                  </>
                )}

                {/* Preset cities */}
                {CITIES.map((c) => (
                  <div
                    key={c}
                    className={`city-opt ${c === city && c !== detectedCity ? 'active' : ''}`}
                    onClick={() => { setCity(c); setCityOpen(false); }}
                  >
                    {c}
                    {c === city && c !== detectedCity && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auth */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="hidden-mobile" style={{ fontSize: 13, fontWeight: 600 }}>👋 {displayName}</span>
              <button className="btn-ghost" onClick={signOut} style={{ border: '1px solid var(--border)', fontSize: 12 }}>Sign out</button>
            </div>
          ) : (
            <button className="btn-ghost" onClick={onAuthOpen} style={{ border: '1px solid var(--border)', fontSize: 12 }}>Sign in</button>
          )}

          {/* Hamburger */}
          <button
            className="show-mobile"
            onClick={() => setMenuOpen((o) => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: '0 2px' }}
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* ── Mobile menu ─────────────────────────────── */}
        {menuOpen && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { onSearch(search); setMenuOpen(false); } }}
              placeholder="Search…"
              style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, background: 'var(--bg)', marginBottom: 6, boxSizing: 'border-box' as const }}
            />

            {navLinks.map((l) => (
              <Link
                key={l.to} to={l.to}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '11px 10px', fontSize: 14, fontWeight: 500, display: 'block',
                  color: routerLoc.pathname === l.to ? 'var(--accent)' : 'var(--text)',
                  borderRadius: 8, textDecoration: 'none',
                  background: routerLoc.pathname === l.to ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                {l.label}
              </Link>
            ))}

            {/* GPS status in mobile menu */}
            {detectedCity && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#f0fdf4', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span className="gps-dot" />
                <span style={{ color: '#166534' }}>GPS: <strong>{detectedCity}</strong></span>
                {city !== detectedCity && (
                  <span
                    onClick={() => { setCity(detectedCity); setMenuOpen(false); }}
                    style={{ marginLeft: 'auto', color: '#e07820', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Use this
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Backdrop to close dropdown */}
      {cityOpen && <div onClick={() => setCityOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />}
    </>
  );
}
