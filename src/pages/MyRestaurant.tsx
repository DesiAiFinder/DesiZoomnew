import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';
import SellerOnboard from '../components/SellerOnboard';
import { CITIES } from '../config/env';

interface Restaurant {
  id: string; owner_id: string; name: string; cuisine?: string; city: string;
  address?: string; phone?: string; pickup_note?: string; is_open: boolean;
}
interface MenuItem {
  id: string; name: string; description?: string; category: string;
  price_cents: number; is_veg: boolean; is_available: boolean;
}
interface Order {
  id: string; customer_name?: string; customer_phone?: string; pickup_time?: string;
  note?: string; subtotal_cents: number; status: string; created_at: string;
  order_items?: { item_name: string; quantity: number }[];
}

const CATS = ['Appetizers', 'Main', 'Breads', 'Rice', 'Desserts', 'Drinks'];
const ORDER_FLOW: Record<string, string> = { paid: 'preparing', preparing: 'ready', ready: 'picked_up' };
const ORDER_LABEL: Record<string, string> = { paid: 'Start preparing', preparing: 'Mark ready', ready: 'Mark picked up' };

export default function MyRestaurant() {
  const { user } = useAuth();
  const { city, detectedCity } = useLocation();
  const defaultCity = detectedCity || city;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Create restaurant form
  const [rName, setRName] = useState('');
  const [rCuisine, setRCuisine] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rNote, setRNote] = useState('');
  const [rMsg, setRMsg] = useState('');

  // Add menu item
  const [iName, setIName] = useState('');
  const [iCat, setICat] = useState('Main');
  const [iPrice, setIPrice] = useState('');
  const [iDesc, setIDesc] = useState('');
  const [iVeg, setIVeg] = useState(true);
  const [iMsg, setIMsg] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: r } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle();
    setRestaurant(r as Restaurant | null);
    if (r) {
      const [{ data: m }, { data: o }] = await Promise.all([
        supabase.from('menu_items').select('*').eq('restaurant_id', (r as Restaurant).id).order('category').order('sort'),
        supabase.from('orders').select('*, order_items(item_name, quantity)').eq('owner_id', user.id).neq('status', 'pending').order('created_at', { ascending: false }).limit(30),
      ]);
      setMenu((m as MenuItem[]) ?? []);
      setOrders((o as Order[]) ?? []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const createRestaurant = async () => {
    if (!rName.trim()) return setRMsg('Restaurant name is required.');
    const { error } = await supabase.from('restaurants').insert({
      owner_id: user!.id, name: rName.trim(), cuisine: rCuisine.trim() || null,
      city: defaultCity, address: rAddress.trim() || null, phone: rPhone.trim() || null,
      pickup_note: rNote.trim() || null,
    });
    if (error) return setRMsg(error.message);
    load();
  };

  const addItem = async () => {
    if (!restaurant) return;
    if (!iName.trim()) return setIMsg('Item name required.');
    const p = parseFloat(iPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(p) || p <= 0) return setIMsg('Valid price required.');
    const { error } = await supabase.from('menu_items').insert({
      restaurant_id: restaurant.id, name: iName.trim(), category: iCat,
      price_cents: Math.round(p * 100), description: iDesc.trim() || null, is_veg: iVeg,
    });
    if (error) return setIMsg(error.message);
    setIName(''); setIPrice(''); setIDesc(''); setIMsg('✅ Added');
    load();
  };

  const toggleItem = async (m: MenuItem) => {
    await supabase.from('menu_items').update({ is_available: !m.is_available }).eq('id', m.id);
    load();
  };
  const removeItem = async (m: MenuItem) => {
    await supabase.from('menu_items').delete().eq('id', m.id);
    load();
  };
  const toggleOpen = async () => {
    if (!restaurant) return;
    await supabase.from('restaurants').update({ is_open: !restaurant.is_open }).eq('id', restaurant.id);
    load();
  };
  const advanceOrder = async (o: Order) => {
    const next = ORDER_FLOW[o.status];
    if (!next) return;
    await supabase.from('orders').update({ status: next }).eq('id', o.id);
    load();
  };

  if (!user) return <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}><div style={{ fontSize: 48 }}>🍛</div><p>Sign in to manage your restaurant.</p></div>;

  const activeOrders = orders.filter((o) => ['paid', 'preparing', 'ready'].includes(o.status));

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#2a1500,#1a0d00)' }}>
        <div className="eyebrow">🍛 My Restaurant</div>
        <h1>{restaurant ? restaurant.name : 'List Your Restaurant'}</h1>
        <p>Take pickup orders commission-light — just 6% per order vs ~30% on delivery apps. Keep your customers.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {loading ? (
          <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
        ) : !restaurant ? (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18, maxWidth: 560 }}>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Set up your restaurant — free</h3>
            <div className="field"><label>Restaurant name *</label><input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="e.g. Kuppanna Little Elm" /></div>
            <div className="field"><label>Cuisine</label><input value={rCuisine} onChange={(e) => setRCuisine(e.target.value)} placeholder="South Indian, Punjabi…" /></div>
            <div className="field"><label>Address</label><input value={rAddress} onChange={(e) => setRAddress(e.target.value)} /></div>
            <div className="field"><label>Phone</label><input value={rPhone} onChange={(e) => setRPhone(e.target.value)} /></div>
            <div className="field"><label>Pickup note</label><input value={rNote} onChange={(e) => setRNote(e.target.value)} placeholder="e.g. Ready in ~20 min, park in front" /></div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>City: <strong>{defaultCity}</strong></div>
            <button className="btn-primary" onClick={createRestaurant}>Create restaurant</button>
            {rMsg && <div style={{ fontSize: 13, marginTop: 8, color: '#dc2626' }}>{rMsg}</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 700 }}>
            {/* Status + bank */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '12px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{restaurant.is_open ? '🟢 Open — taking orders' : '⚫ Closed'}</span>
              <button onClick={toggleOpen} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>
                {restaurant.is_open ? 'Pause orders' : 'Open for orders'}
              </button>
            </div>
            <SellerOnboard />

            {/* Incoming orders */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>📋 Active orders ({activeOrders.length})</h3>
              {activeOrders.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>No active orders. Paid orders appear here to prepare.</div>
                : activeOrders.map((o) => (
                    <div key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5 }}>{o.customer_name || 'Customer'}</span>
                        <a href={`tel:${o.customer_phone}`} style={{ fontSize: 12.5, color: '#166534', fontWeight: 600 }}>📞 {o.customer_phone}</a>
                        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>· pickup {o.pickup_time}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginLeft: 'auto', background: o.status === 'ready' ? '#e8f9ee' : '#fff8e6', color: o.status === 'ready' ? '#128c4b' : '#92700c' }}>{o.status}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0' }}>
                        {(o.order_items ?? []).map((it) => `${it.quantity}× ${it.item_name}`).join(', ')} · ${(o.subtotal_cents / 100).toFixed(2)}
                        {o.note ? ` · "${o.note}"` : ''}
                      </div>
                      {ORDER_FLOW[o.status] && (
                        <button onClick={() => advanceOrder(o)} className="btn-primary" style={{ fontSize: 12, padding: '5px 14px' }}>{ORDER_LABEL[o.status]}</button>
                      )}
                    </div>
                  ))
              }
            </div>

            {/* Menu management */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>🍽️ Menu ({menu.length})</h3>
              {menu.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', opacity: m.is_available ? 1 : 0.5 }}>
                  <span style={{ fontSize: 13.5, flex: 1 }}>{m.is_veg ? '🟢' : '🔴'} {m.name} <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {m.category}</span></span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>${(m.price_cents / 100).toFixed(2)}</span>
                  <button onClick={() => toggleItem(m)} style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>{m.is_available ? 'Hide' : 'Show'}</button>
                  <button onClick={() => removeItem(m)} style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input value={iName} onChange={(e) => setIName(e.target.value)} placeholder="Item name" style={{ flex: 2, minWidth: 140 }} />
                  <input value={iPrice} onChange={(e) => setIPrice(e.target.value)} placeholder="$12" style={{ flex: 1, minWidth: 70 }} />
                  <select value={iCat} onChange={(e) => setICat(e.target.value)} style={{ minWidth: 110 }}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
                </div>
                <input value={iDesc} onChange={(e) => setIDesc(e.target.value)} placeholder="Short description (optional)" />
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={iVeg} onChange={(e) => setIVeg(e.target.checked)} /> Vegetarian
                </label>
                <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={addItem}>+ Add item</button>
                {iMsg && <div style={{ fontSize: 12.5, color: iMsg.startsWith('✅') ? '#166534' : '#dc2626' }}>{iMsg}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
