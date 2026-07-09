import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { loadGoogleMaps, searchNearbyPlaces } from '../services/googlePlaces';
import PlaceCard from '../components/PlaceCard';
import type { Business, Location } from '../types';
import { env, BUSINESS_CATEGORIES } from '../config/env';

// Fallback city coordinates when browser geolocation is denied
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

export default function Search() {
  const [params] = useSearchParams();
  const { geoLocation, city } = useLocation();
  const [query, setQuery] = useState(params.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(BUSINESS_CATEGORIES[0]);
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    if (!env.googlePlacesKey) return;
    loadGoogleMaps(env.googlePlacesKey)
      .then(() => setMapsReady(true))
      .catch(() => setError('Google Maps failed to load. Check your API key.'));
  }, []);

  const getLocation = (): Location | null =>
    geoLocation || CITY_COORDS[city] || null;

  const doSearch = async (categoryQuery?: string) => {
    const loc = getLocation();
    if (!loc) { setError('Location not available.'); return; }
    if (!mapsReady) { setError('Maps API not ready.'); return; }
    setLoading(true);
    setError('');
    try {
      const q = categoryQuery || query || activeCategory.query;
      const data = await searchNearbyPlaces(loc, q);
      setResults(data);
      if (data.length === 0) setError(`No results found near ${city}. Try expanding your search.`);
    } catch {
      setError('Search failed. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (mapsReady) doSearch(activeCategory.query);
  }, [mapsReady, geoLocation, activeCategory, city]);

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#1a3a2a,#0f2219)' }}>
        <div className="eyebrow">🔍 Business Search</div>
        <h1>Find Desi Businesses Near You</h1>
        <p>Grocery stores, restaurants, temples, travel agents & services — powered by Google Maps</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder='Search "biryani near me", "patel brothers"…'
            style={{ flex: 1, minWidth: 200, height: 44, border: '1px solid var(--border)', borderRadius: 10, padding: '0 16px', fontSize: 14 }}
          />
          <button className="btn-primary" style={{ padding: '0 24px', height: 44, fontSize: 14 }} onClick={() => doSearch()}>
            Search
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {BUSINESS_CATEGORIES.map((c) => (
            <span
              key={c.key}
              className={`chip ${activeCategory.key === c.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(c)}
            >
              {c.label}
            </span>
          ))}
        </div>

        {!env.googlePlacesKey && (
          <div style={{ padding: '16px 20px', background: '#fff8e6', border: '1px solid #f0d090', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
            ⚠️ Add <code>VITE_GOOGLE_PLACES_API_KEY</code> to your <code>.env.local</code> file to enable business search.
          </div>
        )}

        {error && <div style={{ color: 'var(--accent-text)', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12 }}>
                <div className="skeleton" style={{ width: 72, height: 72 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 18, width: '50%' }} />
                  <div className="skeleton" style={{ height: 13, width: '70%' }} />
                  <div className="skeleton" style={{ height: 13, width: '35%' }} />
                </div>
              </div>
            ))
          : results.map((b) => <PlaceCard key={b.id} business={b} />)
        }

        {!loading && results.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p>Select a category above to find nearby desi businesses.</p>
          </div>
        )}
      </div>
    </>
  );
}
