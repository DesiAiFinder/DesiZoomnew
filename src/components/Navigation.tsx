import { useState, useEffect } from 'react';
import { Link, useLocation as useRouterLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { CITIES } from '../config/env';
import { RADIUS_OPTIONS } from '../services/geo';
import { supabase } from '../services/supabase';

interface Props {
  onAuthOpen: () => void;
  onSearch: (q: string) => void;
}

interface NavItem { to: string; label: string }
interface NavGroup { id: string; label: string; to?: string; items?: NavItem[] }

export default function Navigation({ onAuthOpen, onSearch }: Props) {
  const { user, signOut, isAdmin } = useAuth();
  const { city, setCity, detectedCity, radius, setRadius } = useLocation();
  const routerLoc = useRouterLocation();

  const [menuOpen, setMenuOpen] = useState(false);     // mobile drawer
  const [cityOpen, setCityOpen] = useState(false);
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [acctOpen, setAcctOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [hasBusiness, setHasBusiness] = useState(false);

  useEffect(() => {
    if (!user) { setHasBusiness(false); return; }
    supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
      .then(({ data }) => setHasBusiness(!!data), () => setHasBusiness(false));
  }, [user]);

  // Close any open menu when the route changes
  useEffect(() => {
    setOpenGroup(null);
    setAcctOpen(false);
    setMenuOpen(false);
  }, [routerLoc.pathname]);

  // ── The five categories ────────────────────────────────────────────────────
  const GROUPS: NavGroup[] = [
    { id: 'deals', label: 'Deals', to: '/deals' },
    {
      id: 'market', label: 'Marketplace',
      items: [
        { to: '/order',       label: '🍛 Order Food' },
        { to: '/marketplace', label: '🛍️ Buy & Sell' },
        { to: '/roommates',   label: '🏘️ Accommodations' },
        { to: '/search',      label: '🔍 Business directory' },
      ],
    },
    {
      id: 'services', label: 'Services',
      items: [
        { to: '/services',                          label: '🛠️ All services' },
        { to: '/services?cat=Priest %26 Pooja',      label: '🕉️ Priest & Pooja' },
        { to: '/services?cat=Catering',              label: '🍽️ Catering' },
        { to: '/services?cat=Photography %26 Video', label: '📸 Photography & Video' },
        { to: '/services?cat=Mehndi %26 Makeup',     label: '💄 Mehndi & Makeup' },
        { to: '/services?cat=Event Decor',           label: '🎪 Event Decor' },
        { to: '/services?tab=requests',              label: '🙋 Post a custom request' },
      ],
    },
    {
      id: 'whatson', label: "What's On",
      items: [
        { to: '/events', label: '🎉 Events & tickets' },
        { to: '/live',   label: '🔴 Live streams' },
        { to: '/movies', label: '🎬 Desi movies' },
        { to: '/radio',  label: '📻 Radio' },
      ],
    },
    {
      id: 'community', label: 'Community',
      items: [
        { to: '/adda',        label: '💬 Ask the community' },
        { to: '/connections', label: '🤝 Organizations' },
        { to: '/local-info',  label: '🏛️ Local info' },
      ],
    },
  ];

  // Items may carry query strings (e.g. /services?cat=Catering).
  // isCurrent = same path; isExact = same path AND same query (for highlighting).
  const isCurrent = (to: string) => to.split('?')[0] === routerLoc.pathname;
  const isExact = (to: string) => {
    const [path, query = ''] = to.split('?');
    return path === routerLoc.pathname &&
      decodeURIComponent(query) === decodeURIComponent(routerLoc.search.replace(/^\?/, ''));
  };
  const groupActive = (g: NavGroup) =>
    g.to ? isCurrent(g.to) : !!g.items?.some((i) => isCurrent(i.to));

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Account';
  const initial = displayName.charAt(0).toUpperCase();
  const isGPS = !!(detectedCity && city === detectedCity);
  const radiusLabel = RADIUS_OPTIONS.find((o) => o.mi === radius)?.label
    ?? (radius > 0 ? `${radius} miles` : 'This city');

  const bizLink = hasBusiness
    ? { to: '/my-business',  label: '🏪 My Business' }
    : { to: '/add-business', label: '🏪 List your business' };

  return (
    <>
      <style>{`
        .nav-city-pill {
          display: flex; align-items: center; gap: 6px;
          height: 30px; padding: 0 11px; border-radius: 20px; cursor: pointer;
          font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0;
        }
        .nav-city-pill.gps  { background: #fff3e0; color: #b84d00; border: 1px solid #e07820; }
        .nav-city-pill.manual { background: white; color: var(--text); border: 1px solid var(--border); }
        .gps-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
        .city-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: white; border: 1px solid var(--border);
          border-radius: 12px; padding: 6px; z-index: 60;
          box-shadow: 0 8px 24px rgba(28,35,64,0.12); min-width: 210px;
        }
        .city-opt { display: flex; align-items: center; gap: 8px; padding: 8px 10px; font-size: 13px; border-radius: 8px; cursor: pointer; }
        .city-opt:hover { background: #f5f5f5; }
        .city-opt.active { background: #fff3e0; color: #b84d00; font-weight: 700; }
        .gps-badge { margin-left: auto; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 10px; background: #dcfce7; color: #166534; text-transform: uppercase; }
        .dd-div { border: none; border-top: 1px solid var(--border); margin: 4px 0; }

        /* Top-level category links */
        .cat {
          position: relative; display: inline-flex; align-items: center; gap: 4px;
          font-size: 13.5px; font-weight: 600; color: var(--text); cursor: pointer;
          background: none; border: none; font-family: inherit; padding: 8px 2px;
          text-decoration: none; white-space: nowrap;
        }
        .cat.active { color: var(--accent); }
        .cat.active:after { content: ''; position: absolute; left: 2px; right: 2px; bottom: 2px; height: 2px; background: var(--accent); border-radius: 2px; }
        .cat-pop {
          position: absolute; top: calc(100% + 6px); left: 0; z-index: 60;
          background: white; border: 1px solid var(--border); border-radius: 12px;
          box-shadow: 0 12px 32px rgba(60,40,20,0.16); padding: 7px; min-width: 200px;
        }
        .cat-item { display: block; padding: 9px 12px; font-size: 13px; border-radius: 8px; text-decoration: none; color: var(--text); white-space: nowrap; }
        .cat-item:hover { background: var(--bg); }
        .cat-item.on { background: var(--accent-soft); color: var(--accent-text); font-weight: 700; }

        .avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; cursor: pointer; border: 2px solid #fac775; flex-shrink: 0; }

        @media (min-width: 981px) { .show-mobile { display: none !important; } }
        @media (max-width: 980px) {
          .hidden-mobile { display: none !important; }
          .nav-row { padding: 10px 14px !important; gap: 9px !important; }
          .nav-search { order: 10; flex: 1 1 100% !important; max-width: none !important; }
        }
      `}</style>

      <header style={{
        borderBottom: '1px solid var(--border)', background: 'white',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div className="nav-row" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '11px 24px', flexWrap: 'wrap' }}>
          {/* Logo */}
          <Link to="/" style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 21, color: 'var(--text)', textDecoration: 'none', flexShrink: 0, letterSpacing: '-0.3px' }}>
            Desi<span style={{ color: 'var(--accent)' }}>Zoom</span>
          </Link>

          {/* Search */}
          <div className="nav-search" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 230px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '0 13px', height: 34 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(search); }}
              placeholder="Search deals, food…"
              style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', background: 'transparent', fontSize: 12.5, outline: 'none', color: 'var(--text)' }}
            />
          </div>

          {/* Categories (desktop) */}
          <nav className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {GROUPS.map((g) => (
              g.to ? (
                <Link key={g.id} to={g.to} className={`cat ${groupActive(g) ? 'active' : ''}`}>{g.label}</Link>
              ) : (
                <div key={g.id} style={{ position: 'relative' }}>
                  <button
                    className={`cat ${groupActive(g) ? 'active' : ''}`}
                    onClick={() => setOpenGroup(openGroup === g.id ? null : g.id)}
                  >
                    {g.label} <span style={{ fontSize: 9, opacity: 0.7 }}>{openGroup === g.id ? '▲' : '▼'}</span>
                  </button>
                  {openGroup === g.id && (
                    <>
                      <div onClick={() => setOpenGroup(null)} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
                      <div className="cat-pop">
                        {g.items!.map((i) => (
                          <Link
                            key={i.to} to={i.to}
                            onClick={() => setOpenGroup(null)}
                            className={`cat-item ${isExact(i.to) ? 'on' : ''}`}
                          >
                            {i.label}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            ))}
          </nav>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {/* City */}
            <div style={{ position: 'relative' }}>
              <button className={`nav-city-pill ${isGPS ? 'gps' : 'manual'}`} onClick={() => setCityOpen((o) => !o)}>
                {isGPS ? <><span className="gps-dot" />{city} ▾</> : <>📍 {city} ▾</>}
              </button>
              {cityOpen && (
                <>
                  <div onClick={() => setCityOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
                  <div className="city-dropdown">
                    {detectedCity && (
                      <>
                        <div className={`city-opt ${city === detectedCity ? 'active' : ''}`} onClick={() => { setCity(detectedCity); setCityOpen(false); }}>
                          <span className="gps-dot" />{detectedCity}<span className="gps-badge">GPS</span>
                        </div>
                        <div className="dd-div" />
                      </>
                    )}
                    {CITIES.map((c) => (
                      <div key={c} className={`city-opt ${c === city && c !== detectedCity ? 'active' : ''}`} onClick={() => { setCity(c); setCityOpen(false); }}>
                        {c}{c === city && c !== detectedCity && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Radius */}
            <div className="hidden-mobile" style={{ position: 'relative' }}>
              <button className="nav-city-pill manual" onClick={() => setRadiusOpen((o) => !o)} title="How far to search">
                🔘 {radiusLabel} ▾
              </button>
              {radiusOpen && (
                <>
                  <div onClick={() => setRadiusOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
                  <div className="city-dropdown" style={{ minWidth: 150 }}>
                    {RADIUS_OPTIONS.map((o) => (
                      <div key={o.mi} className={`city-opt ${o.mi === radius ? 'active' : ''}`} onClick={() => { setRadius(o.mi); setRadiusOpen(false); }}>
                        {o.label}{o.mi === radius && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            {user && (
              <Link to="/messages" className="hidden-mobile" title="Messages" aria-label="Messages"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, textDecoration: 'none', fontSize: 15, border: '1px solid var(--border)', background: routerLoc.pathname === '/messages' ? 'var(--accent-soft)' : 'white', flexShrink: 0 }}
              >💬</Link>
            )}

            {/* Account */}
            {user ? (
              <div style={{ position: 'relative' }}>
                <button className="avatar" onClick={() => setAcctOpen((o) => !o)} title={displayName} aria-label="Account menu">{initial}</button>
                {acctOpen && (
                  <>
                    <div onClick={() => setAcctOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
                    <div className="city-dropdown" style={{ minWidth: 205, padding: 7 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', padding: '4px 10px 5px', textTransform: 'uppercase' }}>{displayName}</div>
                      <Link to="/profile" onClick={() => setAcctOpen(false)} className="cat-item">👤 My profile</Link>
                      <Link to={bizLink.to} onClick={() => setAcctOpen(false)} className="cat-item" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', fontWeight: 700 }}>{bizLink.label}</Link>
                      <Link to="/messages" onClick={() => setAcctOpen(false)} className="cat-item">💬 Messages</Link>
                      {isAdmin && <Link to="/admin" onClick={() => setAcctOpen(false)} className="cat-item">🔐 Admin</Link>}
                      <div className="dd-div" />
                      <button onClick={() => { signOut(); setAcctOpen(false); }} className="cat-item" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--muted)' }}>Sign out</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button className="btn-ghost hidden-mobile" onClick={onAuthOpen} style={{ border: '1px solid var(--border)', fontSize: 12 }}>Sign in</button>
            )}

            {/* Hamburger */}
            <button className="show-mobile" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 21, padding: '0 2px' }}
            >{menuOpen ? '✕' : '☰'}</button>
          </div>
        </div>

        {/* ── Mobile drawer ── */}
        {menuOpen && (
          <div className="show-mobile" style={{ borderTop: '1px solid var(--border)', padding: '10px 16px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {GROUPS.map((g) => (
              g.to ? (
                <Link key={g.id} to={g.to} onClick={() => setMenuOpen(false)}
                  style={{ padding: '11px 12px', fontSize: 14.5, fontWeight: 700, borderRadius: 10, textDecoration: 'none', border: '1px solid var(--border)', color: groupActive(g) ? 'var(--accent-text)' : 'var(--text)', background: groupActive(g) ? 'var(--accent-soft)' : 'white' }}
                >{g.label}</Link>
              ) : (
                <div key={g.id}>
                  <button
                    onClick={() => setMobileGroup(mobileGroup === g.id ? null : g.id)}
                    style={{ width: '100%', textAlign: 'left', padding: '11px 12px', fontSize: 14.5, fontWeight: 700, borderRadius: 10, border: '1px solid var(--border)', background: mobileGroup === g.id ? 'var(--bg)' : 'white', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' }}
                  >
                    {g.label}<span style={{ float: 'right', fontSize: 11, color: 'var(--muted)' }}>{mobileGroup === g.id ? '▲' : '▼'}</span>
                  </button>
                  {mobileGroup === g.id && (
                    <div style={{ padding: '4px 0 4px 12px' }}>
                      {g.items!.map((i) => (
                        <Link key={i.to} to={i.to} onClick={() => setMenuOpen(false)}
                          style={{ display: 'block', padding: '9px 12px', fontSize: 13.5, borderRadius: 8, textDecoration: 'none', color: routerLoc.pathname === i.to ? 'var(--accent)' : 'var(--text)' }}
                        >{i.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            ))}

            <div className="dd-div" style={{ margin: '8px 0 4px' }} />
            <Link to={bizLink.to} onClick={() => setMenuOpen(false)}
              style={{ padding: '11px 12px', fontSize: 14, fontWeight: 700, borderRadius: 10, textDecoration: 'none', border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-text)' }}
            >{bizLink.label}</Link>
            {user && <Link to="/profile" onClick={() => setMenuOpen(false)} style={{ padding: '11px 12px', fontSize: 14, borderRadius: 10, textDecoration: 'none', color: 'var(--text)' }}>👤 My profile</Link>}
            {user && <Link to="/messages" onClick={() => setMenuOpen(false)} style={{ padding: '11px 12px', fontSize: 14, borderRadius: 10, textDecoration: 'none', color: 'var(--text)' }}>💬 Messages</Link>}
            {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} style={{ padding: '11px 12px', fontSize: 14, borderRadius: 10, textDecoration: 'none', color: 'var(--text)' }}>🔐 Admin</Link>}

            {/* Radius on mobile */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {RADIUS_OPTIONS.map((o) => (
                <span key={o.mi} onClick={() => setRadius(o.mi)}
                  style={{ fontSize: 11.5, padding: '5px 11px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${o.mi === radius ? 'var(--accent)' : 'var(--border)'}`, background: o.mi === radius ? 'var(--accent-soft)' : 'white', color: o.mi === radius ? 'var(--accent-text)' : 'var(--text)', fontWeight: o.mi === radius ? 700 : 500 }}
                >{o.label}</span>
              ))}
            </div>

            <div style={{ marginTop: 10 }}>
              {user
                ? <button className="btn-ghost" onClick={() => { signOut(); setMenuOpen(false); }} style={{ border: '1px solid var(--border)', fontSize: 13, width: '100%' }}>Sign out</button>
                : <button className="btn-ghost" onClick={() => { onAuthOpen(); setMenuOpen(false); }} style={{ border: '1px solid var(--border)', fontSize: 13, width: '100%' }}>Sign in</button>}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
