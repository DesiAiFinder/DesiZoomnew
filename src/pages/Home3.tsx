import { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchPosts, fetchEvents, fetchMarketplace } from '../services/supabase';
import DealCard from '../components/DealCard';
import WeatherWidget from '../components/WeatherWidget';
import PostModal from '../components/PostModal';
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
  const [playing, setPlaying] = useState<number | null>(null);
  const [radioFilter, setRadioFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const festival = getNextFestival();

  const dfwStations = RADIO_STATIONS.filter(s => s.group === 'DFW');
  const nationalStations = RADIO_STATIONS.filter(s => s.group === 'National');

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

  const toggleStation = (i: number) => {
    const audio = audioRef.current!;
    if (playing === i) {
      audio.pause();
      setPlaying(null);
      return;
    }
    const station = RADIO_STATIONS[i];
    if (!station.src) return;
    audio.src = station.src;
    audio.play().catch(() => {});
    setPlaying(i);
  };

  const nowPlaying = playing !== null ? RADIO_STATIONS[playing] : null;

  return (
    <>
      {/* Festival strip */}
      <div className="festival">
        🪔 {festival.name} is in {festival.days} days — get your listing posted before the rush!
      </div>

      {/* Hero — Option C: text left, radio sidebar right */}
      <div style={{ display: 'flex', background: 'linear-gradient(135deg,#0d1526 60%,#1c1000)', minHeight: 280 }}>

        {/* Left: headline + search + links */}
        <div style={{ flex: 1, padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(224,120,32,0.15)', border: '1px solid rgba(224,120,32,0.3)', borderRadius: 20, padding: '5px 14px', width: 'fit-content' }}>
            <span style={{ width: 7, height: 7, background: '#e07820', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#f5a85a', fontWeight: 600 }}>Your city. Your community.</span>
          </div>

          {/* Headline */}
          <div>
            <div style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: '#fff', lineHeight: 1.15 }}>Everything Desi.</div>
            <div style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, lineHeight: 1.15 }}>
              <span style={{ color: '#e07820' }}>Deals, rooms, events</span>
              <span style={{ color: '#fff' }}> — one zoom.</span>
            </div>
          </div>

          <div style={{ fontSize: 14, color: 'rgba(210,220,240,0.7)', lineHeight: 1.65, maxWidth: 480 }}>
            Browse desi restaurant deals, find a roommate, score event tickets, discover Indian businesses nearby, and tune into live desi radio — from your city or any city across the US.
          </div>

          <WeatherWidget />

          {/* Search bar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, padding: '0 16px', height: 44 }}>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>🔍</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && searchQuery) window.location.href = `/search?q=${searchQuery}`; }}
                placeholder="Search deals, businesses, roommates…"
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: 13, flex: 1 }}
              />
            </div>
            <Link
              to={searchQuery ? `/search?q=${searchQuery}` : '/search'}
              style={{ background: '#e07820', color: 'white', fontSize: 13, fontWeight: 700, padding: '0 20px', height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              🔍 Search
            </Link>
            <button
              onClick={() => user ? setPostOpen(true) : onAuthOpen()}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, padding: '0 16px', height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              + Post
            </button>
          </div>

          {/* Quick links */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { to: '/search', label: '🔍 Businesses' },
              { to: '/deals', label: '🏷️ Deals' },
              { to: '/marketplace', label: '🛍️ Marketplace' },
              { to: '/roommates', label: '🏠 Roommates' },
              { to: '/events', label: '🎉 Events' },
              { to: '/local-info', label: '🏛️ Local Info' },
            ].map(l => (
              <Link key={l.to} to={l.to} style={{ fontSize: 12, padding: '5px 11px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Radio sidebar */}
        <div style={{ flex: '0 0 220px', background: 'rgba(0,0,0,0.35)', borderLeft: '1px solid rgba(255,255,255,0.07)', padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e07820', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📻 Desi Radio</div>
            <Link to="/radio" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>All →</Link>
          </div>

          {RADIO_STATIONS.map((s, i) => (
            <div
              key={i}
              onClick={() => toggleStation(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, marginBottom: 5, background: playing === i ? 'rgba(224,120,32,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${playing === i ? 'rgba(224,120,32,0.4)' : 'transparent'}`, cursor: 'pointer' }}
            >
              <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: playing === i ? '#e07820' : STATION_COLORS[i % STATION_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white' }}>
                {playing === i ? '⏸' : '▶'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: playing === i ? 700 : 400, color: playing === i ? '#fff' : 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontSize: 9.5, color: 'rgba(200,200,200,0.45)', marginTop: 1 }}>{s.lang}</div>
              </div>
              {playing === i && (
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14, flexShrink: 0 }}>
                  {[6, 14, 9].map((h, b) => <div key={b} style={{ width: 3, borderRadius: 2, background: '#e07820', height: h }} />)}
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>Live 24/7 South Asian radio</div>
          </div>
        </div>
      </div>

      {/* Category tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, padding: '20px 32px 12px' }}>
        {[
          { to: '/search',      icon: '🔍', label: 'Businesses', bg: 'var(--accent-soft)', textColor: 'var(--accent-text)' },
          { to: '/deals',       icon: '🏷️', label: 'Deals',      bg: '#fff3e0',           textColor: '#b84d00' },
          { to: '/marketplace', icon: '🛍️', label: 'Marketplace',bg: 'var(--pink-soft)',  textColor: 'var(--pink-text)' },
          { to: '/events',      icon: '🎉', label: 'Events',     bg: 'var(--blue-soft)',  textColor: 'var(--blue-text)' },
          { to: '/roommates',   icon: '🏠', label: 'Roommates',  bg: 'var(--navy)',       textColor: 'white' },
          { to: '/local-info',  icon: '🏛️', label: 'Local Info', bg: '#edfaf1',           textColor: '#1a6e3c' },
        ].map(t => (
          <Link key={t.to} to={t.to} className="tile" style={{ background: t.bg, textDecoration: 'none', padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>{t.icon}</div>
            <h3 style={{ fontSize: 13, color: t.textColor, marginTop: 6, marginBottom: 0 }}>{t.label}</h3>
          </Link>
        ))}
      </div>

      {/* City chips */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 32px 0', overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none' }}>
        {CITIES.map(c => (
          <span key={c} className={`chip ${c === city ? 'active' : ''}`} onClick={() => setCity(c)} style={{ flexShrink: 0 }}>{c}</span>
        ))}
      </div>

      {/* Radio section - full card grid */}
      <div style={{ margin: '16px 32px 0', borderRadius: 14, background: '#0d1526', overflow: 'hidden' }}>
        {/* Header + filters */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e07820', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📻 Desi Radio — Live Stations</div>
            <div style={{ fontSize: 11, color: 'rgba(210,220,240,0.45)', marginTop: 2 }}>Streaming 24/7 South Asian radio</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All', 'DFW', 'Hindi', 'Telugu', 'Online'].map(f => (
              <span
                key={f}
                onClick={() => setRadioFilter(f)}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${radioFilter === f ? '#e07820' : 'rgba(255,255,255,0.12)'}`, background: radioFilter === f ? 'rgba(224,120,32,0.2)' : 'transparent', color: radioFilter === f ? '#f5a85a' : 'rgba(255,255,255,0.5)' }}
              >{f}</span>
            ))}
          </div>
        </div>

        {/* DFW Stations */}
        {(radioFilter === 'All' || radioFilter === 'DFW' || radioFilter === 'Telugu' || radioFilter === 'Hindi') && dfwStations.length > 0 && (
          <div style={{ padding: '14px 20px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Dallas – Fort Worth</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
              {dfwStations.map((s, idx) => {
                const globalIdx = RADIO_STATIONS.indexOf(s);
                const isPlaying = playing === globalIdx;
                return (
                  <div key={idx} style={{ borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${isPlaying ? 'rgba(224,120,32,0.5)' : 'rgba(255,255,255,0.07)'}`, background: isPlaying ? 'rgba(224,120,32,0.06)' : 'rgba(255,255,255,0.03)' }} onClick={() => toggleStation(globalIdx)}>
                    <div style={{ height: 64, background: STATION_COLORS[globalIdx % STATION_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <span style={{ fontSize: 28, opacity: 0.3 }}>📻</span>
                      <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.45)', borderRadius: 10, padding: '2px 7px', fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{s.freq}</div>
                      {isPlaying && (
                        <div style={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
                          {[5, 12, 8].map((h, b) => <div key={b} style={{ width: 3, borderRadius: 2, background: '#e07820', height: h }} />)}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: isPlaying ? '#fff' : 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(200,200,200,0.45)', marginBottom: 8 }}>{s.lang}</div>
                      <div style={{ height: 26, borderRadius: 6, background: isPlaying ? '#e07820' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, color: 'white', fontWeight: 600 }}>
                        {isPlaying ? '⏸ Playing' : '▶ Play'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* National Stations */}
        {(radioFilter === 'All' || radioFilter === 'Online' || radioFilter === 'Hindi') && nationalStations.length > 0 && (
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>National / Online</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {nationalStations.map((s, idx) => {
                const globalIdx = RADIO_STATIONS.indexOf(s);
                const isPlaying = playing === globalIdx;
                return (
                  <div key={idx} style={{ borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${isPlaying ? 'rgba(224,120,32,0.5)' : 'rgba(255,255,255,0.07)'}`, background: isPlaying ? 'rgba(224,120,32,0.06)' : 'rgba(255,255,255,0.03)' }} onClick={() => toggleStation(globalIdx)}>
                    <div style={{ height: 64, background: STATION_COLORS[globalIdx % STATION_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <span style={{ fontSize: 28, opacity: 0.3 }}>📻</span>
                      <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.45)', borderRadius: 10, padding: '2px 7px', fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{s.freq}</div>
                      {isPlaying && (
                        <div style={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
                          {[5, 12, 8].map((h, b) => <div key={b} style={{ width: 3, borderRadius: 2, background: '#e07820', height: h }} />)}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: isPlaying ? '#fff' : 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(200,200,200,0.45)', marginBottom: 8 }}>{s.lang}</div>
                      <div style={{ height: 26, borderRadius: 6, background: isPlaying ? '#e07820' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, color: 'white', fontWeight: 600 }}>
                        {isPlaying ? '⏸ Playing' : '▶ Play'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Now playing bar */}
        {nowPlaying && (
          <div style={{ background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(224,120,32,0.25)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: STATION_COLORS[playing! % STATION_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>📻</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{nowPlaying.name} — Now Playing</div>
              <div style={{ fontSize: 11, color: 'rgba(200,200,200,0.5)' }}>{nowPlaying.lang} · Live 24/7</div>
            </div>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16, marginRight: 8 }}>
              {[7, 16, 10, 14].map((h, b) => <div key={b} style={{ width: 3, borderRadius: 2, background: '#e07820', height: h }} />)}
            </div>
            <div onClick={() => { audioRef.current?.pause(); setPlaying(null); }} style={{ width: 36, height: 36, borderRadius: '50%', background: '#e07820', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>⏸</div>
          </div>
        )}
      </div>

      <audio ref={audioRef} preload="none" />

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
          ].map(c => (
            <div
              key={c.type}
              onClick={() => fetchPosts(city, c.type || undefined).then(d => setFeed(d as Post[]))}
              style={{ display: 'flex', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, cursor: 'pointer', marginBottom: 2 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{c.label}</div>
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
                  </div>
                </div>
              ))
            : feed.length === 0
              ? <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>No posts yet in {city}. Be the first to post!</div>
              : feed.map(p => <DealCard key={p.id} post={p} voted={votedIds.has(p.id)} onVoteToggle={handleVote} onAuthNeeded={onAuthOpen} />)
          }
        </div>

        {/* Right: events */}
        <div style={{ flex: '0 0 250px' }}>
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
      <div style={{ padding: '8px 32px 40px', borderTop: '1px solid var(--border)' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
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
