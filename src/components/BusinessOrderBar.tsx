import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Live incoming-orders panel for a business owner.
 *
 * Rendered in the My Business sidebar. Updates over Supabase realtime, so a new
 * paid order appears (with a chime) without refreshing, and status can be
 * advanced straight from here — no need to open My Restaurant during a rush.
 *
 * Requires `orders` in the supabase_realtime publication; see
 * migration_orders_realtime.sql. RLS still applies, so an owner only ever
 * receives rows for their own restaurant.
 */

const FLOW: Record<string, string> = { paid: 'preparing', preparing: 'ready', ready: 'picked_up' };
const LABEL: Record<string, string> = { paid: 'Start preparing', preparing: 'Mark ready', ready: 'Mark picked up' };
const ACTIONABLE = ['paid', 'preparing', 'ready'];

interface OrderRow {
  id: string;
  status: string;
  customer_name?: string;
  subtotal_cents: number;
  created_at: string;
  order_items?: { item_name: string; quantity: number }[];
}

/** Short chime via WebAudio — avoids shipping an audio asset. */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start(); osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 800);
  } catch { /* audio stays blocked until a user gesture — silent is fine */ }
}

export default function BusinessOrderBar() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [sound, setSound] = useState(() => localStorage.getItem('dz_order_sound') !== 'off');
  const [busy, setBusy] = useState<string | null>(null);
  const known = useRef<Set<string>>(new Set());

  const load = async (uid: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, customer_name, subtotal_cents, created_at, order_items(item_name, quantity)')
      .eq('owner_id', uid)
      .in('status', ACTIONABLE)
      .order('created_at', { ascending: true });
    const rows = (data as OrderRow[]) ?? [];
    rows.forEach((o) => known.current.add(o.id));
    setOrders(rows);
  };

  useEffect(() => {
    if (!user) { setOrders([]); return; }
    load(user.id);

    const channel = supabase
      .channel(`biz-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `owner_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as OrderRow | undefined;
          if (row && ACTIONABLE.includes(row.status) && !known.current.has(row.id)) {
            known.current.add(row.id);
            if (localStorage.getItem('dz_order_sound') !== 'off') playChime();
          }
          load(user.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const advance = async (o: OrderRow) => {
    const next = FLOW[o.status];
    if (!next) return;
    setBusy(o.id);
    await supabase.from('orders').update({ status: next }).eq('id', o.id);
    setBusy(null);
    if (user) load(user.id);
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    localStorage.setItem('dz_order_sound', next ? 'on' : 'off');
    if (next) playChime(); // this gesture also unlocks audio for later chimes
  };

  if (!user) return null;

  const waiting = orders.filter((o) => o.status === 'paid').length;

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 17 }} aria-hidden>🔔</span>
        <strong style={{ fontSize: 14.5 }}>Live orders</strong>
        {waiting > 0 && (
          <span style={{ fontSize: 10.5, fontWeight: 700, background: '#fff8e6', color: '#92700c', padding: '2px 9px', borderRadius: 20 }}>
            {waiting} new
          </span>
        )}
        <button
          onClick={toggleSound}
          aria-label={sound ? 'Mute new order sound' : 'Unmute new order sound'}
          title={sound ? 'Sound on' : 'Sound off'}
          style={{ marginLeft: 'auto', fontSize: 14, padding: '4px 9px', borderRadius: 18, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
        >
          {sound ? '🔔' : '🔕'}
        </button>
      </div>

      {orders.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          No active orders. New ones appear here the moment they're paid.
        </div>
      ) : (
        orders.map((o) => (
          <div key={o.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <strong style={{ fontSize: 13 }}>{o.customer_name || 'Customer'}</strong>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>${(o.subtotal_cents / 100).toFixed(2)}</span>
              <span style={{
                marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: o.status === 'ready' ? '#e8f9ee' : '#fff8e6',
                color: o.status === 'ready' ? '#128c4b' : '#92700c',
              }}>{o.status}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 8 }}>
              {(o.order_items ?? []).map((i) => `${i.quantity}× ${i.item_name}`).join(', ') || '—'}
            </div>
            {FLOW[o.status] && (
              <button
                onClick={() => advance(o)}
                disabled={busy === o.id}
                style={{
                  width: '100%', fontSize: 12.5, fontWeight: 700, padding: '7px 12px', borderRadius: 20,
                  border: 'none', background: '#ea580c', color: 'white',
                  cursor: busy === o.id ? 'wait' : 'pointer',
                }}
              >
                {busy === o.id ? '…' : LABEL[o.status]}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
