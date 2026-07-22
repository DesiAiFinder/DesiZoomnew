import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toggleVote, fetchComments, addComment, reportPost, toggleFavorite } from '../services/supabase';
import BuyButton from './BuyButton';
import MessageButton from './MessageButton';
import SellerInfo from './SellerInfo';
import type { Comment } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  deal: '🏷️', marketplace: '🛍️', roommate: '🏠', event: '🎉', question: '☕',
};
const CATEGORY_COLORS: Record<string, string> = {
  deal: '#fdf0e0', marketplace: '#fde8f0', roommate: '#e8eef8', event: '#f0ffe8', question: '#f5eee2',
};

interface Props {
  post: Post;
  voted: boolean;
  onVoteToggle: (id: string) => void;
  onAuthNeeded: () => void;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DealCard({ post, voted, onVoteToggle, onAuthNeeded }: Props) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [reported, setReported] = useState(false);
  const [saved, setSaved] = useState<boolean>(
    () => JSON.parse(localStorage.getItem('dz_favs') || '[]').includes(post.id)
  );

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return onAuthNeeded();
    const next = !saved;
    setSaved(next);
    const favs: string[] = JSON.parse(localStorage.getItem('dz_favs') || '[]');
    localStorage.setItem('dz_favs', JSON.stringify(next ? [...favs, post.id] : favs.filter((f) => f !== post.id)));
    await toggleFavorite(user.id, post.id, !next).catch(() => {});
  };

  const details = post.details as Record<string, string> | undefined;

  const handleReport = async () => {
    if (!user) return onAuthNeeded();
    const reason = window.prompt('Why are you reporting this post? (spam, scam, inappropriate, other)');
    if (!reason?.trim()) return;
    await reportPost(post.id, user.id, reason.trim()).catch(() => {});
    setReported(true);
  };

  const handleVote = async () => {
    if (!user) return onAuthNeeded();
    onVoteToggle(post.id);
    await toggleVote(post.id, user.id, voted);
  };

  const toggleComments = async () => {
    if (commentsOpen) { setCommentsOpen(false); return; }
    setCommentsOpen(true);
    setCommentsLoading(true);
    const data = await fetchComments(post.id).catch(() => []);
    setComments(data as Comment[]);
    setCommentsLoading(false);
  };

  const submitComment = async () => {
    if (!user) return onAuthNeeded();
    if (!commentText.trim()) return;
    await addComment(post.id, user.id, commentText.trim());
    setCommentText('');
    const data = await fetchComments(post.id).catch(() => []);
    setComments(data as Comment[]);
  };

  const typeLabel: Record<string, string> = {
    deal: 'Deal', marketplace: 'Marketplace', roommate: 'Roommate', event: 'Event', question: 'Community',
  };

  return (
    <div className="deal-card" style={{ flexDirection: 'column', padding: 0, cursor: 'default' }}>

      {/* Main row — always visible */}
      <div
        style={{ display: 'flex', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Thumb */}
        <div className="deal-thumb" style={{ background: CATEGORY_COLORS[post.type] || '#f5f5f5', flexDirection: 'column', gap: 4, flexShrink: 0, overflow: 'hidden' }}>
          {post.image_urls?.[0] ? (
            <img src={post.image_urls[0]} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <span style={{ fontSize: 28 }}>{CATEGORY_ICONS[post.type] || '📌'}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{typeLabel[post.type]}</span>
            </>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Link
              to={`/listing/${post.id}`}
              onClick={(e) => e.stopPropagation()}
              style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', textDecoration: 'none' }}
            >{post.title}</Link>
            {post.is_sponsored && (
              <span style={{ fontSize: 10, fontWeight: 800, background: '#fdf0e0', color: '#b84d00', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em' }}>SPONSORED</span>
            )}
            {post.boosted_until && new Date(post.boosted_until) > new Date() && (
              <span style={{ fontSize: 12 }} title="Boosted listing">🚀</span>
            )}
            {post.discount && <span className="tag">{post.discount}</span>}
            {post.price && (
              <span className="tag" style={{ background: 'var(--pink-soft)', color: 'var(--pink-text)' }}>{post.price}</span>
            )}
            {post.is_sold && (
              <span style={{ fontSize: 11, fontWeight: 800, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20 }}>SOLD</span>
            )}
          </div>

          {post.description && (
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap' }}>
              {post.description}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>📍 {post.city}</span>
            <span>🕐 {timeAgo(post.created_at)}</span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleComments(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: 0, textDecoration: 'underline' }}
            >
              💬 comments
            </button>
          </div>
        </div>

        {/* Vote + save */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <button
            className={`vote-btn ${voted ? 'voted' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleVote(); }}
          >▲</button>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{post.votes_count}</span>
          <button
            onClick={handleSave}
            title={saved ? 'Remove from saved' : 'Save'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 0', filter: saved ? 'none' : 'grayscale(1) opacity(0.45)' }}
          >❤️</button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Photo gallery */}
          {post.image_urls && post.image_urls.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {post.image_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
                </a>
              ))}
            </div>
          )}

          {/* Seller trust signals */}
          <SellerInfo sellerId={post.user_id} />

          {/* Type-specific details */}
          {post.type === 'deal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {details?.store_name && (
                <div style={{ fontSize: 13 }}>🏪 <strong>Store:</strong> {details.store_name}</div>
              )}
              {details?.expiry && (
                <div style={{ fontSize: 13 }}>📅 <strong>Valid until:</strong> {details.expiry}</div>
              )}
              {post.discount && (
                <div style={{ fontSize: 13 }}>💰 <strong>Offer:</strong> {post.discount}</div>
              )}
            </div>
          )}

          {post.type === 'roommate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {details?.rent && (
                <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>💵 {details.rent}/month</div>
              )}
              {post.description && (
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{post.description}</div>
              )}
            </div>
          )}

          {post.type === 'event' && post.event_date && (
            <div style={{ fontSize: 13 }}>📅 <strong>Date:</strong> {formatDate(post.event_date)}</div>
          )}

          {post.type === 'marketplace' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {post.category && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Category: {post.category}</div>
              )}
              {post.price_cents ? (
                <BuyButton
                  postId={post.id}
                  priceCents={post.price_cents}
                  isSold={post.is_sold}
                  sellerId={post.user_id}
                />
              ) : post.price ? (
                <div style={{ fontSize: 15, fontWeight: 700 }}>{post.price}</div>
              ) : null}
            </div>
          )}

          {/* Actions: message + share + report */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <MessageButton postId={post.id} sellerId={post.user_id} onAuthNeeded={onAuthNeeded} />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Check out "${post.title}" in ${post.city} on DesiZoom: ${window.location.origin}/listing/${post.id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 700, padding: '5px 14px',
                background: '#e8f9ee', color: '#128c4b', borderRadius: 20,
                textDecoration: 'none',
              }}
            >
              📲 Share on WhatsApp
            </a>
            {user && user.id !== post.user_id && !reported && (
              <button
                onClick={handleReport}
                style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                🚩 Report
              </button>
            )}
            {reported && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#166534' }}>✓ Reported, thanks</span>
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      {commentsOpen && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
          {commentsLoading ? (
            <div className="skeleton" style={{ height: 32, width: '60%' }} />
          ) : (
            <div>
              {comments.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>No comments yet.</div>
                : comments.map((c) => (
                    <div key={c.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>{c.body}</div>
                  ))
              }
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Add a comment…"
              style={{ flex: 1, height: 34, border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px', fontSize: 12 }}
            />
            <button className="btn-ghost" style={{ border: '1px solid var(--border)', fontSize: 12 }} onClick={submitComment}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
