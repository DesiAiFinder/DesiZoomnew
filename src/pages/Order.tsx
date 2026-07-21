import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';

interface OutletCtx { onAuthOpen: () => void; }

interface Restaurant {
  id: string; owner_id: string; name: string; cuisine?: string; city: string;
  address?: string; phone?: string; logo_url?: string; pickup_note?: string; is_open: boolean;
}
interface MenuItem {
  id: string; restaurant_id: string; name: string; description?: string;
  category: string; price_cents: number; image_url?: string; is_veg: boolean; is_available: boolean;
}
interface CartLine { id: string; name: string; price_cents: number; quantity: number; }

export default function Order() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const { city } = useLocation();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [active, setActive] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);

  // Checkout modal
  const [checkout, setCheckout] = useState(false);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cPickup, setCPickup] = useState('ASAP');
  const [cNote, setCNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    const state = city.split(',')[1]?.trim();
    supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .ilike('city', state ? `%, ${state}` : city)
      .order('is_open', { ascending: false })
      .then(({ data }) => {
        setRestaurants((data as Restaurant[]) ?? []);
        setLoading(false);
      });
  }, [city]);

  const openRestaurant = async (r: Restaurant) => {
    setActive(r); setCart([]);
    const { data } = await supabase
      .from('menu_items').select('*').eq('restaurant_id', r.id).eq('is_available', true).order('category').order('sort');
    setMenu((data as MenuItem[]) ?? []);
  };

  const addToCart = (m: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === m.id);
      if (existing) return prev.map((c) => c.id === m.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: m.id, name: m.name, price_cents: m.price_cents, quantity: 1 }];
    });
  };
  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((c) => {
      if (c.id !== id) return [c];
      const q = c.quantity + delta;
      return q <= 0 ? [] : [{ ...c, quantity: q }];
    }));
  };

  const subtotal = cart.reduce((s, c) => s + c.price_cents * c.quantity, 0);

  const placeOrder = async () => {
    if (!user) return onAuthOpen();
    if (!cPhone.trim()) { setErr('Phone required for pickup coordination.'); return; }
    setBusy(true); setErr('');
    try {
      const { data, error } = await supabase.functions.invoke('create-order-session', {
        body: {
          restaurant_id: active!.id,
          customer_id: user.id,
          items: cart,
          customer_name: cName.trim() || null,
          customer_phone: cPhone.trim(),
          pickup_time: cPickup,
          note: cNote.trim() || null,
          success_url: `${window.location.origin}/order?paid=1`,
          cancel_url: `${window.location.origin}/order`,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      window.location.href = data.url;
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  const categories = [...new Set(menu.map((m) => m.category))];

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#2a1500,#1a0d00)' }}>
        <div className="eyebrow">🍛 Order Food</div>
        <h1>{active ? active.name : 'Order Pickup from Desi Restaurants'}</h1>
        <p>{active ? (active.pickup_note || 'Order ahead, skip the wait, pick up fresh.') : 'Order ahead for pickup — support local desi restaurants directly, no delivery fees.'}</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {new URLSearchParams(window.location.search).get('paid') === '1' && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, fontWeight: 600, color: '#166534' }}>
            ✅ Order placed! The restaurant is preparing it. Check your profile for status.
          </div>
        )}

        {/* ── Restaurant picker ── */}
        {!active ? (
          loading
            ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}
              </div>
            : restaurants.length === 0
              ? <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>🍛</div>
                  <p>No restaurants taking orders in {city} yet.</p>
                  <p style={{ fontSize: 13 }}>Own a restaurant? List your menu from your profile — just 6% per order (vs 30% on delivery apps).</p>
                </div>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                  {restaurants.map((r) => (
                    <div key={r.id} onClick={() => openRestaurant(r)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16, cursor: 'pointer', opacity: r.is_open ? 1 : 0.6 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, overflow: 'hidden', flexShrink: 0 }}>
                          {r.logo_url ? <img src={r.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🍛'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 15 }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.cuisine || 'Indian'} · 📍 {r.city}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: r.is_open ? '#128c4b' : '#dc2626' }}>
                        {r.is_open ? '🟢 Taking orders' : '⚫ Closed'}
                      </div>
                    </div>
                  ))}
                </div>
        ) : (
          /* ── Menu + cart ── */
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <button onClick={() => { setActive(null); setCart([]); }} style={{ background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 14, padding: 0 }}>← All restaurants</button>
              {categories.map((cat) => (
                <div key={cat} style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 15, marginBottom: 10 }}>{cat}</h3>
                  {menu.filter((m) => m.category === cat).map((m) => (
                    <div key={m.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                      {m.image_url && <img src={m.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.is_veg ? '🟢' : '🔴'} {m.name}</div>
                        {m.description && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.description}</div>}
                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>${(m.price_cents / 100).toFixed(2)}</div>
                      </div>
                      <button onClick={() => addToCart(m)} style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-text)', cursor: 'pointer' }}>+ Add</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Cart */}
            <div style={{ flex: '0 0 280px', position: 'sticky', top: 80, background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>🛒 Your order</h3>
              {cart.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>Add items from the menu.</div>
                : <>
                    {cart.map((c) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => changeQty(c.id, -1)} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>−</button>
                          <span style={{ minWidth: 16, textAlign: 'center' }}>{c.quantity}</span>
                          <button onClick={() => changeQty(c.id, 1)} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>+</button>
                        </div>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                        <span style={{ fontWeight: 600 }}>${((c.price_cents * c.quantity) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
                      <span>Total</span><span>${(subtotal / 100).toFixed(2)}</span>
                    </div>
                    <button className="btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => user ? setCheckout(true) : onAuthOpen()}>
                      Checkout · ${(subtotal / 100).toFixed(2)}
                    </button>
                  </>
              }
            </div>
          </div>
        )}
      </div>

      {/* Checkout modal */}
      {checkout && active && (
        <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && setCheckout(false)}>
          <div className="modal">
            <button onClick={() => setCheckout(false)} style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            <h2 style={{ fontSize: 19 }}>Pickup from {active.name}</h2>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 12px' }}>{active.pickup_note || 'You’ll get a confirmation; pick up at the restaurant.'}</p>
            <div className="field"><label>Name</label><input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="For the order" /></div>
            <div className="field"><label>Phone *</label><input value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="Restaurant calls if needed" /></div>
            <div className="field"><label>Pickup time</label>
              <select value={cPickup} onChange={(e) => setCPickup(e.target.value)}>
                <option>ASAP</option>
                <option>In 30 min</option><option>In 1 hour</option>
                <option>6:00 PM</option><option>6:30 PM</option><option>7:00 PM</option><option>7:30 PM</option><option>8:00 PM</option>
              </select>
            </div>
            <div className="field"><label>Note to kitchen</label><textarea value={cNote} onChange={(e) => setCNote(e.target.value)} placeholder="Spice level, allergies…" /></div>
            <button className="btn-primary" onClick={placeOrder} disabled={busy}>
              {busy ? 'Redirecting…' : `Pay $${(subtotal / 100).toFixed(2)} & Order`}
            </button>
            {err && <div style={{ fontSize: 13, marginTop: 8, color: '#dc2626' }}>{err}</div>}
          </div>
        </div>
      )}
    </>
  );
}
