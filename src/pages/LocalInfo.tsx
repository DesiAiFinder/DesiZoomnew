import { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { fetchLocalInfo } from '../services/supabase';
import { loadGoogleMaps, searchNearbyPlaces } from '../services/googlePlaces';
import PlaceCard from '../components/PlaceCard';
import { env } from '../config/env';
import type { LocalInfo, Business, Location } from '../types';

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  utility:         { icon: '⚡', label: 'Utilities',          color: '#fff8e6' },
  emergency:       { icon: '🚨', label: 'Emergency',          color: '#fff0ee' },
  government:      { icon: '🏛️', label: 'Government',        color: '#eef4ff' },
  trash_recycling: { icon: '♻️', label: 'Trash & Recycling', color: '#efffee' },
  city_info:       { icon: '🏙️', label: 'City Info',         color: '#f5f0ff' },
};

// Auto-populated civic services searched near the user's GPS location
const AUTO_SERVICES = [
  { label: '🏛️ City Hall & Government', query: 'city hall' },
  { label: '🚓 Police Department',       query: 'police department' },
  { label: '🚒 Fire Station',            query: 'fire station' },
  { label: '🏥 Urgent Care & Hospitals', query: 'urgent care hospital' },
  { label: '📮 Post Office',             query: 'post office' },
  { label: '📚 Public Library',          query: 'public library' },
];

// Fallback coords for preset cities
const CITY_COORDS: Record<string, Location> = {
  'Edison, NJ':      { lat: 40.5187, lng: -74.4121 },
  'Jersey City, NJ': { lat: 40.7178, lng: -74.0431 },
  'Fremont, CA':     { lat: 37.5485, lng: -121.9886 },
  'Chicago, IL':     { lat: 41.8781, lng: -87.6298 },
  'Houston, TX':     { lat: 29.7604, lng: -95.3698 },
  'Atlanta, GA':     { lat: 33.7490, lng: -84.3880 },
  'Dallas, TX':      { lat: 32.7767, lng: -96.7970 },
  'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
};

export default function LocalInfoPage() {
  const { city, geoLocation } = useLocation();
  const [info, setInfo] = useState<LocalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('all');

  // GPS auto-populated services
  const [autoResults, setAutoResults] = useState<Record<string, Business[]>>({});
  const [autoLoading, setAutoLoading] = useState(false);
  const [activeService, setActiveService] = useState(AUTO_SERVICES[0]);
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    if (!env.googlePlacesKey) return;
    loadGoogleMaps(env.googlePlacesKey).then(() => setMapsReady(true)).catch(() => {});
  }, []);

  // Admin-curated entries — re-fetch whenever city changes
  useEffect(() => {
    setLoading(true);
    setInfo([]);
    fetchLocalInfo(city)
      .then((d) => setInfo(d as LocalInfo[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [city]);

  // Reset cached results when city changes
  useEffect(() => { setAutoResults({}); }, [city]);

  // Auto-populate services near GPS (or city center)
  const loc = geoLocation || CITY_COORDS[city];
  useEffect(() => {
    if (!mapsReady || !loc) return;
    const key = activeService.query;
    if (autoResults[key]) return; // cached
    setAutoLoading(true);
    searchNearbyPlaces(loc, key, 24000)
      .then((results) => setAutoResults((prev) => ({ ...prev, [key]: results.slice(0, 4) })))
      .catch(() => {})
      .finally(() => setAutoLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, activeService, city, geoLocation]);

  const types = ['all', ...Object.keys(TYPE_META)];
  const filtered = activeType === 'all' ? info : info.filter((i) => i.type === activeType);
  const grouped = filtered.reduce<Record<string, LocalInfo[]>>((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});

  const currentAuto = autoResults[activeService.query] || [];

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#0a2a14,#061810)' }}>
        <div className="eyebrow">🏛️ Local Info</div>
        <h1>Local Information for {city}</h1>
        <p>Utilities, emergency contacts, government services, trash schedules & city info — near your location.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>

        {/* ── Near You: auto-populated civic services (GPS) ── */}
        {env.googlePlacesKey && loc && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 18 }}>📍 Services Near You</h2>
              {geoLocation && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 9px', borderRadius: 20 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  GPS
                </span>
              )}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px' }}>
              Live results near {geoLocation ? 'your current location' : city} — expand a card for phone & directions.
            </p>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {AUTO_SERVICES.map((s) => (
                <span
                  key={s.query}
                  className={`chip ${activeService.query === s.query ? 'active' : ''}`}
                  style={{ fontSize: 12 }}
                  onClick={() => setActiveService(s)}
                >
                  {s.label}
                </span>
              ))}
            </div>

            {autoLoading && currentAuto.length === 0
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 10 }}>
                    <div className="skeleton" style={{ width: 72, height: 72 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="skeleton" style={{ height: 16, width: '50%' }} />
                      <div className="skeleton" style={{ height: 12, width: '70%' }} />
                    </div>
                  </div>
                ))
              : currentAuto.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>No results found nearby.</div>
                : currentAuto.map((b) => (
                    <div key={b.id} style={{ marginBottom: 10 }}>
                      <PlaceCard business={b} />
                    </div>
                  ))
            }
          </div>
        )}

        {/* ── Curated entries (admin-managed) ── */}
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>📌 Community Directory</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {types.map((t) => (
            <span key={t} className={`chip ${activeType === t ? 'active' : ''}`} onClick={() => setActiveType(t)}>
              {t === 'all' ? '🏙️ All' : `${TYPE_META[t]?.icon} ${TYPE_META[t]?.label}`}
            </span>
          ))}
        </div>

        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10 }}>
                <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '60%' }} />
              </div>
            ))
          : Object.entries(grouped).length === 0
            ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 12 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🏛️</div>
                <p>No curated entries yet for <strong>{city}</strong>.</p>
                <p style={{ fontSize: 13 }}>Community-specific info (utility setup guides, trash schedules, city tips) is added by admins.</p>
              </div>
            )
            : Object.entries(grouped).map(([type, items]) => {
                const meta = TYPE_META[type] || { icon: '📌', label: type, color: '#f5f5f5' };
                return (
                  <div key={type} style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{meta.icon}</span> {meta.label}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map((item) => (
                        <div key={item.id} style={{ padding: '14px 16px', background: meta.color, border: '1px solid var(--border)', borderRadius: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.name}</div>
                          {item.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{item.description}</div>}
                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
                            {item.phone && <a href={`tel:${item.phone}`} style={{ color: 'var(--accent-text)', fontWeight: 600 }}>📞 {item.phone}</a>}
                            {item.website && <a href={item.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-text)', fontWeight: 600 }}>🌐 Website</a>}
                            {item.address && <span style={{ color: 'var(--muted)' }}>📍 {item.address}</span>}
                            {item.notes && <span style={{ color: 'var(--muted)' }}>💬 {item.notes}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
        }
      </div>
    </>
  );
}
