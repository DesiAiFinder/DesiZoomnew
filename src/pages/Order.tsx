import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';
import { geocodeCity, milesBetween } from '../services/geo';
import { embedAvailable, startCheckout } from '../services/stripeEmbed';
import OrderStatusCard from '../components/OrderStatusCard';

const WARN_MILES = 10; // pickup distance beyond which we flag "are you sure?"

// Mirrors serviceFee() in create-order-session. Kept in sync deliberately:
// the cart must show the same number Stripe will charge, or the customer
// arrives at checkout to a surprise.
const serviceFee = (subtotalCents: number) =>
  Math.min(Math.round(subtotalCents * 0.02) + 69, 199);

interface OutletCtx { onAuthOpen: () => void; }

interface Restaurant {
  id: string; owner_id: string; name: string; cuisine?: string; city: string;
  address?: string; phone?: string; logo_url?: string; pickup_note?: string; is_open: boolean;
  business_id?: string;
  offers_pickup?: boolean; offers_delivery?: boolean; offers_shipping?: boolean;
  delivery_fee_cents?: number; delivery_minimum_cents?: number;
  delivery_radius_miles?: number; shipping_fee_cents?: number;
}
interface MenuItem {
  id: string; restaurant_id: string; name: string; description?: string;
  category: string; price_cents: number; image_url?: string; is_veg: boolean; is_available: boolean;
}
interface CartLine { id: string; name: string; price_cents: number; quantity: number; }

