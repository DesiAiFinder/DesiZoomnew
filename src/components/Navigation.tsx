import { useState } from 'react';
import { Link, useLocation as useRouterLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { CITIES } from '../config/env';
import { RADIUS_OPTIONS } from '../services/geo';

interface Props {
  onAuthOpen: () => void;
  onSearch: (q: string) => void;
}

export default function Navigation({ onAuthOpen, onSearch }: Props) {
  const { user, signOut, isAdmin } = useAuth();
  const { city, setCity, detectedCity, radius, setRadius } = useLocation();
  const routerLoc = useRouterLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [search, setSearch] = useState('');

  const radiusLabel = RADIUS_OPTIONS.find((o) => o.mi === radius)?.label
    ?? (radius > 0 ? `${radius} miles` : 'This city');

  // Primary pill-nav row — shown on every page (doubles as quick access + nav)
  const pillLinks = [
    { to: '/deals',       icon: '🏷️', label: 'Deals' },
    { to: '/events',      icon: '🎉', label: 'Events' },
    { to: '/search',      icon: '🔍', label: 'Businesses' },
    { to: '/order',       icon: '🍛', label: 'Order Food' },
    { to: '/marketplace', icon: '🛍️', label: 'Marketplace' },
    { to: '/services',    icon: '🛠️', label: 'Bookings' },
    { to: '/live',        icon: '🔴', label: 'Live' },
  ];

  // Secondary links grouped under the "More" dropdown
  const moreLinks = [
    { to: '/roommates',     label: '🏘️ Rooms' },
    { to: '/adda',          label: '💬 Community' },
    { to: '/connections',   label: '🤝 Organizations' },
    { to: '/local-info',    label: '🏛️ Local Info' },
    { to: '/my-restaurant', label: '🍽️ My Restaurant' },
    { to: '/radio',         label: '📻 Radio' },
  ];

  // Mobile hamburger holds only the secondary links (pills are visible on mobile too)
  const navLinks = [
    ...moreLinks,
    ...(user ? [{ to: '/messages', label: '💬 Messages' }] : []),
    ...(user ? [{ to: '/profile', label: '👤 My Profile' }] : []),
    ...(isAdmin ? [{ to: '/admin', label: '🔐 Admin' }] : []),
  ];

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Account';
  const isGPS = !!(detectedCity && city === detectedCity);
  const moreActive = moreLinks.some((l) => l.to === routerLoc.pathname);

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
        @keyframes navLivePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (min-width: 769px) { .show-mobile { display: none !important; } }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          /* Search drops to its own full-width line under the logo */
          .nav-search { order: 10; flex: 1 1 100% !important; max-width: none !important; }
          /* Pill nav stays visible on mobile, slightly tighter */
          .nav-pills { padding: 0 14px 8px !important; gap: 5px !important; }
          .nav-pills a, .nav-pills button { padding: 5px 10px !important; font-size: 11.5px !important; }
          .nav-row1 { padding: 10px 14px !important; }
        }
      `}</style>

      <header style={{
        display: 'flex', flexDirection: 'column',
        borderBottom: '1px solid var(--border)',
        background: 'white', position: 'sticky', top: 0, zIndex: 30,
      }}>
        {/* ── Row 1: utility (logo · search · city · messages · auth) ── */}
        <div className="nav-row1" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', flexWrap: 'wrap' }}>
          {/* Logo */}
          <Link to="/" style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--text)', textDecoration: 'none', flexShrink: 0 }}>
            Desi<span style={{ color: 'var(--accent)' }}>Zoom</span>
          </Link>

          {/* Search — wider, primary (full-width line on mobile) */}
          <div className="nav-search" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 360, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '0 13px', height: 36 }}>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(search); }}
              placeholder="Search deals, food, businesses…"
              style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', background: 'transparent', fontSize: 13, outline: 'none', color: 'var(--text)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'nowrap' }}>
            {/* Messages icon (compact) */}
            {user && (
              <Link
                to="/messages"
                className="hidden-mobile"
                title="Messages"
                aria-label="Messages"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8, textDecoration: 'none', fontSize: 16,
                  border: '1px solid var(--border)',
                  background: routerLoc.pathname === '/messages' ? 'var(--accent-soft)' : 'white',
                }}
              >💬</Link>
            )}

            {/* City picker */}
            <div style={{ position: 'relative' }}>
              <button
                className={`nav-city-pill ${isGPS ? 'gps' : 'manual'}`}
                onClick={() => setCityOpen((o) => !o)}
              >
                {isGPS ? <><span className="gps-dot" />{city} ▾</> : <>📍 {city} ▾</>}
              </button>

              {cityOpen && (
                <div className="city-dropdown">
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
                    </>
                  )}
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

            {/* Radius picker */}
            <div className="hidden-mobile" style={{ position: 'relative' }}>
              <button
                className="nav-city-pill manual"
                onClick={() => setRadiusOpen((o) => !o)}
                title="How far to search"
              >
                🔘 {radiusLabel} ▾
              </button>
              {radiusOpen && (
                <>
                  <div onClick={() => setRadiusOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
                  <div className="city-dropdown" style={{ minWidth: 150 }}>
                    {RADIUS_OPTIONS.map((o) => (
                      <div
                        key={o.mi}
                        className={`city-opt ${o.mi === radius ? 'active' : ''}`}
                        onClick={() => { setRadius(o.mi); setRadiusOpen(false); }}
                      >
                        {o.label}
                        {o.mi === radius && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Auth */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link to="/profile" className="hidden-mobile" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>👋 {displayName}</Link>
                <button className="btn-ghost hidden-mobile" onClick={signOut} style={{ border: '1px solid var(--border)', fontSize: 12 }}>Sign out</button>
              </div>
            ) : (
              <button className="btn-ghost hidden-mobile" onClick={onAuthOpen} style={{ border: '1px solid var(--border)', fontSize: 12 }}>Sign in</button>
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
        </div>

        {/* ── Row 2: pill nav (all screen sizes) ── */}
        <div className="nav-pills" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 24px 9px', flexWrap: 'wrap' }}>
          {pillLinks.map((l) => {
            const active = routerLoc.pathname === l.to;
            const isLive = l.to === '/live';
            return (
              <Link
                key={l.to} to={l.to}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 13px', borderRadius: 20, fontSize: 12.5,
                  fontWeight: active ? 700 : 600, textDecoration: 'none', whiteSpace: 'nowrap',
                  background: active ? 'var(--accent)' : 'white',
                  color: active ? 'white' : 'var(--text)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {isLive
                  ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? 'white' : '#dc2626', display: 'inline-block', animation: 'navLivePulse 1.5s infinite' }} />
                  : <span style={{ fontSize: 14 }}>{l.icon}</span>}
                {l.label}
              </Link>
            );
          })}

          {/* More dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setCommOpen((o) => !o)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                padding: '6px 13px', borderRadius: 20, fontSize: 12.5, fontFamily: 'inherit',
                fontWeight: moreActive ? 700 : 600, whiteSpace: 'nowrap',
                background: moreActive ? 'var(--accent-soft)' : 'white',
                color: moreActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                border: `1px solid ${moreActive ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              More {commOpen ? '▴' : '▾'}
            </button>
            {commOpen && (
              <>
                <div onClick={() => setCommOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 6, zIndex: 50, boxShadow: '0 8px 24px rgba(60,40,20,0.14)', minWidth: 200 }}>
                  {moreLinks.map((l) => (
                    <Link
                      key={l.to} to={l.to}
                      onClick={() => setCommOpen(false)}
                      style={{
                        display: 'block', padding: '9px 12px', fontSize: 13, borderRadius: 8, textDecoration: 'none',
                        color: routerLoc.pathname === l.to ? 'var(--accent-text)' : 'var(--text)',
                        background: routerLoc.pathname === l.to ? 'var(--accent-soft)' : 'transparent',
                        fontWeight: routerLoc.pathname === l.to ? 700 : 500,
                      }}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid var(--border)', padding: '10px 20px 14px' }}>
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

            {/* Auth in mobile menu */}
            <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              {user ? (
                <button className="btn-ghost" onClick={() => { signOut(); setMenuOpen(false); }} style={{ border: '1px solid var(--border)', fontSize: 13, width: '100%' }}>Sign out</button>
              ) : (
                <button className="btn-ghost" onClick={() => { onAuthOpen(); setMenuOpen(false); }} style={{ border: '1px solid var(--border)', fontSize: 13, width: '100%' }}>Sign in</button>
              )}
            </div>

            {/* GPS status */}
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

      {/* Backdrop to close city dropdown */}
      {cityOpen && <div onClick={() => setCityOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />}
    </>
  );
}
