import { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchForYou, fetchEvents, fetchMarketplace, fetchCityToday } from '../services/supabase';
import DealCard from '../components/DealCard';
import WeatherWidget from '../components/WeatherWidget';
import PostModal from '../components/PostModal';
import DesiNews from '../components/DesiNews';
import type { Post } from '../types';
import { CITIES, DESI_FESTIVALS, RADIO_STATIONS } from '../config/env';

interface OutletCtx { onAuthOpen: () => void; }

function getNextFestival() {
  const now = new Date();
  const year = now.getFullYear();
  for (const f of DESI_FESTIVALS) {
    const d = new Date(year, f.month - 1, f.day);
    const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
    if (diff >= 0) return { name: f.name, days: diff };
  }
  const f = DESI_FESTIVALS[0];
  const d = new Date(year + 1, f.month - 1, f.day);
  return { name: f.name, days: Math.ceil((d.getTime() - now.getTime()) / 86400000) };
}

const STATION_COLORS = ['#3d0d7a','#0a3a7a','#7a2a0a','#0a5a2a','#6a1a50','#1a3a6a','#1a5a2a','#5a3a1a'];

export default function Home() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { city, setCity, nearbyCities } = useLocation();
  const { user } = useAuth();
  const [feed, setFeed] = useState<Post[]>([]);
  const [events, setEvents] = useState<Post[]>([]);
  const [market, setMarket] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [votedIds, setVotedIds] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem('dz_votes') || '[]'))
  );
  const [playing, setPlaying] = useState<number | null>(null);
  const [feedFilter, setFeedFilter] = useState('all');
  const [today, setToday] = useState<Awaited<ReturnType<typeof fetchCityToday>> | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const festival = getNextFestival();

  // Time-based greeting for the hero
  const hour = new Date().getHours();
  const greetWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.user_metadata?.display_name?.split(' ')[0] || user?.email?.split('@')[0];

  const load = async () => {
    setLoading(true);
    const [f, e, m, t] = await Promise.all([
      fetchForYou(nearbyCities).catch(() => []),
      fetchEvents(nearbyCities).catch(() => []),
      fetchMarketplace(nearbyCities).catch(() => []),
      fetchCityToday(nearbyCities).catch(() => null),
    ]);
    setFeed(f as Post[]);
    setEvents(e as Post[]);
    setMarket(m as Post[]);
    setToday(t);
    setLoading(false);
  };

  useEffect(() => { load(); }, [nearbyCities]);

  const handleVote = (id: string) => {
    setVotedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('dz_votes', JSON.stringify([...next]));
      return next;
    });
  };

  const toggleStation = (i: number) => {
    const audio = audioRef.current!;
    if (playing === i) { audio.pause(); setPlaying(null); return; }
    const station = RADIO_STATIONS[i];
    if (!station.src) return;
    audio.src = station.src;
    audio.play().catch(() => {});
    setPlaying(i);
  };

  const nowPlaying = playing !== null ? RADIO_STATIONS[playing] : null;

  // "Your city today" hero cards — each shows only when it has real data
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  type TCard = { key: string; k: string; kc: string; t: string; m: string; to: string };
  const todayCards: TCard[] = [];
  if (today) {
    if (today.live.length)
      todayCards.push({ key: 'live', k: '🔴 LIVE NOW', kc: '#ff9a9a', t: today.live[0].title, m: today.live.length > 1 ? `+${today.live.length - 1} more streaming` : 'Watching now', to: '/live' });
    if (today.events.length)
      todayCards.push({ key: 'event', k: '🎉 UPCOMING', kc: '#9cc9ff', t: today.events[0].title, m: fmtDate(today.events[0].event_date), to: '/events' });
    if (today.restaurants.length)
      todayCards.push({ key: 'food', k: '🍛 OPEN FOR PICKUP', kc: '#ffd699', t: today.restaurants.length > 1 ? `${today.restaurants[0].name} +${today.restaurants.length - 1} more` : today.restaurants[0].name, m: 'Order now →', to: '/order' });
    if (today.deals.length)
      todayCards.push({ key: 'deal', k: '🏷️ HOT DEAL', kc: '#93f0cb', t: today.deals[0].title, m: today.deals.length > 1 ? `+${today.deals.length - 1} more deals` : 'Grab it →', to: '/deals' });
  }
  const hasToday = todayCards.length > 0;

  return (
    <>
      <style>{`
        @keyframes livePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        /* ── Mobile overrides ─────────────────────────────── */
        @media (max-width: 768px) {
          .home-hero          { flex-direction: column !important; min-height: unset !important; }
          .hero-left          { padding: 20px 18px !important; }
          /* Radio: full-width scrollable strip below hero content on mobile */
          .hero-radio-sidebar {
            flex: unset !important;
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.07) !important;
            max-height: 240px !important;
            overflow-y: auto !important;
            padding: 14px 16px !important;
          }
          .category-grid      { padding: 12px 16px 6px !important; gap: 7px !important; }
          .city-chips         { padding: 10px 16px 0 !important; }
          .home-main          { flex-direction: column !important; padding: 16px 16px 32px !important; gap: 16px !important; }
          .home-categories-col{ display: none !important; }
          .home-events-col    { display: none !important; }
          .home-feed-col      { flex: unset !important; width: 100% !important; }
          .home-marketplace   { padding: 8px 16px 32px !important; }
          .mkt-grid           { grid-template-columns: repeat(2,1fr) !important; }
          .festival           { font-size: 12px !important; padding: 8px 14px !important; }
          .hero-description   { display: none !important; }
          .hero-quicklinks    { display: none !important; }
          .hero-search-row    { flex-wrap: wrap !important; }
          .hero-search-row .search-btn { flex: 1 !important; min-width: 0 !important; }
        }
      `}</style>

      {/* Festival strip */}
      <div className="festival">
        🪔 {festival.name} is in {festival.days} days — get your listing posted before the rush!
      </div>

      {/* Hero */}
      <div className="home-hero" style={{ display: 'flex', background: 'linear-gradient(135deg,#3d1509 55%,#5c2410)', minHeight: 210 }}>

        {/* Left */}
        <div className="hero-left" style={{ flex: 1, padding: '24px 36px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          {/* Greeting (signed in) or badge (guest) */}
          {firstName ? (
            <div style={{ fontSize: 15, color: '#fac775', fontWeight: 700, textTransform: 'capitalize' }}>
              {greetWord}, {firstName} 👋
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(224,120,32,0.15)', border: '1px solid rgba(224,120,32,0.3)', borderRadius: 20, padding: '5px 14px', width: 'fit-content' }}>
              <span style={{ width: 7, height: 7, background: '#ef9f27', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: '#f5a85a', fontWeight: 600 }}>Your city. Your community.</span>
            </div>
          )}

          {/* Headline */}
          <div>
            <div style={{ fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 700, color: '#fff', lineHeight: 1.15 }}>Everything Desi.</div>
            <div style={{ fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 700, lineHeight: 1.15 }}>
              <span style={{ color: '#fac775' }}>Food, deals, services & events</span>
              <span style={{ color: '#fff' }}> — one zoom.</span>
            </div>
          </div>

          <div className="hero-description" style={{ fontSize: 13.5, color: 'rgba(240,220,200,0.72)', lineHeight: 1.55, maxWidth: 500 }}>
            Order pickup from desi restaurants, book a priest or caterer, grab local deals, buy & sell, find a room, catch events & live streams — all for your city.
          </div>

          <WeatherWidget />

          {/* Hero action buttons — search now lives in the header */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => user ? setPostOpen(true) : onAuthOpen()}
              style={{ background: '#ef9f27', color: '#412402', fontSize: 13.5, fontWeight: 700, padding: '0 20px', height: 44, borderRadius: 10, border: 'none', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}
            >
              + Post
            </button>
            <Link
              to="/live"
              style={{ background: 'rgba(220,38,38,0.9)', color: 'white', fontSize: 13.5, fontWeight: 700, padding: '0 18px', height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'livePulse 1.5s infinite' }} />
              Go Live
            </Link>
          </div>
        </div>

        {/* Center: "Your city today" cards — fill the space, hide when empty */}
        {hasToday && (
          <div className="hero-today" style={{ flex: '1.3 1 300px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'center', padding: '20px 10px' }}>
            {todayCards.map(c => (
              <Link
                key={c.key} to={c.to}
                style={{ display: 'block', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(250,199,117,0.18)', borderRadius: 12, padding: '11px 12px', textDecoration: 'none' }}
              >
                <div style={{ fontSize: 9.5, fontWeight: 700, color: c.kc, letterSpacing: '0.03em' }}>{c.k}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fbeee0', marginTop: 5, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.t}</div>
                <div style={{ fontSize: 10.5, color: 'rgba(240,220,200,0.55)', marginTop: 3 }}>{c.m}</div>
              </Link>
            ))}
          </div>
        )}

        {/* Right: Radio sidebar — hidden on mobile */}
        <div className="hero-radio-sidebar" style={{ flex: '0 0 220px', background: 'rgba(0,0,0,0.35)', borderLeft: '1px solid rgba(255,255,255,0.07)', padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fac775', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📻 Desi Radio</div>
            <Link to="/radio" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>All →</Link>
          </div>

          {RADIO_STATIONS.slice(0, 5).map((s, i) => (
            <div
              key={i}
              onClick={() => toggleStation(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, marginBottom: 5, background: playing === i ? 'rgba(224,120,32,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${playing === i ? 'rgba(224,120,32,0.4)' : 'transparent'}`, cursor: 'pointer' }}
            >
              <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: playing === i ? '#ef9f27' : STATION_COLORS[i % STATION_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white' }}>
                {playing === i ? '⏸' : '▶'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: playing === i ? 700 : 400, color: playing === i ? '#fff' : 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontSize: 9.5, color: 'rgba(200,200,200,0.45)', marginTop: 1 }}>{s.lang}</div>
              </div>
              {playing === i && (
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14, flexShrink: 0 }}>
                  {[6, 14, 9].map((h, b) => <div key={b} style={{ width: 3, borderRadius: 2, background: '#ef9f27', height: h }} />)}
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {RADIO_STATIONS.length > 5
              ? <Link to="/radio" style={{ fontSize: 11, color: '#fac775', fontWeight: 600, textAlign: 'center', display: 'block', textDecoration: 'none' }}>+ {RADIO_STATIONS.length - 5} more stations →</Link>
              : <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>Live 24/7 South Asian radio</div>}
          </div>
        </div>
      </div>

      {/* Now-playing bar (shows below hero when a station is active) */}
      {nowPlaying && (
        <div style={{ background: '#3d1509', borderBottom: '1px solid rgba(239,159,39,0.3)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: STATION_COLORS[playing! % STATION_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>📻</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowPlaying.name} — Now Playing</div>
            <div style={{ fontSize: 11, color: 'rgba(200,200,200,0.5)' }}>{nowPlaying.lang} · Live 24/7</div>
          </div>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14, marginRight: 8 }}>
            {[6, 14, 9, 12].map((h, b) => <div key={b} style={{ width: 3, borderRadius: 2, background: '#ef9f27', height: h }} />)}
          </div>
          <div onClick={() => { audioRef.current?.pause(); setPlaying(null); }} style={{ width: 32, height: 32, borderRadius: '50%', background: '#ef9f27', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>⏸</div>
        </div>
      )}

      <audio ref={audioRef} preload="none" />

      {/* City chips */}
      <div className="city-chips" style={{ display: 'flex', gap: 8, padding: '12px 32px 0', overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none' }}>
        {CITIES.map(c => (
          <span key={c} className={`chip ${c === city ? 'active' : ''}`} onClick={() => setCity(c)} style={{ flexShrink: 0 }}>{c}</span>
        ))}
      </div>

      {/* Desi News strip */}
      <DesiNews />

      {/* Main 3-col layout */}
      <div className="home-main" style={{ display: 'flex', gap: 24, padding: '20px 32px 48px', flexWrap: 'wrap' }}>

        {/* Left: quick links — hidden on mobile */}
        <div className="home-categories-col" style={{ flex: '0 0 210px' }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 10 }}>Explore</h3>
          {[
            { to: '/services',    label: '🛠️ Book a service' },
            { to: '/adda',        label: '☕ Ask the community' },
            { to: '/connections', label: '🤝 Organizations' },
            { to: '/live',        label: '🔴 Live streams' },
            { to: '/local-info',  label: '🏛️ Local info' },
          ].map(c => (
            <Link
              key={c.to} to={c.to}
              style={{ display: 'block', padding: '9px 10px', fontSize: 13.5, borderRadius: 8, marginBottom: 2, color: 'var(--text)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{c.label}</Link>
          ))}
        </div>

        {/* Middle: For You feed */}
        <div className="home-feed-col" style={{ flex: '2 1 460px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 19 }}>For you in {city}</h2>
            <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>+ Post</button>
          </div>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              { key: 'all', label: '✨ All' },
              { key: 'deal', label: '🏷️ Deals' },
              { key: 'marketplace', label: '🛍️ For sale' },
              { key: 'roommate', label: '🏘️ Rooms' },
              { key: 'event', label: '🎉 Events' },
              { key: 'question', label: '☕ Adda' },
            ].map((f) => (
              <span key={f.key} className={`chip ${feedFilter === f.key ? 'active' : ''}`} style={{ fontSize: 12 }} onClick={() => setFeedFilter(f.key)}>{f.label}</span>
            ))}
          </div>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14 }}>
                  <div className="skeleton" style={{ width: 88, height: 88 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ height: 18, width: '60%' }} />
                    <div className="skeleton" style={{ height: 13, width: '80%' }} />
                  </div>
                </div>
              ))
            : (() => {
                const shown = feedFilter === 'all' ? feed : feed.filter((p) => p.type === feedFilter);
                return shown.length === 0
                  ? <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>Nothing here yet in {city}. Be the first to post!</div>
                  : shown.map(p => <DealCard key={p.id} post={p} voted={votedIds.has(p.id)} onVoteToggle={handleVote} onAuthNeeded={onAuthOpen} />);
              })()
          }
        </div>

        {/* Right: events — hidden on mobile */}
        <div className="home-events-col" style={{ flex: '0 0 250px' }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 10 }}>Upcoming Events</h3>
          {events.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 12 }}>No events yet.</div>
            : events.map(e => {
                const d = e.event_date ? new Date(e.event_date) : new Date(e.created_at);
                return (
                  <div key={e.id} className="event-card">
                    <div className="event-date">
                      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' }}>{d.toLocaleString('en-US', { month: 'short' })}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{e.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{e.description}</div>
                    </div>
                  </div>
                );
              })
          }
          <Link to="/events" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-text)', display: 'block', marginTop: 8 }}>View all events →</Link>
        </div>
      </div>

      {/* Marketplace preview */}
      <div className="home-marketplace" style={{ padding: '8px 32px 40px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: 19 }}>Marketplace</h2>
          <Link to="/marketplace" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>View all →</Link>
        </div>
        {market.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛍️</div>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>No marketplace listings in {city} yet.</p>
            <Link to="/marketplace" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>+ List something</Link>
          </div>
        ) : (
          <div className="mkt-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
            {market.slice(0, 6).map(m => (
              <div key={m.id} className="mkt-card">
                <div className="mkt-thumb" style={{ background: 'var(--pink-soft)' }}>🛍️<span className="badge-cat">{m.category || 'Item'}</span></div>
                <div style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{m.price || '—'}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{m.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {postOpen && <PostModal onClose={() => { setPostOpen(false); load(); }} />}
    </>
  );
}
