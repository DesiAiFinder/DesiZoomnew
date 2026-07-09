import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchPosts } from '../services/supabase';
import { loadGoogleMaps, searchNearbyPlaces } from '../services/googlePlaces';
import DealCard from '../components/DealCard';
import PlaceCard from '../components/PlaceCard';
import PostModal from '../components/PostModal';
import type { Post, Business, Location } from '../types';
import { CITIES, env } from '../config/env';

interface OutletCtx { onAuthOpen: () => void; }

const CITY_COORDS: Record<string, Location> = {
  'Edison, NJ':       { lat: 40.5187, lng: -74.4121 },
  'Jersey City, NJ':  { lat: 40.7178, lng: -74.0431 },
  'Fremont, CA':      { lat: 37.5485, lng: -121.9886 },
  'Chicago, IL':      { lat: 41.8781, lng: -87.6298 },
  'Houston, TX':      { lat: 29.7604, lng: -95.3698 },
  'Atlanta, GA':      { lat: 33.7490, lng: -84.3880 },
  'Dallas, TX':       { lat: 32.7767, lng: -96.7970 },
  'Los Angeles, CA':  { lat: 34.0522, lng: -118.2437 },
};

const DEAL_CATS = ['All', 'Food', 'Travel', 'Shopping', 'Services', 'Entertainment'];

const NEARBY_QUERIES = [
  { label: '🍛 Indian Restaurants', query: 'Indian restaurant biryani' },
  { label: '🛒 Grocery Stores',     query: 'Indian grocery store' },
  { label: '🍬 Sweet Shops',        query: 'Indian sweet shop mithai' },
  { label: '🍕 Desi Fast Food',     query: 'desi halal food' },
];

export default function Deals() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { city, geoLocation } = useLocation();
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');
  const [postOpen, setPostOpen] = useState(false);
  const [votedIds, setVotedIds] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem('dz_votes') || '[]'))
  );

  const [nearby, setNearby] = useState<Business[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [activeQuery, setActiveQuery] = useState(NEARBY_QUERIES[0]);
  const [nearbyError, setNearbyError] = useState('');

  useEffect(() => {
    if (!env.googlePlacesKey) return;
    loadGoogleMaps(env.googlePlacesKey).then(() => setMapsReady(true)).catch(() => {});
  }, []);

  const loadPosts = async () => {
    setPostsLoading(true);
    const data = await fetchPosts(city, 'deal', search || undefined).catch(() => []);
    setPosts(data as Post[]);
    setPostsLoading(false);
  };

  useEffect(() => { loadPosts(); }, [city, search]);

  useEffect(() => {
    if (!mapsReady) return;
    const loc = geoLocation || CITY_COORDS[city];
    if (loc) loadNearby(activeQuery.query, loc);
  }, [mapsReady, geoLocation, activeQuery, city]);

  const loadNearby = async (query: string, loc: Location) => {
    setNearbyLoading(true);
    setNearbyError('');
    try {
      const results = await searchNearbyPlaces(loc, query);
      setNearby(results);
      if (results.length === 0) setNearbyError('No results found nearby.');
    } catch {
      setNearbyError('Could not load nearby places.');
    }
    setNearbyLoading(false);
  };

  const filtered = activeCat === 'All'
    ? posts
    : posts.filter((p) => p.category?.toLowerCase() === activeCat.toLowerCase());

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
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#2a1800,#1c1000)' }}>
        <div className="eyebrow">🏷️ Deals</div>
        <h1>Desi Deals & Offers</h1>
        <p>Real deals from nearby restaurants & stores, plus community-posted offers.</p>
      </div>

      <div style={{ display: 'flex', gap: 24, padding: '24px 32px 48px', flexWrap: 'wrap' }}>

        {/* Sidebar */}
        <div style={{ flex: '0 0 210px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 8 }}>City</div>
            <select value={city} onChange={() => {}} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 8 }}>Category</div>
            {DEAL_CATS.map((c) => (
              <div
                key={c}
                onClick={() => setActiveCat(c)}
                style={{
                  padding: '8px 10px', fontSize: 13.5, borderRadius: 8,
                  cursor: 'pointer', marginBottom: 2,
                  background: activeCat === c ? 'var(--accent-soft)' : 'transparent',
                  color: activeCat === c ? 'var(--accent-text)' : 'var(--text)',
                  fontWeight: activeCat === c ? 700 : 400,
                }}
              >{c}</div>
            ))}
          </div>
        </div>

        {/* Main feed */}
        <div style={{ flex: '1 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Near You */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 18 }}>📍 Near You</h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {NEARBY_QUERIES.map((q) => (
                  <span
                    key={q.query}
                    className={`chip ${activeQuery.query === q.query ? 'active' : ''}`}
                    style={{ fontSize: 11.5 }}
                    onClick={() => setActiveQuery(q)}
                  >{q.label}</span>
                ))}
              </div>
            </div>

            {!env.googlePlacesKey ? (
              <div style={{ padding: '14px 16px', background: '#fff8e6', border: '1px solid #f0d090', borderRadius: 10, fontSize: 13 }}>
                ⚠️ Add <code>VITE_GOOGLE_PLACES_API_KEY</code> to <code>.env.local</code> to show nearby businesses.
              </div>
            ) : (!geoLocation && !CITY_COORDS[city]) ? (
              <div style={{ padding: '14px 16px', background: 'var(--blue-soft)', border: '1px solid #c8d8f0', borderRadius: 10, fontSize: 13 }}>
                📍 Allow location access in your browser to see deals near you.
              </div>
            ) : nearbyLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 10 }}>
                  <div className="skeleton" style={{ width: 72, height: 72 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ height: 16, width: '50%' }} />
                    <div className="skeleton" style={{ height: 12, width: '70%' }} />
                  </div>
                </div>
              ))
            ) : nearbyError ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{nearbyError}</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                  Showing {nearby.length} places near {city} — call or visit their website for current deals & offers.
                </div>
                {nearby.map((b) => (
                  <div key={b.id} style={{ marginBottom: 10 }}>
                    <PlaceCard business={b} />
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '2px dashed var(--border)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0 12px', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              COMMUNITY DEALS
            </span>
          </div>

          {/* Community Deals */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search community deals…"
                style={{ flex: 1, height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13 }}
              />
              <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>
                + Post Deal
              </button>
            </div>

            {postsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14 }}>
                    <div className="skeleton" style={{ width: 88, height: 88 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="skeleton" style={{ height: 18, width: '60%' }} />
                      <div className="skeleton" style={{ height: 13, width: '80%' }} />
                    </div>
                  </div>
                ))
              : filtered.length === 0
                ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 12 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>
                    <p style={{ margin: '0 0 12px' }}>No community deals in {city} yet.</p>
                    <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>
                      + Be the first to post a deal
                    </button>
                  </div>
                )
                : filtered.map((p) => (
                    <DealCard key={p.id} post={p} voted={votedIds.has(p.id)} onVoteToggle={handleVote} onAuthNeeded={onAuthOpen} />
                  ))
            }
          </div>
        </div>
      </div>

      {postOpen && <PostModal onClose={() => { setPostOpen(false); loadPosts(); }} defaultType="deal" />}
    </>
  );
}
