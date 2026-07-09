import { useState } from 'react';
import type { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toggleVote, fetchComments, addComment } from '../services/supabase';
import type { Comment } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  deal: '🏷️', marketplace: '🛍️', roommate: '🏠', event: '🎉',
};
const CATEGORY_COLORS: Record<string, string> = {
  deal: '#fdf0e0', marketplace: '#fde8f0', roommate: '#e8eef8', event: '#f0ffe8',
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

export default function DealCard({ post, voted, onVoteToggle, onAuthNeeded }: Props) {
  const { user } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

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
    deal: 'Deal', marketplace: 'Marketplace', roommate: 'Roommate', event: 'Event',
  };

  return (
    <div className="deal-card">
      {/* Thumb */}
      <div className="deal-thumb" style={{ background: CATEGORY_COLORS[post.type] || '#f5f5f5', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 28 }}>{CATEGORY_ICONS[post.type] || '📌'}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{typeLabel[post.type]}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{post.title}</span>
          {post.discount && <span className="tag">{post.discount}</span>}
          {post.price && (
            <span className="tag" style={{ background: 'var(--pink-soft)', color: 'var(--pink-text)' }}>{post.price}</span>
          )}
        </div>

        {post.description && (
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{post.description}</div>
        )}

        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>📍 {post.city}</span>
          <span>🕐 {timeAgo(post.created_at)}</span>
          <button
            onClick={toggleComments}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: 0, textDecoration: 'underline' }}
          >
            💬 comments
          </button>
        </div>

        {commentsOpen && (
          <div style={{ marginTop: 6 }}>
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

      {/* Vote */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <button className={`vote-btn ${voted ? 'voted' : ''}`} onClick={handleVote}>▲</button>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{post.votes_count}</span>
      </div>
    </div>
  );
}
