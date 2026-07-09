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
  const { user, signOut } = useAuth();
  const { city, setCity, detectedCity } = useLocation();
  const routerLoc = useRouterLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [search, setSearch] = useState('');

  const navLinks = [
    { to: '/search',      label: 'Businesses' },
    { to: '/deals',       label: 'Deals' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/roommates',   label: 'Roommates' },
    { to: '/events',      label: 'Events' },
    { to: '/local-info',  label: 'Local Info' },
    { to: '/radio',       label: '📻 Radio' },
  ];

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Account';

  // Build city list: preset cities + detected city if not already in list
  const cityList = detectedCity && !CITIES.includes(detectedCity)
    ? [detectedCity, ...CITIES]
    : CITIES;

  // Label shown in the button
  const cityLabel = city;

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 32px', borderBottom: '1px solid var(--border)',
      background: 'white', position: 'sticky', top: 0, zIndex: 30,
      flexWrap: 'wrap', gap: '10px',
    }}>
      {/* Logo */}
      <Link to="/" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--text)', textDecoration: 'none' }}>
        Desi<span style={{ color: 'var(--accent)' }}>Zoom</span>
      </Link>

      {/* Desktop nav */}
      <nav style={{ display: 'flex', gap: 18, fontSize: 13.5, fontWeight: 500 }} className="hidden-mobile">
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

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(search); }}
          placeholder="Search…"
          style={{
            width: 200, height: 34, border: '1px solid var(--border)', borderRadius: 8,
            padding: '0 12px', fontSize: 13, background: 'var(--bg)', outline: 'none',
          }}
          className="hidden-mobile"
        />

        {/* City picker */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setCityOpen((o) => !o)}
            style={{
              fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 20,
              padding: '6px 12px', background: 'white', cursor: 'pointer',
            }}
          >
            📍 {cityLabel} ▾
          </button>
          {cityOpen && (
            <div style={{
              position: 'absolute', top: '110%', right: 0,
              background: 'white', border: '1px solid var(--border)',
              borderRadius: 12, padding: 8, zIndex: 50,
              boxShadow: '0 8px 24px rgba(28,35,64,0.12)', minWidth: 200,
            }}>
              {detectedCity && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', padding: '4px 12px 6px' }}>
                    Your Location
                  </div>
                  <div
                    onClick={() => { setCity(detectedCity); setCityOpen(false); }}
                    style={{
                      padding: '8px 12px', fontSize: 13, borderRadius: 8,
                      cursor: 'pointer', fontWeight: city === detectedCity ? 700 : 500,
                      color: city === detectedCity ? 'var(--accent-text)' : 'var(--text)',
                      background: city === detectedCity ? 'var(--accent-soft)' : '#f8fff8',
                      marginBottom: 4,
                    }}
                  >
                    📍 {detectedCity}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 6px' }} />
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', padding: '0 12px 6px' }}>
                    All Cities
                  </div>
                </>
              )}
              {CITIES.map((c) => (
                <div
                  key={c}
                  onClick={() => { setCity(c); setCityOpen(false); }}
                  style={{
                    padding: '8px 12px', fontSize: 13, borderRadius: 8,
                    cursor: 'pointer', fontWeight: c === city ? 700 : 400,
                    color: c === city ? 'var(--accent-text)' : 'var(--text)',
                    background: c === city ? 'var(--accent-soft)' : 'transparent',
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auth */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>👋 {displayName}</span>
            <button className="btn-ghost" onClick={signOut} style={{ border: '1px solid var(--border)', fontSize: 12 }}>
              Sign out
            </button>
          </div>
        ) : (
          <button className="btn-ghost" onClick={onAuthOpen} style={{ border: '1px solid var(--border)' }}>
            Sign in
          </button>
        )}

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: '0 4px' }}
          className="show-mobile"
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          width: '100%', display: 'flex', flexDirection: 'column', gap: 4,
          borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4,
        }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { onSearch(search); setMenuOpen(false); } }}
            placeholder="Search…"
            style={{
              width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8,
              padding: '0 12px', fontSize: 13, background: 'var(--bg)', marginBottom: 4,
            }}
          />
          {navLinks.map((l) => (
            <Link
              key={l.to} to={l.to}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '10px 8px', fontSize: 14, fontWeight: 500,
                color: routerLoc.pathname === l.to ? 'var(--accent)' : 'var(--text)',
                borderRadius: 8,
                background: routerLoc.pathname === l.to ? 'var(--accent-soft)' : 'transparent',
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (min-width: 769px) { .show-mobile { display: none !important; } }
        @media (max-width: 768px) { .hidden-mobile { display: none !important; } }
      `}</style>
    </header>
  );
}
