import { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { fetchLocalInfo } from '../services/supabase';
import type { LocalInfo } from '../types';

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  utility:         { icon: '⚡', label: 'Utilities',        color: '#fff8e6' },
  emergency:       { icon: '🚨', label: 'Emergency',        color: '#fff0ee' },
  government:      { icon: '🏛️', label: 'Government',      color: '#eef4ff' },
  trash_recycling: { icon: '♻️', label: 'Trash & Recycling', color: '#efffee' },
  city_info:       { icon: '🏙️', label: 'City Info',       color: '#f5f0ff' },
};

export default function LocalInfo() {
  const { city } = useLocation();
  const [info, setInfo] = useState<LocalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('all');

  useEffect(() => {
    fetchLocalInfo()
      .then((d) => setInfo(d as LocalInfo[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const types = ['all', ...Object.keys(TYPE_META)];
  const filtered = activeType === 'all' ? info : info.filter((i) => i.type === activeType);
  const grouped = filtered.reduce<Record<string, LocalInfo[]>>((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#0a2a14,#061810)' }}>
        <div className="eyebrow">🏛️ Local Info</div>
        <h1>Local Information for {city}</h1>
        <p>Utilities, emergency contacts, government services, trash schedules & city info.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {/* Type filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {types.map((t) => (
            <span key={t} className={`chip ${activeType === t ? 'active' : ''}`} onClick={() => setActiveType(t)}>
              {t === 'all' ? '🏙️ All' : `${TYPE_META[t]?.icon} ${TYPE_META[t]?.label}`}
            </span>
          ))}
        </div>

        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10 }}>
                <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '60%' }} />
              </div>
            ))
          : Object.entries(grouped).length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
                <p>No local info entries yet. Add them via the Admin dashboard.</p>
              </div>
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
