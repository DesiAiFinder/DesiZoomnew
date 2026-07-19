import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { Post } from '../types';

export default function BuyTicketButton({ event }: { event: Post }) {
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!event.ticket_price_cents) return null;

  const soldOut = event.tickets_total != null && (event.tickets_sold ?? 0) >= event.tickets_total;
  const remaining = event.tickets_total != null ? event.tickets_total - (event.tickets_sold ?? 0) : null;
  const isOwn = user?.id === event.user_id;
  const price = (event.ticket_price_cents / 100).toFixed(0);

  if (soldOut) {
    return <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', padding: '5px 12px', background: '#fee2e2', borderRadius: 20 }}>Sold out</span>;
  }
  if (isOwn) {
    return <span style={{ fontSize: 12, color: 'var(--muted)' }}>Your event · {event.tickets_sold ?? 0} sold</span>;
  }

  const buy = async () => {
    if (!user) { setError('Sign in to buy tickets'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-ticket-session', {
        body: {
          event_id: event.id,
          buyer_id: user.id,
          quantity: qty,
          success_url: `${window.location.origin}/events?ticket=success`,
          cancel_url: `${window.location.origin}/events`,
        },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message);
      window.location.href = data.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={qty} onChange={(e) => setQty(parseInt(e.target.value))} style={{ height: 34, border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', fontSize: 13 }}>
          {[1, 2, 3, 4, 5, 6].filter((n) => remaining == null || n <= remaining).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={buy} disabled={loading} className="btn-primary" style={{ fontSize: 13 }}>
          {loading ? 'Redirecting…' : `🎟️ Buy · $${(parseInt(price) * qty)}`}
        </button>
      </div>
      {remaining != null && remaining <= 20 && <span style={{ fontSize: 11, color: '#b84d00' }}>Only {remaining} left!</span>}
      {error && <span style={{ fontSize: 11, color: '#dc2626' }}>{error}</span>}
    </div>
  );
}
