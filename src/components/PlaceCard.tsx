import type { Business } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  grocery: '🛒', restaurant: '🍛', temple: '🛕', travel: '✈️', services: '🔧', other: '📍',
};

interface Props { business: Business; }

export default function PlaceCard({ business }: Props) {
  const stars = business.rating
    ? '★'.repeat(Math.round(business.rating)) + '☆'.repeat(5 - Math.round(business.rating))
    : null;

  return (
    <div className="place-card">
      {/* Icon / photo */}
      <div style={{
        width: 72, height: 72, borderRadius: 10, flexShrink: 0,
        overflow: 'hidden', background: 'var(--accent-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
      }}>
        {business.photos?.[0]
          ? <img src={business.photos[0]} alt={business.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : CATEGORY_ICONS[business.category] || '📍'
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{business.name}</div>
          {business.isOpen !== undefined && (
            <span style={{ fontSize: 11, fontWeight: 700, color: business.isOpen ? 'var(--green)' : '#b53000', flexShrink: 0 }}>
              {business.isOpen ? '● Open' : '● Closed'}
            </span>
          )}
        </div>

        {stars && (
          <div style={{ fontSize: 13, color: '#e07820', marginTop: 2 }}>
            {stars} <span style={{ color: 'var(--muted)', fontSize: 12 }}>({business.rating?.toFixed(1)})</span>
          </div>
        )}

        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>📍 {business.address}</div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          {business.distance !== undefined && (
            <span style={{ fontSize: 11.5, background: 'var(--blue-soft)', color: 'var(--blue-text)', padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>
              {business.distance} mi away
            </span>
          )}
          {business.phone && (
            <a href={`tel:${business.phone}`} style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>
              📞 {business.phone}
            </a>
          )}
          {business.website && (
            <a href={business.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>
              🌐 Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
