import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { fetchLocalInfo, supabase } from '../services/supabase';
import { loadGoogleMaps, searchNearbyPlaces } from '../services/googlePlaces';
import PlaceCard from '../components/PlaceCard';
import { env } from '../config/env';
import type { LocalInfo, Business, Location } from '../types';

interface OrgLeader { name: string; role: string; phone?: string; email?: string; }
interface Org {
  id: string; name: string; org_type: string; city: string;
  description?: string; website?: string; phone?: string; email?: string;
  leaders: OrgLeader[];
  leadership_url?: string;
  site_ok?: boolean;
  logo_url?: string;
}

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

  // Desi organizations — same city first, then same state (e.g. Dallas orgs for Little Elm users)
  const [orgs, setOrgs] = useState<Org[]>([]);
  useEffect(() => {
    const state = city.split(',')[1]?.trim();
    supabase
      .from('organizations')
      .select('*')
      .eq('is_active', true)
      .ilike('city', state ? `%, ${state}` : city)
      .order('name')
      .limit(6)
      .then(({ data }) => {
        const rows = (data as Org[]) ?? [];
        rows.sort((a, b) => (a.city === city ? -1 : 0) - (b.city === city ? -1 : 0));
        setOrgs(rows);
      });
  }, [city]);

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
    searchNearbyPlaces(loc, key, 12000)
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

        {/* ── Desi Organizations ── */}
        {orgs.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <h2 style={{ fontSize: 18 }}>🤝 Desi Organizations in {city}</h2>
              <Link to="/connections" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)', textDecoration: 'none' }}>
                View all organizations →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
              {orgs.map((org) => (
                <div key={org.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', background: 'white' }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{org.name}</div>
                  {org.description && (
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {org.description}
                    </div>
                  )}
                  {org.leaders?.length > 0 && org.leaders[0]?.name && !org.leaders[0].name.startsWith('Add ') && (
                    <div style={{ fontSize: 12.5, marginBottom: 8 }}>
                      👤 <strong>{org.leaders[0].name}</strong>
                      <span style={{ color: 'var(--muted)' }}> · {org.leaders[0].role}</span>
                      {org.leaders[0].phone && <a href={`tel:${org.leaders[0].phone}`} style={{ marginLeft: 8, textDecoration: 'none' }}>📞</a>}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {org.website && org.site_ok !== false && (
                      <a href={org.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: '#eef4ff', color: '#1e40af', textDecoration: 'none' }}>🌐 Website</a>
                    )}
                    {(org.leadership_url || org.website) && org.site_ok !== false && (
                      <a href={org.leadership_url || org.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: '#f5f0ff', color: '#534AB7', textDecoration: 'none' }}>👥 Current leadership</a>
                    )}
                    {org.phone && (
                      <a href={`tel:${org.phone}`} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent-text)', textDecoration: 'none' }}>📞 Call</a>
                    )}
                    {org.email && (
                      <a href={`mailto:${org.email}`} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: '#e8f9ee', color: '#128c4b', textDecoration: 'none' }}>✉️ Email</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
