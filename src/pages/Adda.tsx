import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchPosts } from '../services/supabase';
import DealCard from '../components/DealCard';
import PostModal from '../components/PostModal';
import type { Post } from '../types';

interface OutletCtx { onAuthOpen: () => void; }

const TOPICS = [
  '☕ All', '🛂 Immigration', '🏠 Moving & Housing', '🍛 Food & Restaurants',
  '👶 Kids & Schools', '💼 Jobs & Career', '🚗 Cars & Insurance', '💬 General',
];

export default function Adda() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { city } = useLocation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState('☕ All');
  const [votedIds, setVotedIds] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem('dz_votes') || '[]'))
  );

  const load = async () => {
    setLoading(true);
    const data = await fetchPosts(city, 'question').catch(() => []);
    setPosts(data as Post[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [city]);

  const topicName = activeTopic.replace(/^\S+\s/, '');
  const filtered = activeTopic === '☕ All'
    ? posts
    : posts.filter((p) => p.category === topicName);

  const handleVote = (id: string) => {
    setVotedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('dz_votes', JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#3d1509,#2a0e05)' }}>
        <div className="eyebrow">☕ Adda</div>
        <h1>The Community Adda</h1>
        <p>Ask anything — visa questions, best pediatrician, where to find fresh curry leaves. Your community has answers.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {/* Topic chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {TOPICS.map((t) => (
            <span key={t} className={`chip ${activeTopic === t ? 'active' : ''}`} onClick={() => setActiveTopic(t)}>
              {t}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18 }}>Questions in {city}</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
              {filtered.length} question{filtered.length !== 1 ? 's' : ''} — answers appear in comments
            </p>
          </div>
          <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>
            + Ask a Question
          </button>
        </div>

        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14 }}>
                <div className="skeleton" style={{ width: 88, height: 88 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 18, width: '55%' }} />
                  <div className="skeleton" style={{ height: 13, width: '75%' }} />
                </div>
              </div>
            ))
          : filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>☕</div>
                <p>No questions yet in {city}.</p>
                <p style={{ fontSize: 13 }}>Be the first — ask about schools, visas, restaurants, anything.</p>
                <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>
                  + Ask the first question
                </button>
              </div>
            : filtered.map((p) => (
                <DealCard key={p.id} post={p} voted={votedIds.has(p.id)} onVoteToggle={handleVote} onAuthNeeded={onAuthOpen} />
              ))
        }
      </div>

      {postOpen && <PostModal onClose={() => { setPostOpen(false); load(); }} defaultType="question" />}
    </>
  );
}
