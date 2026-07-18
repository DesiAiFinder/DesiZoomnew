// Drop-in section for the Events page: shows nearby desi events from Ticketmaster
import { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { fetchExternalEvents, type ExternalEvent } from '../services/eventsApi';

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function AutoEvents() {
  const { city } = useLocation();
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchExternalEvents(city)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [city]);

  if (!loading && events.length === 0) return null; // Hide section if nothing found

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>🎟️ Happening Near {city}</h2>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
          {events.map((e) => (
            <a
              key={e.id}
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', color: 'var(--text)', background: 'white' }}
            >
              <div style={{ height: 120, background: '#f0f0f0', overflow: 'hidden' }}>
                {e.image
                  ? <img src={e.image} alt={e.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 36 }}>🎭</div>
                }
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {e.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  📅 {fmtDate(e.date)}{e.venue ? ` · ${e.venue}` : ''}
                </div>
                {e.priceRange && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginTop: 4 }}>{e.priceRange}</div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Events via Ticketmaster</div>
    </div>
  );
}
