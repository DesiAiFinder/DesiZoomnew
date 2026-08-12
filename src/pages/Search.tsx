import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { loadGoogleMaps, searchNearbyPlaces } from '../services/googlePlaces';
import { geocodeCity } from '../services/geo';
import { supabase } from '../services/supabase';
import PlaceCard from '../components/PlaceCard';
import type { Business, Location } from '../types';
import { env, BUSINESS_CATEGORIES, OCCASIONS, detectOccasion } from '../config/env';
import type { Occasion } from '../config/env';

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

interface VendorGroup { icon: string; label: string; results: Business[]; }

interface DzBusiness {
  id: string; name: string; business_type: string; city: string;
  description?: string; logo_url?: string;
}

// Which business types take orders vs bookings
const FOOD_TYPES = ['restaurant', 'grocery'];

const TYPE_ICON: Record<string, string> = {
  restaurant: '🍛', grocery: '🛒', catering: '🍽️', photo: '📸',
  priest: '🕉️', beauty: '💄', venue: '🏛️', other: '🏪',
};

export default function Search() {
  const [params] = useSearchParams();
  const { geoLocation, city, nearbyCities } = useLocation();
  const urlQuery = params.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [activeCategory, setActiveCategory] = useState<typeof BUSINESS_CATEGORIES[0] | null>(
    urlQuery ? null : BUSINESS_CATEGORIES[0]
  );
  const [results, setResults] = useState<Business[]>([]);
  const [groups, setGroups] = useState<VendorGroup[]>([]);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [dzBusinesses, setDzBusinesses] = useState<DzBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    if (!env.googlePlacesKey) return;
    loadGoogleMaps(env.googlePlacesKey)
      .then(() => setMapsReady(true))
      .catch(() => setError('Google Maps failed to load. Check your API key.'));
  }, []);

  /**
   * Centre point for a Places search.
   *
   * Was `geoLocation || CITY_COORDS[city]` — and CITY_COORDS only ever held the
   * eight cities from the original hardcoded list. Once GPS detection started
   * putting people in their real city (Little Elm, Frisco, The Colony…), there
   * was no centre point, so no search ran and occasion results came back empty.
   *
   * Now falls through to geocodeCity, which handles any city and caches the
   * answer in localStorage. CITY_COORDS stays only as an instant-answer cache
   * for the common cases.
   */
  const getLocation = async (): Promise<Location | null> =>
    geoLocation || CITY_COORDS[city] || (await geocodeCity(city));

  const clearAll = () => { setResults([]); setGroups([]); setOccasion(null); setDzBusinesses([]); };

  // ── Occasion search: fan out into vendor categories ────────────────────────
  const doOccasionSearch = async (occ: Occasion, loc: Location) => {
    setOccasion(occ);
    setResults([]);

    // 1) Our own onboarded businesses that fit this occasion (they can be booked)
    const wantedTypes = [...new Set(occ.vendors.map((v) => v.key))];
    const { data: biz } = await supabase
      .from('businesses')
      .select('id,name,business_type,city,description,logo_url')
      .eq('is_active', true)
      .in('business_type', wantedTypes)
      .in('city', nearbyCities.length ? nearbyCities : [city])
      .limit(12);
    setDzBusinesses((biz as DzBusiness[]) ?? []);

    // 2) Google results, one query per vendor category
    const found = await Promise.all(
      occ.vendors.map(async (v) => {
        const res = await searchNearbyPlaces(loc, v.query).catch(() => [] as Business[]);
        return { icon: v.icon, label: v.label, results: res.slice(0, 4) };
      })
    );
    setGroups(found.filter((g) => g.results.length > 0));
  };

  const doSearch = async (categoryQuery?: string) => {
    const loc = await getLocation();
    if (!loc) { setError(`Couldn't work out where ${city} is. Try picking a different city.`); setLoading(false); return; }
    if (!mapsReady) { setError('Maps API not ready.'); return; }
    setLoading(true);
    setError('');
    clearAll();
    try {
      const q = categoryQuery || query || activeCategory?.query || BUSINESS_CATEGORIES[0].query;

      // Only free-text searches (not category chips) can be an occasion
      const occ = categoryQuery ? null : detectOccasion(q);
      if (occ) {
        await doOccasionSearch(occ, loc);
      } else {
        const data = await searchNearbyPlaces(loc, q);
        setResults(data);
        if (data.length === 0) setError(`No results found near ${city}. Try expanding your search.`);
      }
    } catch {
      setError('Search failed. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!mapsReady) return;
    if (activeCategory) doSearch(activeCategory.query);
    else if (query) doSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, geoLocation, activeCategory, city]);

  const runQuery = (q: string) => { setQuery(q); setActiveCategory(null); doSearch(q); };
  const hasOccasionResults = occasion && (groups.length > 0 || dzBusinesses.length > 0);

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#1a3a2a,#0f2219)' }}>
        <div className="eyebrow">🔍 Business Search</div>
        <h1>Find Desi Businesses Near You</h1>
        <p>Grocery stores, restaurants, temples, travel agents &amp; services, powered by Google Maps</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setActiveCategory(null); doSearch(query); } }}
            placeholder='Try "wedding", "birthday party", "griha pravesh", or "patel brothers"…'
            style={{ flex: 1, minWidth: 200, height: 44, border: '1px solid var(--border)', borderRadius: 10, padding: '0 16px', fontSize: 14 }}
          />
          <button className="btn-primary" style={{ padding: '0 24px', height: 44, fontSize: 14 }} onClick={() => { setActiveCategory(null); doSearch(query); }}>
            Search
          </button>
        </div>

        {/* Plan an occasion */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Planning something?</span>
          {OCCASIONS.filter((o) => o.id !== 'party').map((o) => (
            <span
              key={o.id}
              onClick={() => runQuery(o.label)}
              style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                border: `1px solid ${occasion?.id === o.id ? 'var(--accent)' : 'var(--border)'}`,
                background: occasion?.id === o.id ? 'var(--accent-soft)' : 'white',
                color: occasion?.id === o.id ? 'var(--accent-text)' : 'var(--text)',
                fontWeight: occasion?.id === o.id ? 700 : 500,
              }}
            >
              {o.icon} {o.label.charAt(0).toUpperCase() + o.label.slice(1)}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {BUSINESS_CATEGORIES.map((c) => (
            <span
              key={c.key}
              className={`chip ${activeCategory?.key === c.key ? 'active' : ''}`}
              onClick={() => { setQuery(''); clearAll(); setActiveCategory(c); }}
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

        {/* Occasion banner */}
        {occasion && !loading && (
          <div style={{ background: '#fff8e6', border: '1px solid #f0d090', borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#854f0b' }}>
              {occasion.icon} Planning a {occasion.label} in {city}?
            </div>
            <div style={{ fontSize: 12.5, color: '#854f0b', marginTop: 3 }}>{occasion.blurb}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {occasion.vendors.map((v) => (
                <span key={v.label} style={{ fontSize: 11, background: 'white', border: '1px solid #ecdcb4', borderRadius: 20, padding: '3px 10px' }}>
                  {v.icon} {v.label}
                </span>
              ))}
            </div>
          </div>
        )}

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
          : hasOccasionResults ? (
            <>
              {/* Our own businesses first — these can be booked/ordered here */}
              {dzBusinesses.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>⭐ On DesiZoom <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>· book &amp; pay here</span></h3>
                  {dzBusinesses.map((b) => {
                    const isFood = FOOD_TYPES.includes(b.business_type);
                    return (
                      <Link
                        key={b.id}
                        to={isFood ? '/order' : '/services'}
                        style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 14px', background: 'white', border: '1px solid var(--accent)', borderRadius: 12, marginBottom: 8, textDecoration: 'none', color: 'var(--text)' }}
                      >
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', flexShrink: 0 }}>
                          {b.logo_url ? <img src={b.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (TYPE_ICON[b.business_type] || '🏪')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                            {b.name}{' '}
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#e8f9ee', color: '#128c4b', padding: '1px 7px', borderRadius: 20 }}>✓ Verified</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.city}{b.description ? ` · ${b.description}` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, background: isFood ? '#ef9f27' : 'var(--accent)', color: isFood ? '#412402' : 'white', whiteSpace: 'nowrap' }}>
                          {isFood ? 'Order' : 'Book'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Google results grouped by vendor type */}
              {groups.map((g) => (
                <div key={g.label} style={{ marginBottom: 22 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>
                    {g.icon} {g.label} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>· {g.results.length} nearby</span>
                  </h3>
                  {g.results.map((b) => <PlaceCard key={b.id} business={b} />)}
                </div>
              ))}
            </>
          ) : (
            results.map((b) => <PlaceCard key={b.id} business={b} />)
          )
        }

        {!loading && results.length === 0 && !hasOccasionResults && !error && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p>Pick a category, or tell us what you're planning — a wedding, birthday, or griha pravesh.</p>
          </div>
        )}
      </div>
    </>
  );
}
