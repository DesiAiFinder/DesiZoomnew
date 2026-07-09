import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchPosts, fetchEvents, fetchMarketplace } from '../services/supabase';
import DealCard from '../components/DealCard';
import RadioWidget from '../components/RadioWidget';
import WeatherWidget from '../components/WeatherWidget';
import PostModal from '../components/PostModal';
import type { Post } from '../types';
import { CITIES, DESI_FESTIVALS } from '../config/env';

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

export default function Home() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { city, setCity } = useLocation();
  const { user } = useAuth();
  const [feed, setFeed] = useState<Post[]>([]);
  const [events, setEvents] = useState<Post[]>([]);
  const [market, setMarket] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [votedIds, setVotedIds] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem('dz_votes') || '[]'))
  );
  const festival = getNextFestival();

  const load = async () => {
    setLoading(true);
    const [f, e, m] = await Promise.all([
      fetchPosts(city).catch(() => []),
      fetchEvents(city).catch(() => []),
      fetchMarketplace(city).catch(() => []),
    ]);
    setFeed(f as Post[]);
    setEvents(e as Post[]);
    setMarket(m as Post[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [city]);

  const handleVote = (id: string) => {
    setVotedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('dz_votes', JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <>
      {/* Festival strip */}
      <div className="festival">
        🪔 {festival.name} is in {festival.days} days — get your listing posted before the rush!
      </div>

      {/* Hero — text + weather + CTA only, no radio */}
      <div className="hero">
        <div className="hero-glow-a" />
        <div className="hero-glow-b" />

        <div style={{ position: 'relative', flex: '1 1 340px', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.1, margin: 0 }}>
            Everything Desi.<br />
            <span style={{ color: 'var(--accent)' }}>Deals, rooms, events</span> — one zoom.
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(220,225,240,0.9)', margin: 0 }}>
            Find restaurant deals, post a roommate ad, catch the local mela, search Indian businesses, or tune into desi radio — all from your city.
          </p>

          <WeatherWidget />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/search" className="btn-primary" style={{ textDecoration: 'none', fontSize: 14, padding: '10px 20px' }}>
              🔍 Find Businesses
            </Link>
            <button className="btn-ghost" onClick={() => user ? setPostOpen(true) : onAuthOpen()} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: 14 }}>
              + Post
            </button>
            <Link to="/radio" className="btn-ghost" style={{ textDecoration: 'none', background: 'rgba(224,120,32,0.15)', color: '#f5a85a', border: '1px solid rgba(224,120,32,0.3)', fontSize: 14, padding: '10px 16px' }}>
              📻 Radio
            </Link>
          </div>
        </div>
      </div>

      {/* Category tiles — 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '28px 32px 8px' }}>
        {[
          { to: '/search',      icon: '🔍', label: 'Find Businesses', sub: 'Grocery, restaurants, temples & more',       bg: 'var(--accent-soft)', textColor: 'var(--accent-text)' },
          { to: '/deals',       icon: '🏷️', label: 'Deals',           sub: 'Live deals from desi shops & restaurants',   bg: '#fff3e0',            textColor: '#b84d00' },
          { to: '/marketplace', icon: '🛍️', label: 'Marketplace',     sub: 'Vehicles, services, jobs, matrimony & more', bg: 'var(--pink-soft)',   textColor: 'var(--pink-text)' },
          { to: '/events',      icon: '🎉', label: 'Events',           sub: 'Melas, garba nights, temple calendars',      bg: 'var(--blue-soft)',   textColor: 'var(--blue-text)' },
          { to: '/roommates',   icon: '🏠', label: 'Roommates',        sub: 'Post or find a room, no fees',               bg: 'var(--navy)',        textColor: 'white' },
          { to: '/local-info',  icon: '🏛️', label: 'Local Info',      sub: 'Utilities, emergency contacts & more',       bg: '#edfaf1',            textColor: '#1a6e3c' },
        ].map((t) => (
          <Link key={t.to} to={t.to} className="tile" style={{ background: t.bg, textDecoration: 'none' }}>
            <div style={{ fontSize: 28 }}>{t.icon}</div>
            <h3 style={{ fontSize: 16, color: t.textColor, marginTop: 4 }}>{t.label}</h3>
            <div style={{ fontSize: 12.5, color: t.textColor, opacity: 0.72, lineHeight: 1.4 }}>{t.sub}</div>
          </Link>
        ))}
      </div>

      {/* City chips */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 32px 0', overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none' }}>
        {CITIES.map((c) => (
          <span key={c} className={`chip ${c === city ? 'active' : ''}`} onClick={() => setCity(c)} style={{ flexShrink: 0 }}>{c}</span>
        ))}
      </div>

      {/* Desi Radio strip */}
      <div style={{ margin: '20px 32px 0', borderRadius: 16, background: 'linear-gradient(120deg,#1c1000,#2a1800)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e07820', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📻 Desi Radio</div>
            <div style={{ fontSize: 12, color: 'rgba(220,200,160,0.7)', marginTop: 2 }}>Live South Asian radio stations</div>
          </div>
          <Link to="/radio" style={{ fontSize: 12.5, fontWeight: 600, color: '#f5a85a', textDecoration: 'none' }}>See all →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          <RadioWidget />
        </div>
      </div>

      {/* Main 3-col layout */}
      <div style={{ display: 'flex', gap: 24, padding: '20px 32px 48px', flexWrap: 'wrap' }}>
        {/* Left: categories */}
        <div style={{ flex: '0 0 210px' }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 10 }}>Categories</h3>
          {[
            { label: '🛍️ All Posts', type: '' },
            { label: '🏷️ Deals', type: 'deal' },
            { label: '🛍️ Marketplace', type: 'marketplace' },
            { label: '🏠 Roommates', type: 'roommate' },
          ].map((c) => (
            <div
              key={c.type}
              onClick={() => fetchPosts(city, c.type || undefined).then((d) => setFeed(d as Post[]))}
              style={{ display: 'flex', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, cursor: 'pointer', marginBottom: 2 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {c.label}
            </div>
          ))}
        </div>

        {/* Middle: feed */}
        <div style={{ flex: '2 1 460px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 19 }}>Trending in {city}</h2>
            <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>+ Post</button>
          </div>

          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14 }}>
                  <div className="skeleton" style={{ width: 88, height: 88 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ height: 18, width: '60%' }} />
                    <div className="skeleton" style={{ height: 13, width: '80%' }} />
                    <div className="skeleton" style={{ height: 13, width: '40%' }} />
                  </div>
                </div>
              ))
            : feed.length === 0
              ? <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>No posts yet in {city}. Be the first to post!</div>
              : feed.map((p) => (
                  <DealCard key={p.id} post={p} voted={votedIds.has(p.id)} onVoteToggle={handleVote} onAuthNeeded={onAuthOpen} />
                ))
          }
        </div>

        {/* Right: events */}
        <div style={{ flex: '0 0 250px' }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 10 }}>Upcoming Events</h3>
          {events.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 12 }}>No events yet.</div>
            : events.map((e) => {
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
      <div style={{ padding: '8px 32px 40px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: 19 }}>Marketplace</h2>
          <Link to="/marketplace" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>View all →</Link>
        </div>
        {market.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛍️</div>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>No marketplace listings in {city} yet.</p>
            <Link to="/marketplace" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              + List something
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
            {market.slice(0, 6).map((m) => (
              <div key={m.id} className="mkt-card">
                <div className="mkt-thumb" style={{ background: 'var(--pink-soft)' }}>
                  🛍️
                  <span className="badge-cat">{m.category || 'Item'}</span>
                </div>
                <div style={{ padding: '11px', display: 'flex', flexDirection: 'column', gap: 4 }}>
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
