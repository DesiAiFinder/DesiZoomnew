import { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchPostById, deleteMyPost } from '../services/supabase';
import BuyButton from '../components/BuyButton';
import MessageButton from '../components/MessageButton';
import SellerInfo from '../components/SellerInfo';
import BoostButton from '../components/BoostButton';
import type { Post } from '../types';

interface OutletCtx { onAuthOpen: () => void; }

const TYPE_META: Record<string, { icon: string; label: string; back: string; backLabel: string }> = {
  deal:        { icon: '🏷️', label: 'Deal',        back: '/deals',       backLabel: 'Deals' },
  marketplace: { icon: '🛍️', label: 'Marketplace', back: '/marketplace', backLabel: 'Marketplace' },
  roommate:    { icon: '🏠', label: 'Roommate',    back: '/roommates',   backLabel: 'Roommates' },
  event:       { icon: '🎉', label: 'Event',       back: '/events',      backLabel: 'Events' },
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function Listing() {
  const { id } = useParams<{ id: string }>();
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainPhoto, setMainPhoto] = useState(0);

  const removeListing = async () => {
    if (!post) return;
    if (!window.confirm(`Remove "${post.title}"? It will no longer be visible on DesiZoom.`)) return;
    try {
      await deleteMyPost(post.id);
      navigate('/profile');
    } catch {
      alert('Could not remove the listing. Please try again.');
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPostById(id)
      .then((p) => setPost(p as Post | null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '40px 32px' }}>
        <div className="skeleton" style={{ height: 300, borderRadius: 16, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 16, width: '60%' }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <p>This listing doesn't exist or has been removed.</p>
        <Link to="/marketplace" className="btn-primary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Browse Marketplace</Link>
      </div>
    );
  }

  const meta = TYPE_META[post.type] || TYPE_META.marketplace;
  const details = post.details as Record<string, string> | undefined;
  const shareUrl = `${window.location.origin}/listing/${post.id}`;
  const photos = post.image_urls || [];

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        <Link to={meta.back} style={{ color: 'var(--accent-text)', textDecoration: 'none', fontWeight: 600 }}>← {meta.backLabel}</Link>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Photos */}
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', background: '#f4f4f6', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
            {photos.length > 0
              ? <img src={photos[mainPhoto]} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 72 }}>{meta.icon}</span>
            }
          </div>
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  onClick={() => setMainPhoto(i)}
                  style={{
                    width: 64, height: 64, objectFit: 'cover', borderRadius: 8, cursor: 'pointer',
                    border: i === mainPhoto ? '2px solid #e07820' : '1px solid var(--border)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="tag">{meta.icon} {meta.label}</span>
            {post.category && <span className="tag" style={{ background: 'var(--blue-soft)', color: 'var(--blue-text)' }}>{post.category}</span>}
            {post.is_sold && <span style={{ fontSize: 12, fontWeight: 800, background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: 20 }}>SOLD</span>}
          </div>

          <h1 style={{ fontSize: 26, lineHeight: 1.25 }}>{post.title}</h1>

          {(post.price || post.price_cents) && (
            <div style={{ fontSize: 24, fontWeight: 800, color: '#166534' }}>
              {post.price_cents ? `$${(post.price_cents / 100).toFixed(2)}` : post.price}
            </div>
          )}
          {post.discount && (
            <div style={{ fontSize: 18, fontWeight: 800, color: '#e07820' }}>{post.discount}</div>
          )}

          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            📍 {post.city} · Posted {new Date(post.created_at).toLocaleDateString()}
          </div>

          <SellerInfo sellerId={post.user_id} />

          {post.description && (
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text)' }}>{post.description}</p>
          )}

          {/* Type-specific details */}
          {post.type === 'deal' && details?.store_name && <div style={{ fontSize: 14 }}>🏪 <strong>Store:</strong> {details.store_name}</div>}
          {post.type === 'deal' && details?.expiry && <div style={{ fontSize: 14 }}>📅 <strong>Valid until:</strong> {details.expiry}</div>}
          {post.type === 'roommate' && details?.rent && <div style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>💵 {details.rent}/month</div>}
          {post.type === 'event' && post.event_date && <div style={{ fontSize: 14 }}>📅 {fmtDateTime(post.event_date)}</div>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            {post.type === 'marketplace' && post.price_cents && (
              <BuyButton postId={post.id} priceCents={post.price_cents} isSold={post.is_sold} sellerId={post.user_id} />
            )}
            <MessageButton postId={post.id} sellerId={post.user_id} onAuthNeeded={onAuthOpen} />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Check out "${post.title}" on DesiZoom: ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '6px 14px', background: '#e8f9ee', color: '#128c4b', borderRadius: 20, textDecoration: 'none' }}
            >
              📲 Share
            </a>
            <button
              onClick={() => { navigator.clipboard?.writeText(shareUrl); }}
              style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', background: 'white', border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer', color: 'var(--muted)' }}
            >
              🔗 Copy link
            </button>
          </div>

          {/* Owner controls */}
          {user?.id === post.user_id && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!post.is_sold && <BoostButton post={post} />}
              <button
                onClick={removeListing}
                style={{ fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', width: 'fit-content' }}
              >
                🗑️ Remove listing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
