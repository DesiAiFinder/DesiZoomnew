import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchMarketplace } from '../services/supabase';
import PostModal from '../components/PostModal';
import BuyButton from '../components/BuyButton';
import SellerOnboard from '../components/SellerOnboard';
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
  const [showOnboard, setShowOnboard] = useState(false);

  // Show success/cancelled payment banner
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get('payment');

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

        {/* Payment status banners */}
        {paymentStatus === 'success' && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, fontWeight: 600, color: '#166534' }}>
            ✅ Payment successful! The seller will be in touch with you.
          </div>
        )}
        {paymentStatus === 'cancelled' && (
          <div style={{ padding: '12px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, marginBottom: 16, color: '#9a3412' }}>
            Payment cancelled. Your card was not charged.
          </div>
        )}

        {/* Seller onboard toggle */}
        {user && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setShowOnboard((v) => !v)}
              style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {showOnboard ? 'Hide' : '💳 Want to sell? Connect your bank account'}
            </button>
            {showOnboard && (
              <div style={{ marginTop: 10 }}>
                <SellerOnboard />
              </div>
            )}
          </div>
        )}

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
                  <div key={m.id} className="mkt-card" style={{ position: 'relative', opacity: m.is_sold ? 0.7 : 1 }}>
                    <Link to={`/listing/${m.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div className="mkt-thumb" style={{ background: 'var(--pink-soft)', overflow: 'hidden' }}>
                        {m.image_urls?.[0] ? (
                          <img src={m.image_urls[0]} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          CAT_ICONS[m.category || ''] || '📦'
                        )}
                        <span className="badge-cat">{m.category || 'Item'}</span>
                        {(m.is_sponsored || (m.boosted_until && new Date(m.boosted_until) > new Date())) && !m.is_sold && (
                          <span style={{
                            position: 'absolute', top: 8, right: 8,
                            background: '#e07820', color: 'white',
                            fontSize: 10, fontWeight: 800, padding: '2px 7px',
                            borderRadius: 20, letterSpacing: '0.05em'
                          }}>{m.is_sponsored ? 'SPONSORED' : '🚀 BOOSTED'}</span>
                        )}
                        {m.is_sold && (
                          <span style={{
                            position: 'absolute', top: 8, right: 8,
                            background: '#dc2626', color: 'white',
                            fontSize: 10, fontWeight: 800, padding: '2px 7px',
                            borderRadius: 20, letterSpacing: '0.05em'
                          }}>SOLD</span>
                        )}
                      </div>
                    </Link>
                    <div style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Link to={`/listing/${m.id}`} style={{ fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>{m.title}</Link>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {m.city}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Show Buy button if item has a price and is not sold */}
                        {m.price_cents ? (
                          <BuyButton
                            postId={m.id}
                            priceCents={m.price_cents}
                            isSold={m.is_sold}
                            sellerId={m.user_id}
                          />
                        ) : (
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{m.price || '—'}</div>
                        )}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`Check out "${m.title}" on DesiZoom: ${window.location.origin}/listing/${m.id}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Share on WhatsApp"
                          style={{ fontSize: 16, textDecoration: 'none', marginLeft: 'auto' }}
                        >💬</a>
                      </div>
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