export default function Order() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const { city, geoLocation } = useLocation();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [active, setActive] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dist, setDist] = useState<Record<string, number>>({}); // restaurant id → miles from user

  // Checkout modal
  const [checkout, setCheckout] = useState(false);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cPickup, setCPickup] = useState('ASAP');
  const [cNote, setCNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery' | 'shipping'>('pickup');
  const [cAddress, setCAddress] = useState('');
  const [params] = useSearchParams();

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

  // Deep link: /order?business=<businesses.id> opens that restaurant's menu
  // directly, so a deal's "Order now" lands on the right place instead of the
  // full list. Runs once the list is loaded; silently ignored if not found
  // (e.g. the restaurant is in another city than the one currently selected).
  useEffect(() => {
    const wanted = params.get('business');
    if (!wanted || active || !restaurants.length) return;
    const match = restaurants.find((r) => r.business_id === wanted);
    if (match) openRestaurant(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurants, params]);

  // Distance from the user (real GPS, else selected city) to each restaurant.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!restaurants.length) return;
      const center = geoLocation ?? await geocodeCity(city);
      if (!center) return;
      const out: Record<string, number> = {};
      for (const r of restaurants) {
        const pt = await geocodeCity(r.address ? `${r.address}, ${r.city}` : r.city);
        if (pt) out[r.id] = milesBetween(center, pt);
      }
      if (!cancelled) setDist(out);
    })();
    return () => { cancelled = true; };
  }, [restaurants, geoLocation, city]);

  // What this restaurant supports (default to pickup for older records)
  const methodsFor = (r: Restaurant) => {
    const m: ('pickup' | 'delivery' | 'shipping')[] = [];
    if (r.offers_pickup !== false) m.push('pickup');
    if (r.offers_delivery) m.push('delivery');
    if (r.offers_shipping) m.push('shipping');
    return m.length ? m : ['pickup' as const];
  };
  const feeFor = (r: Restaurant | null, f: string) =>
    !r ? 0 : f === 'delivery' ? (r.delivery_fee_cents ?? 0) : f === 'shipping' ? (r.shipping_fee_cents ?? 0) : 0;

  const openRestaurant = async (r: Restaurant) => {
    setActive(r); setCart([]);
    setFulfillment(methodsFor(r)[0]);
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
  const svcFee = cart.length ? serviceFee(subtotal) : 0;

  const placeOrder = async () => {
    if (!user) return onAuthOpen();
    if (!cPhone.trim()) { setErr('Phone number is required so they can reach you.'); return; }
    if (fulfillment !== 'pickup' && !cAddress.trim()) {
      setErr(fulfillment === 'delivery' ? 'Delivery address is required.' : 'Shipping address is required.');
      return;
    }
    const minimum = active?.delivery_minimum_cents ?? 0;
    if (fulfillment === 'delivery' && minimum > 0 && subtotal < minimum) {
      setErr(`Delivery requires a minimum order of $${(minimum / 100).toFixed(2)}.`);
      return;
    }
    setBusy(true); setErr('');
    try {
      const successUrl = `${window.location.origin}/order?paid=1`;
      const embedded = await embedAvailable();
      const { data, error } = await supabase.functions.invoke('create-order-session', {
        body: {
          restaurant_id: active!.id,
          customer_id: user.id,
          items: cart,
          customer_name: cName.trim() || null,
          customer_phone: cPhone.trim(),
          pickup_time: cPickup,
          note: cNote.trim() || null,
          fulfillment_type: fulfillment,
          delivery_address: fulfillment === 'pickup' ? null : cAddress.trim(),
          embedded,
          success_url: successUrl,
          cancel_url: `${window.location.origin}/order`,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setCheckout(false);
      await startCheckout(data, successUrl);
      setBusy(false);
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
        <p>{active ? (active.pickup_note || 'Order ahead, skip the wait, pick up fresh.') : 'Order ahead for pickup. Support local desi restaurants directly, no delivery fees.'}</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {new URLSearchParams(window.location.search).get('paid') === '1' && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, fontWeight: 600, color: '#166534' }}>
            ✅ Order placed! Track it below — it updates as the restaurant works on it.
          </div>
        )}

        {/* Live status. Sits at page level, not in the cart sidebar: Stripe
            returns to /order?paid=1, which shows the restaurant list, so a
            sidebar-only card would never be seen after paying. */}
        {!active && <div style={{ maxWidth: 420, marginBottom: 16 }}><OrderStatusCard /></div>}

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
                  <p style={{ fontSize: 13 }}>Own a restaurant? List your menu from your profile. Just 6% per order (vs 30% on delivery apps).</p>
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
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {r.cuisine || 'Indian'} · 📍 {r.city}{dist[r.id] != null ? ` · ~${Math.round(dist[r.id])} mi` : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: r.is_open ? '#128c4b' : '#dc2626' }}>
                          {r.is_open ? '🟢 Taking orders' : '⚫ Closed'}
                        </span>
                        {methodsFor(r).map((m) => (
                          <span key={m} style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                            {m === 'pickup' ? '🏪 Pickup' : m === 'delivery' ? `🚗 Delivery${r.delivery_fee_cents ? ` $${(r.delivery_fee_cents / 100).toFixed(0)}` : ''}` : '📦 Ships'}
                          </span>
                        ))}
                      </div>
                      {dist[r.id] != null && dist[r.id] > WARN_MILES && (
                        <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '4px 8px' }}>
                          ⚠️ ~{Math.round(dist[r.id])} mi away · pickup only, no delivery
                        </div>
                      )}
                    </div>
                  ))}
                </div>
        ) : (
          /* ── Menu + cart ── */
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <button onClick={() => { setActive(null); setCart([]); }} style={{ background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 14, padding: 0 }}>← All restaurants</button>
              {dist[active.id] != null && (
                <div style={{ marginBottom: 14, fontSize: 13, fontWeight: 600, color: dist[active.id] > WARN_MILES ? '#b45309' : '#128c4b', background: dist[active.id] > WARN_MILES ? '#fff7ed' : '#f0fdf4', border: `1px solid ${dist[active.id] > WARN_MILES ? '#fed7aa' : '#bbf7d0'}`, borderRadius: 10, padding: '10px 14px' }}>
                  {dist[active.id] > WARN_MILES && !active.offers_delivery
                    ? `⚠️ ${active.name} is about ${Math.round(dist[active.id])} miles away and does not deliver. Pickup only, so make sure you can drive there.`
                    : `📍 About ${Math.round(dist[active.id])} mi away${active.offers_delivery ? ` · delivers within ${active.delivery_radius_miles ?? 10} mi` : ' · pickup at the restaurant'}`}
                </div>
              )}
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

            {/* Cart + live status for any order already in flight */}
            <div style={{ flex: '0 0 280px', position: 'sticky', top: 80 }}>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
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
                    {feeFor(active, fulfillment) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>
                        <span>{fulfillment === 'delivery' ? 'Delivery' : 'Shipping'}</span>
                        <span>${(feeFor(active, fulfillment) / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)' }}>
                      <span>Service fee</span><span>${(svcFee / 100).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, marginTop: 6 }}>
                      <span>Total</span><span>${((subtotal + feeFor(active, fulfillment) + svcFee) / 100).toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Sales tax added at checkout where it applies.</div>
                    <button className="btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => user ? setCheckout(true) : onAuthOpen()}>
                      Checkout · ${((subtotal + feeFor(active, fulfillment) + svcFee) / 100).toFixed(2)}
                    </button>
                  </>
              }
            </div>
            <OrderStatusCard />
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
            {dist[active.id] != null && dist[active.id] > WARN_MILES && (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '9px 12px', margin: '0 0 12px' }}>
                ⚠️ This restaurant is about {Math.round(dist[active.id])} miles away. Pickup only, no delivery. Only order if you can get there.
              </div>
            )}
            {/* How do you want it? */}
            {methodsFor(active).length > 1 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                {methodsFor(active).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFulfillment(m)}
                    style={{
                      flex: 1, minWidth: 90, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${fulfillment === m ? 'var(--accent)' : 'var(--border)'}`,
                      background: fulfillment === m ? 'var(--accent-soft)' : 'white',
                      color: fulfillment === m ? 'var(--accent-text)' : 'var(--text)',
                      fontWeight: fulfillment === m ? 700 : 500, fontSize: 12.5,
                    }}
                  >
                    {m === 'pickup' ? '🏪 Pickup' : m === 'delivery' ? '🚗 Delivery' : '📦 Ship it'}
                    {feeFor(active, m) > 0 && <span style={{ display: 'block', fontSize: 10.5, fontWeight: 500, color: 'var(--muted)' }}>+${(feeFor(active, m) / 100).toFixed(2)}</span>}
                  </button>
                ))}
              </div>
            )}

            {fulfillment === 'delivery' && (active.delivery_minimum_cents ?? 0) > 0 && subtotal < (active.delivery_minimum_cents ?? 0) && (
              <div style={{ fontSize: 12.5, color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 9, padding: '8px 11px', marginBottom: 10 }}>
                Delivery needs a minimum order of ${((active.delivery_minimum_cents ?? 0) / 100).toFixed(2)}. Add ${(((active.delivery_minimum_cents ?? 0) - subtotal) / 100).toFixed(2)} more, or choose pickup.
              </div>
            )}

            <div className="field"><label>Name</label><input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="For the order" /></div>
            <div className="field"><label>Phone *</label><input value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="Restaurant calls if needed" /></div>
            {fulfillment !== 'pickup' && (
              <div className="field">
                <label>{fulfillment === 'delivery' ? 'Delivery address *' : 'Shipping address *'}</label>
                <textarea
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  placeholder="Street, apt, city, ZIP"
                  style={{ width: '100%', minHeight: 56, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            )}
            <div className="field"><label>{fulfillment === 'pickup' ? 'Pickup time' : fulfillment === 'delivery' ? 'Preferred time' : 'When to ship'}</label>
              <select value={cPickup} onChange={(e) => setCPickup(e.target.value)}>
                <option>ASAP</option>
                <option>In 30 min</option><option>In 1 hour</option>
                <option>6:00 PM</option><option>6:30 PM</option><option>7:00 PM</option><option>7:30 PM</option><option>8:00 PM</option>
              </select>
            </div>
            <div className="field"><label>Note to kitchen</label><textarea value={cNote} onChange={(e) => setCNote(e.target.value)} placeholder="Spice level, allergies…" /></div>
            <button className="btn-primary" onClick={placeOrder} disabled={busy}>
              {busy ? 'Opening checkout…' : `Pay $${((subtotal + feeFor(active, fulfillment) + svcFee) / 100).toFixed(2)} & Order`}
            </button>
            {err && <div style={{ fontSize: 13, marginTop: 8, color: '#dc2626' }}>{err}</div>}
          </div>
        </div>
      )}
    </>
  );
}
