import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Customer-facing "where's my order" card, live-updating.
 *
 * Sits in the Order page sidebar under the cart. Renders nothing when the
 * customer has no order in flight, so the sidebar is unchanged the rest of the
 * time. Needs `orders` in the realtime publication — see
 * migration_orders_realtime.sql.
 */

const STEPS = [
  { key: 'paid', label: 'Ordered' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'picked_up', label: 'Picked up' },
];

interface LiveOrder {
  id: string;
  status: string;
  subtotal_cents: number;
  pickup_time?: string;
  restaurant?: { name?: string } | null;
  order_items?: { item_name: string; quantity: number }[];
}

export default function OrderStatusCard() {
  const { user } = useAuth();
  const [order, setOrder] = useState<LiveOrder | null>(null);

  const load = async (uid: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, subtotal_cents, pickup_time, restaurant:restaurants(name), order_items(item_name, quantity)')
      .eq('customer_id', uid)
      .in('status', ['paid', 'preparing', 'ready'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setOrder((data as LiveOrder) ?? null);
  };

  useEffect(() => {
    if (!user) { setOrder(null); return; }
    load(user.id);

    const channel = supabase
      .channel(`my-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
        () => load(user.id)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!order) return null;

  const idx = STEPS.findIndex((s) => s.key === order.status);
  const items = (order.order_items ?? []).map((i) => `${i.quantity}× ${i.item_name}`).join(', ');

  return (
    <div style={{ background: 'white', border: '1px solid #ea580c', borderRadius: 14, padding: '14px 16px', marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }} aria-hidden>🕐</span>
        <strong style={{ fontSize: 14 }}>Order in progress</strong>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, background: '#e8f9ee', color: '#128c4b', padding: '2px 9px', borderRadius: 20 }}>
          Live
        </span>
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
        {items || 'Your order'} · ${(order.subtotal_cents / 100).toFixed(2)}
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 10 }}>
        {STEPS.map((s, i) => (
          <div key={s.key} style={{ flex: 1 }}>
            <div style={{ height: 3, background: i <= idx ? '#128c4b' : 'var(--border)' }} />
            <div style={{ fontSize: 10, marginTop: 5, textAlign: 'center', color: i <= idx ? '#128c4b' : 'var(--muted)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 9, fontSize: 11.5, color: 'var(--muted)' }}>
        {order.status === 'ready'
          ? `Ready for pickup at ${order.restaurant?.name ?? 'the restaurant'}`
          : `Pickup ${order.pickup_time ?? 'ASAP'} · ${order.restaurant?.name ?? ''}`}
      </div>
    </div>
  );
}
