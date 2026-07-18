import { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';

interface Leader { name: string; role: string; phone?: string; email?: string; }
interface Org {
  id: string;
  name: string;
  org_type: string;
  city: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  leaders: Leader[];
}

const ORG_TYPES: Record<string, { icon: string; label: string }> = {
  all:          { icon: '🤝', label: 'All' },
  cultural:     { icon: '🎭', label: 'Cultural' },
  temple:       { icon: '🛕', label: 'Temples' },
  professional: { icon: '💼', label: 'Professional' },
  student:      { icon: '🎓', label: 'Student' },
  nonprofit:    { icon: '❤️', label: 'Non-profit' },
  sports:       { icon: '🏏', label: 'Sports' },
  other:        { icon: '📌', label: 'Other' },
};

export default function Connections() {
  const { city } = useLocation();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [showAllCities, setShowAllCities] = useState(false);

  useEffect(() => {
    setLoading(true);
    let q = supabase.from('organizations').select('*').eq('is_active', true).order('name');
    if (!showAllCities) q = q.eq('city', city);
    q.then(({ data }) => {
      setOrgs((data as Org[]) ?? []);
      setLoading(false);
    });
  }, [city, showAllCities]);

  const filtered = activeType === 'all' ? orgs : orgs.filter((o) => o.org_type === activeType);

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#2a1a0a,#181006)' }}>
        <div className="eyebrow">🤝 Indian Connections</div>
        <h1>Community Organizations</h1>
        <p>Local desi organizations, temples, associations & their leadership — get connected in {city}.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
          {Object.entries(ORG_TYPES).map(([key, meta]) => (
            <span key={key} className={`chip ${activeType === key ? 'active' : ''}`} onClick={() => setActiveType(key)}>
              {meta.icon} {meta.label}
            </span>
          ))}
          <label style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={showAllCities} onChange={(e) => setShowAllCities(e.target.checked)} />
            Show all cities
          </label>
        </div>

        {loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />)}
            </div>
          : filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
                <p>No organizations listed yet for {showAllCities ? 'any city' : city}.</p>
                <p style={{ fontSize: 13 }}>Know one? Email us and we'll add it — or admins can add via the dashboard.</p>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
                {filtered.map((org) => {
                  const meta = ORG_TYPES[org.org_type] || ORG_TYPES.other;
                  return (
                    <div key={org.id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 18, background: 'white', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                          {org.logo_url
                            ? <img src={org.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : meta.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 15.5, lineHeight: 1.3 }}>{org.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{meta.icon} {meta.label} · 📍 {org.city}</div>
                        </div>
                      </div>

                      {org.description && (
                        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>{org.description}</p>
                      )}

                      {/* Leadership */}
                      {org.leaders?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 6 }}>Leadership</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {org.leaders.map((l, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#e07820', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                                  {l.name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                                <span style={{ fontWeight: 600 }}>{l.name}</span>
                                <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {l.role}</span>
                                {l.phone && <a href={`tel:${l.phone}`} style={{ marginLeft: 'auto', fontSize: 12, textDecoration: 'none' }}>📞</a>}
                                {l.email && <a href={`mailto:${l.email}`} style={{ fontSize: 12, textDecoration: 'none' }}>✉️</a>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact row */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 4 }}>
                        {org.website && (
                          <a href={org.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: '#eef4ff', color: '#1e40af', textDecoration: 'none' }}>🌐 Website</a>
                        )}
                        {org.phone && (
                          <a href={`tel:${org.phone}`} style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: '#fff3e0', color: '#b84d00', textDecoration: 'none' }}>📞 Call</a>
                        )}
                        {org.email && (
                          <a href={`mailto:${org.email}`} style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: '#e8f9ee', color: '#128c4b', textDecoration: 'none' }}>✉️ Email</a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
        }
      </div>
    </>
  );
}
