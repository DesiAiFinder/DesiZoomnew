import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface Props {
  postId: string;
  priceCents: number;
  isSold?: boolean;
  sellerId: string;
}

export default function BuyButton({ postId, priceCents, isSold, sellerId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const price = (priceCents / 100).toFixed(2);
  const isOwnListing = user?.id === sellerId;

  if (isSold) {
    return (
      <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', padding: '5px 12px', background: '#fee2e2', borderRadius: 20 }}>
        SOLD
      </span>
    );
  }

  if (isOwnListing) {
    return (
      <span style={{ fontSize: 12, color: 'var(--muted)', padding: '5px 12px', background: '#f3f4f6', borderRadius: 20 }}>
        Your listing
      </span>
    );
  }

  const handleBuy = async () => {
    if (!user) {
      setError('Sign in to buy');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          post_id: postId,
          buyer_id: user.id,
          success_url: `${window.location.origin}/marketplace?payment=success`,
          cancel_url: `${window.location.origin}/marketplace?payment=cancelled`,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <button
        onClick={handleBuy}
        disabled={loading}
        style={{
          background: loading ? '#9ca3af' : '#e07820',
          color: 'white',
          border: 'none',
          borderRadius: 20,
          padding: '6px 16px',
          fontWeight: 700,
          fontSize: 13,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Redirecting…' : `Buy · $${price}`}
      </button>
      {error && <span style={{ fontSize: 11, color: '#dc2626' }}>{error}</span>}
    </div>
  );
}
