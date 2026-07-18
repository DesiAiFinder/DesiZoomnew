import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

export default function SellerOnboard() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'not_connected' | 'connected'>('loading');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setStatus(data?.stripe_account_id ? 'connected' : 'not_connected');
      });

    // Handle return from Stripe onboarding
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'success') {
      setStatus('connected');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const handleConnect = async () => {
    if (!user) return;
    setWorking(true);
    setError('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-connect-account', {
        body: {
          user_id: user.id,
          return_url: window.location.href,
        },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message);
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setWorking(false);
    }
  };

  if (status === 'loading') return null;

  if (status === 'connected') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, flexWrap: 'wrap' }}>
        <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Bank account connected — you can receive payments</span>
        <button
          onClick={handleConnect}
          disabled={working}
          style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8, border: '1px solid #bbf7d0', background: 'white', color: '#166534', cursor: 'pointer' }}
        >
          {working ? 'Opening…' : '✏️ Edit bank details'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>💳 Connect your bank to sell</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        To receive payments from buyers, connect your bank account via Stripe. Takes ~2 minutes.
      </div>
      <button
        onClick={handleConnect}
        disabled={working}
        style={{
          background: working ? '#9ca3af' : '#e07820',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '8px 18px',
          fontWeight: 700,
          fontSize: 13,
          cursor: working ? 'not-allowed' : 'pointer',
        }}
      >
        {working ? 'Redirecting to Stripe…' : 'Connect Bank Account'}
      </button>
      {error && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 8 }}>{error}</div>}
    </div>
  );
}
