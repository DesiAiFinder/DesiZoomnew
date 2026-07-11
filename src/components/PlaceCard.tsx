import { useState } from 'react';
import { getPlaceDetails } from '../services/googlePlaces';
import type { Business } from '../types';

interface Details { phone?: string; website?: string; mapsUrl?: string; }

function Stars({ rating }: { rating?: number }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ color: '#f59e0b', fontSize: 13, letterSpacing: 1 }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      <span style={{ color: 'var(--muted)', marginLeft: 4, fontSize: 12 }}>({rating})</span>
    </span>
  );
}

export default function PlaceCard({ business: b }: { business: Business }) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleExpand = async () => {
    if (!expanded && !details) {
      setLoadingDetails(true);
      const d = await getPlaceDetails(b.placeId).catch(() => ({}));
      setDetails(d);
      setLoadingDetails(false);
    }
    setExpanded((v) => !v);
  };

  const mapsLink = details?.mapsUrl
    || `https://www.google.com/maps/place/?q=place_id:${b.placeId}`;

  const isOpen = b.isOpen;
  const statusColor = isOpen === true ? '#16a34a' : isOpen === false ? '#dc2626' : '#6b7280';
  const statusText = isOpen === true ? 'Open now' : isOpen === false ? 'Closed' : '';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      border: '1px solid var(--border)', borderRadius: 12,
      marginBottom: 12, overflow: 'hidden', background: 'white',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', gap: 14, padding: 14 }}>
        {/* Photo */}
        <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#f0f0f0' }}>
          {b.photos?.[0]
            ? <img src={b.photos[0]} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏪</div>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
          <Stars rating={b.rating} />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📍 {b.address}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            {b.distance !== undefined && (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{b.distance} mi away</span>
            )}
            {statusText && (
              <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>{statusText}</span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={handleExpand}
          style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Quick action buttons — always visible */}
      <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px', flexWrap: 'wrap' }}>
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: '#e8f4ea', color: '#1a6e3c', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          📍 Google Maps
        </a>
        {details?.phone && (
          <a
            href={`tel:${details.phone}`}
            style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: '#fff3e0', color: '#b84d00', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            📞 {details.phone}
          </a>
        )}
        {details?.website && (
          <a
            href={details.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: '#eef4ff', color: '#1e40af', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            🌐 Website
          </a>
        )}
      </div>

      {/* Expanded details panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', background: '#fafafa' }}>
          {loadingDetails ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading contact details…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {details?.phone && (
                <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📞</span>
                  <a href={`tel:${details.phone}`} style={{ color: 'var(--accent-text)', fontWeight: 600, textDecoration: 'none' }}>{details.phone}</a>
                </div>
              )}
              {details?.website && (
                <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🌐</span>
                  <a href={details.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-text)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                    {details.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>
              )}
              {!details?.phone && !details?.website && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>No contact details listed by this business on Google.</div>
              )}
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#1a6e3c', fontWeight: 600, textDecoration: 'none', marginTop: 2 }}
              >
                View full listing on Google Maps →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
