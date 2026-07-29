import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchPosts } from '../services/supabase';
import DealCard from '../components/DealCard';
import PostModal from '../components/PostModal';
import type { Post } from '../types';

interface OutletCtx { onAuthOpen: () => void; }

export const ACCOM_CATEGORIES = [
  { key: 'All',            icon: '🏘️' },
  { key: 'Roommate',       icon: '🧑‍🤝‍🧑' },
  { key: 'Room for rent',  icon: '🛏️' },
  { key: 'Apartment',      icon: '🏢' },
  { key: 'Home for rent',  icon: '🏡' },
  { key: 'Sublease',       icon: '🔑' },
];

export default function Roommates() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { city } = useLocation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('All');
  const [votedIds, setVotedIds] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem('dz_votes') || '[]'))
  );

  const load = async () => {
    setLoading(true);
    const data = await fetchPosts(city, 'roommate').catch(() => []);
    setPosts(data as Post[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [city]);

  const filtered = activeCat === 'All'
    ? posts
    : posts.filter((p) => (p.category || 'Roommate') === activeCat);

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
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#0f1f3a,#081428)' }}>
        <div className="eyebrow">🏘️ Rooms</div>
        <h1>Rooms, Roommates & Rentals</h1>
        <p>No broker fees. Rooms, apartments, homes & sublets, direct from the desi community in your city.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {ACCOM_CATEGORIES.map((c) => (
            <span
              key={c.key}
              className={`chip ${activeCat === c.key ? 'active' : ''}`}
              onClick={() => setActiveCat(c.key)}
            >
              {c.icon} {c.key}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18 }}>{activeCat === 'All' ? 'Accommodations' : activeCat} in {city}</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{filtered.length} listing{filtered.length !== 1 ? 's' : ''} available</p>
          </div>
          <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>
            + Post Accommodation
          </button>
        </div>

        {/* Info banner */}
        <div style={{ padding: '12px 16px', background: 'var(--blue-soft)', border: '1px solid #c8d8f0', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
          💡 <strong>Tip:</strong> Always meet in a public place first. DesiZoom does not verify listings, so exercise caution.
        </div>

        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14 }}>
                <div className="skeleton" style={{ width: 88, height: 88 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 18, width: '55%' }} />
                  <div className="skeleton" style={{ height: 13, width: '75%' }} />
                  <div className="skeleton" style={{ height: 13, width: '40%' }} />
                </div>
              </div>
            ))
          : filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏘️</div>
                <p>No {activeCat === 'All' ? 'accommodation' : activeCat.toLowerCase()} listings yet in {city}.</p>
                <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>
                  + Be the first to post
                </button>
              </div>
            : filtered.map((p) => (
                <DealCard key={p.id} post={p} voted={votedIds.has(p.id)} onVoteToggle={handleVote} onAuthNeeded={onAuthOpen} />
              ))
        }
      </div>

      {postOpen && <PostModal onClose={() => { setPostOpen(false); load(); }} defaultType="roommate" />}
    </>
  );
}
