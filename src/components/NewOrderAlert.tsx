import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Global "you have a new order" strip for business owners.
 *
 * Deliberately narrow in scope: it only counts orders still sitting at `paid`
 * (nobody has started them). Once the owner taps through and hits "Start
 * preparing", this disappears and the full queue lives in the My Business
 * panel. That keeps it an alert rather than a second dashboard.
 *
 * Push notifications cover the case where the app isn't open at all — sent
 * from the stripe-webhook when the order is paid.
 */
export default function NewOrderAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  const load = async (uid: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('owner_id', uid)
      .eq('status', 'paid');
    const rows = (data as { id: string }[]) ?? [];
    // Only chime for orders we haven't seen before, and never on first load.
    const fresh = rows.filter((r) => !seen.current.has(r.id));
    rows.forEach((r) => seen.current.add(r.id));
    if (primed.current && fresh.length && localStorage.getItem('dz_order_sound') !== 'off') {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
        osc.start(); osc.stop(ctx.currentTime + 0.45);
        setTimeout(() => ctx.close(), 800);
      } catch { /* audio blocked until a gesture */ }
    }
    primed.current = true;
    if (fresh.length) setDismissed(false);
    setCount(rows.length);
  };

  useEffect(() => {
    if (!user) { setCount(0); return; }
    load(user.id);

    const channel = supabase
      .channel(`new-order-alert-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `owner_id=eq.${user.id}` },
        () => load(user.id)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!user || count === 0 || dismissed) return null;

  return (
    <div
      role="status"
      style={{
        position: 'sticky', bottom: 0, zIndex: 95,
        background: '#ea580c', color: 'white',
        padding: '11px 16px', boxShadow: '0 -4px 16px rgba(0,0,0,0.18)',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 19 }} aria-hidden>🔔</span>
        <strong style={{ fontSize: 14, flex: 1, minWidth: 140 }}>
          {count} new order{count > 1 ? 's' : ''} waiting
        </strong>
        <button
          onClick={() => navigate('/my-business')}
          style={{ fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 20, border: 'none', background: 'white', color: '#ea580c', cursor: 'pointer' }}
        >
          View orders
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{ fontSize: 15, padding: '5px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.5)', background: 'transparent', color: 'white', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
