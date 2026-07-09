import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchMarketplace } from '../services/supabase';
import PostModal from '../components/PostModal';
import type { Post } from '../types';
import { MKT_CATEGORIES } from '../config/env';

interface OutletCtx { onAuthOpen: () => void; }

const CAT_ICONS: Record<string, string> = {
  'For sale':'🛍️','Vehicles':'🚗','Services':'🔧','Jobs':'💼',
  'Matrimony':'💍','Student':'🎓','Temple':'🛕','Lost & found':'🔦',
};

export default function Marketplace() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { city } = useLocation();
  const { user } = useAuth();
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('All');
  const [postOpen, setPostOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchMarketplace(city, activeCat === 'All' ? undefined : activeCat).catch(() => []);
    setItems(data as Post[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [city, activeCat]);

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#2a0a1a,#1a0610)' }}>
        <div className="eyebrow">🛍️ Marketplace</div>
        <h1>Desi Marketplace</h1>
        <p>Buy, sell, find jobs, matrimony & community listings — all in one place.</p>
      </div>

      <div style={{ padding: '20px 32px 48px' }}>
        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {MKT_CATEGORIES.map((c) => (
            <span key={c} className={`chip ${activeCat === c ? 'active' : ''}`} onClick={() => setActiveCat(c)}>
              {CAT_ICONS[c] || ''} {c}
            </span>
          ))}
          <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => user ? setPostOpen(true) : onAuthOpen()}>
            + List an item
          </button>
        </div>

        {/* Grid */}
        {loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div className="skeleton" style={{ height: 110 }} />
                  <div style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="skeleton" style={{ height: 16, width: '60%' }} />
                    <div className="skeleton" style={{ height: 12, width: '80%' }} />
                  </div>
                </div>
              ))}
            </div>
          : items.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
                <p>No listings in {city} yet.</p>
                <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>+ List something</button>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
                {items.map((m) => (
                  <div key={m.id} className="mkt-card">
                    <div className="mkt-thumb" style={{ background: 'var(--pink-soft)' }}>
                      {CAT_ICONS[m.category || ''] || '📦'}
                      <span className="badge-cat">{m.category || 'Item'}</span>
                    </div>
                    <div style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{m.price || '—'}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {m.city}</div>
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>

      {postOpen && <PostModal onClose={() => { setPostOpen(false); load(); }} defaultType="marketplace" />}
    </>
  );
}
