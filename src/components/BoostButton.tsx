import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { Post } from '../types';

const BOOST_PRICE = '$2.99';
const BOOST_DAYS = 7;

export default function BoostButton({ post }: { post: Post }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const boostActive = post.boosted_until && new Date(post.boosted_until) > new Date();

  if (boostActive) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff8e6', border: '1px solid #f0d090', borderRadius: 10, fontSize: 13 }}>
        🚀 <strong>Boosted</strong> until {new Date(post.boosted_until!).toLocaleDateString()}
      </div>
    );
  }

  const handleBoost = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-boost-session', {
        body: {
          post_id: post.id,
          user_id: user.id,
          success_url: `${window.location.origin}/listing/${post.id}?boost=success`,
          cancel_url: `${window.location.origin}/listing/${post.id}`,
        },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message);
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '14px 16px', background: '#fff8e6', border: '1px solid #f0d090', borderRadius: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>🚀 Boost this listing</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
        Pin your listing to the top of the feed for {BOOST_DAYS} days. {BOOST_PRICE} one-time.
      </div>
      <button
        onClick={handleBoost}
        disabled={loading}
        className="btn-primary"
        style={{ fontSize: 13, padding: '8px 18px' }}
      >
        {loading ? 'Redirecting…' : `Boost for ${BOOST_PRICE}`}
      </button>
      {error && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 8 }}>{error}</div>}
    </div>
  );
}
