import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'qrcode';
import { useLocation } from '../contexts/LocationContext';
import {
  fetchMyPosts, updateMyPost, deleteMyPost,
  fetchMyPurchases, fetchMySales, submitReview, fetchReviewedBookingIds,
  fetchMyTickets, fetchFavoritePosts, fetchMyAlerts, createAlert, deleteAlert, supabase,
} from '../services/supabase';
import SellerOnboard from '../components/SellerOnboard';
import StarRating from '../components/StarRating';
import type { Post } from '../types';

type Tab = 'listings' | 'orders' | 'bookings' | 'tickets' | 'saved' | 'alerts' | 'money';

interface TicketRow {
  id: string; quantity: number; amount_cents: number; created_at: string;
  event?: { title?: string; event_date?: string; venue?: string; city?: string };
}
interface AlertRow {
  id: string; city: string; keyword?: string; post_type?: string;
}

const TYPE_ICON: Record<string, string> = {
  deal: '🏷️', marketplace: '🛍️', roommate: '🏘️', event: '🎉', question: '☕',
};

interface PayRow {
  id: string; amount_cents: number; commission_cents: number; status: string;
  created_at: string; post?: { title?: string; image_urls?: string[] };
}
interface BookingRow {
  id: string; requested_date: string; requested_time?: string; status: string;
  amount_cents: number; customer_id: string; provider_user_id: string;
  offering_id?: string;
  offering?: { title?: string };
}

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('listings');
  const [posts, setPosts] = useState<Post[]>([]);
  const [purchases, setPurchases] = useState<PayRow[]>([]);
  const [sales, setSales] = useState<PayRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editing, setEditing] = useState<Post | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [ePrice, setEPrice] = useState('');

  // Reviews
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<BookingRow | null>(null);
  const [rStars, setRStars] = useState(5);
  const [rComment, setRComment] = useState('');

  // Tickets / saved / alerts / food orders
  const { city } = useLocation();
  const [foodOrders, setFoodOrders] = useState<Array<{ id: string; status: string; subtotal_cents: number; pickup_time?: string; created_at: string; restaurant?: { name?: string }; order_items?: { item_name: string; quantity: number }[] }>>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [aKeyword, setAKeyword] = useState('');
  const [aType, setAType] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [p, pur, sal, { data: books }] = await Promise.all([
      fetchMyPosts(user.id),
      fetchMyPurchases(user.id),
      fetchMySales(user.id),
      supabase
        .from('service_bookings')
        .select('*, offering:service_offerings(title)')
        .or(`customer_id.eq.${user.id},provider_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
    ]);
    setPosts(p as Post[]);
    setPurchases(pur as PayRow[]);
    setSales(sal as PayRow[]);
    setBookings((books as BookingRow[]) ?? []);
    setReviewedIds(await fetchReviewedBookingIds(user.id));

    const [tix, favs, als, { data: fo }] = await Promise.all([
      fetchMyTickets(user.id).catch(() => []),
      fetchFavoritePosts(user.id).catch(() => []),
      fetchMyAlerts(user.id).catch(() => []),
      supabase
        .from('orders')
        .select('id, status, subtotal_cents, pickup_time, created_at, restaurant:restaurants(name), order_items(item_name, quantity)')
        .eq('customer_id', user.id)
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(15),
    ]);
    setFoodOrders((fo as typeof foodOrders) ?? []);
    setTickets(tix as TicketRow[]);
    setSavedPosts(favs as unknown as Post[]);
    setAlerts(als as AlertRow[]);

    // Generate QR codes for tickets
    const codes: Record<string, string> = {};
    for (const t of tix as TicketRow[]) {
      codes[t.id] = await QRCode.toDataURL(
        `DESIZOOM-TICKET:${t.id}`,
        { width: 180, margin: 1, color: { dark: '#2c1a10', light: '#ffffff' } }
      ).catch(() => '');
    }
    setQrCodes(codes);

    setLoading(false);
  };

  const addAlert = async () => {
    if (!user) return;
    if (!aKeyword.trim() && !aType) return;
    await createAlert(user.id, city, aKeyword.trim() || null, aType || null).catch(() => {});
    setAKeyword(''); setAType('');
    load();
  };

  const removeAlert = async (id: string) => {
    await deleteAlert(id).catch(() => {});
    load();
  };

  const submitTheReview = async () => {
    if (!reviewing || !user) return;
    await submitReview({
      booking_id: reviewing.id,
      offering_id: reviewing.offering_id,
      provider_user_id: reviewing.provider_user_id,
      reviewer_id: user.id,
      rating: rStars,
      comment: rComment.trim() || undefined,
    }).catch(() => {});
    setReviewing(null); setRStars(5); setRComment('');
    load();
  };

  useEffect(() => { load(); }, [user]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
        <p>Sign in to see your profile.</p>
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member';
  const activePosts = posts.filter((p) => p.is_active);
  const completedSales = sales.filter((s) => s.status === 'completed');
  const earned = completedSales.reduce((s, x) => s + (x.amount_cents - x.commission_cents), 0);

  const openEdit = (p: Post) => {
    setEditing(p); setETitle(p.title); setEDesc(p.description || '');
    setEPrice(p.price_cents ? (p.price_cents / 100).toFixed(2) : (p.price || ''));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const patch: Record<string, unknown> = { title: eTitle.trim(), description: eDesc.trim() || null };
    if (editing.type === 'marketplace') {
      const n = parseFloat(ePrice.replace(/[^0-9.]/g, ''));
      if (!isNaN(n) && n > 0) patch.price_cents = Math.round(n * 100);
    } else {
      patch.price = ePrice || null;
    }
    await updateMyPost(editing.id, patch).catch(() => {});
    setEditing(null);
    load();
  };

  const markSold = async (p: Post) => {
    await updateMyPost(p.id, { is_sold: true }).catch(() => {});
    load();
  };

  const remove = async (p: Post) => {
    if (!window.confirm(`Remove "${p.title}"? It will no longer be visible.`)) return;
    await deleteMyPost(p.id).catch(() => {});
    load();
  };

  const statusPill = (s: string) => ({
    fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
    background: s === 'paid' || s === 'completed' ? '#e8f9ee' : s === 'pending' ? '#fff8e6' : '#fee2e2',
    color: s === 'paid' || s === 'completed' ? '#128c4b' : s === 'pending' ? '#92700c' : '#dc2626',
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'listings', label: `📝 Listings (${activePosts.length})` },
    { id: 'orders', label: `🍛 Food orders (${foodOrders.length})` },
    { id: 'bookings', label: `📅 Bookings (${bookings.length})` },
    { id: 'tickets', label: `🎟️ Tickets (${tickets.length})` },
    { id: 'saved', label: `❤️ Saved (${savedPosts.length})` },
    { id: 'alerts', label: `🔔 Alerts (${alerts.length})` },
    { id: 'money', label: '💰 Money' },
  ];

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#3d1509,#2a0e05)' }}>
        <div className="eyebrow">👤 Profile</div>
        <h1>Hi, {displayName}</h1>
        <p>Manage your listings, bookings, purchases and sales, all in one place.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Active listings', value: activePosts.length },
            { label: 'Sales', value: completedSales.length },
            { label: 'Earned', value: `$${(earned / 100).toFixed(2)}` },
            { label: 'Purchases', value: purchases.filter((p) => p.status === 'completed').length },
          ].map((s) => (
            <div key={s.label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Bank status */}
        <div style={{ marginBottom: 24 }}>
          <SellerOnboard />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'white', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 20, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color: tab === t.id ? '#412402' : 'var(--muted)',
              }}
            >{t.label}</button>
          ))}
        </div>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10, marginBottom: 10 }} />)

        /* ── LISTINGS ── */
        ) : tab === 'listings' ? (
          activePosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
              <p>You haven't posted anything yet.</p>
              <Link to="/marketplace" className="btn-primary" style={{ display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>+ Post something</Link>
            </div>
          ) : (
            activePosts.map((p) => (
              <div key={p.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22 }}>{TYPE_ICON[p.type] || '📌'}</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Link to={`/listing/${p.id}`} style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', textDecoration: 'none' }}>{p.title}</Link>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {p.type} · {p.city}
                    {p.price_cents ? ` · $${(p.price_cents / 100).toFixed(2)}` : p.price ? ` · ${p.price}` : ''}
                    {p.is_sold && ' · SOLD'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => openEdit(p)} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>✏️ Edit</button>
                  {p.type === 'marketplace' && !p.is_sold && (
                    <button onClick={() => markSold(p)} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 7, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', cursor: 'pointer' }}>✓ Mark sold</button>
                  )}
                  <button onClick={() => remove(p)} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>🗑️ Remove</button>
                </div>
              </div>
            ))
          )

        /* ── BOOKINGS ── */
        ) : tab === 'bookings' ? (
          bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
              <p>No service bookings yet.</p>
              <Link to="/services" className="btn-primary" style={{ display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>Browse services</Link>
            </div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20 }}>🛠️</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.offering?.title || 'Service'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {b.customer_id === user.id ? 'You booked' : 'Booked from you'} · 📅 {b.requested_date}{b.requested_time ? ` ${b.requested_time}` : ''} · ${(b.amount_cents / 100).toFixed(0)}
                  </div>
                </div>
                {/* Customer can rate a paid/completed booking */}
                {b.customer_id === user.id && (b.status === 'paid' || b.status === 'completed') && (
                  reviewedIds.has(b.id)
                    ? <span style={{ fontSize: 11.5, color: '#166534' }}>✓ Reviewed</span>
                    : <button onClick={() => { setReviewing(b); setRStars(5); setRComment(''); }} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-text)', cursor: 'pointer' }}>★ Rate</button>
                )}
                <span style={statusPill(b.status)}>{b.status}</span>
              </div>
            ))
          )

        /* ── FOOD ORDERS ── */
        ) : tab === 'orders' ? (
          foodOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🍛</div>
              <p>No food orders yet.</p>
              <Link to="/order" className="btn-primary" style={{ display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>Order pickup</Link>
            </div>
          ) : (
            foodOrders.map((o) => (
              <div key={o.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>🍛 {o.restaurant?.name || 'Restaurant'}</span>
                  <span style={statusPill(o.status)}>{o.status.replace('_', ' ')}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>pickup {o.pickup_time} · ${(o.subtotal_cents / 100).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                  {(o.order_items ?? []).map((it) => `${it.quantity}× ${it.item_name}`).join(', ')}
                </div>
              </div>
            ))
          )

        /* ── TICKETS ── */
        ) : tab === 'tickets' ? (
          tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎟️</div>
              <p>No tickets yet.</p>
              <Link to="/events" className="btn-primary" style={{ display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>Browse events</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
              {tickets.map((t) => (
                <div key={t.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{t.event?.title || 'Event'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 10px' }}>
                    {t.event?.event_date ? new Date(t.event.event_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                    {t.event?.venue ? ` · ${t.event.venue}` : ''} · {t.event?.city}
                  </div>
                  {qrCodes[t.id] && <img src={qrCodes[t.id]} alt="Ticket QR" style={{ width: 150, height: 150, margin: '0 auto' }} />}
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8 }}>
                    {t.quantity} ticket{t.quantity > 1 ? 's' : ''} · ${(t.amount_cents / 100).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>Show this QR at the door</div>
                </div>
              ))}
            </div>
          )

        /* ── SAVED ── */
        ) : tab === 'saved' ? (
          savedPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>❤️</div>
              <p>Nothing saved yet. Tap the ❤️ on any post to save it here.</p>
            </div>
          ) : (
            savedPosts.map((p) => (
              <div key={p.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20 }}>{TYPE_ICON[p.type] || '📌'}</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Link to={`/listing/${p.id}`} style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', textDecoration: 'none' }}>{p.title}</Link>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {p.type} · {p.city}
                    {p.price_cents ? ` · $${(p.price_cents / 100).toFixed(2)}` : p.price ? ` · ${p.price}` : ''}
                  </div>
                </div>
                <Link to={`/listing/${p.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text)', textDecoration: 'none' }}>View →</Link>
              </div>
            ))
          )

        /* ── ALERTS ── */
        ) : tab === 'alerts' ? (
          <div style={{ maxWidth: 560 }}>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 18 }}>
              <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>🔔 Get notified for new posts in {city}</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>
                e.g. keyword "sofa" + For sale, or keyword "2 bedroom" + Accommodations. Requires notifications enabled.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={aKeyword} onChange={(e) => setAKeyword(e.target.value)} placeholder="Keyword (optional)" style={{ flex: 1, minWidth: 140 }} />
                <select value={aType} onChange={(e) => setAType(e.target.value)} style={{ minWidth: 130 }}>
                  <option value="">Any type</option>
                  <option value="deal">Deals</option>
                  <option value="marketplace">For sale</option>
                  <option value="roommate">Accommodations</option>
                  <option value="event">Events</option>
                  <option value="question">Community</option>
                </select>
                <button className="btn-primary" onClick={addAlert}>+ Add alert</button>
              </div>
            </div>
            {alerts.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>No alerts yet.</div>
              : alerts.map((a) => (
                  <div key={a.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 13.5, flex: 1 }}>
                      🔔 {a.keyword ? <strong>"{a.keyword}"</strong> : 'Any post'}
                      {a.post_type ? ` in ${a.post_type}` : ''} · {a.city}
                    </span>
                    <button onClick={() => removeAlert(a.id)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>Remove</button>
                  </div>
                ))
            }
          </div>

        /* ── MONEY ── */
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>🛒 Purchases</h3>
              {purchases.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>No purchases yet.</div>
                : purchases.map((p) => (
                    <div key={p.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{p.post?.title || 'Item'}</span>
                      <span style={{ fontSize: 13 }}>${(p.amount_cents / 100).toFixed(2)}</span>
                      <span style={statusPill(p.status)}>{p.status}</span>
                    </div>
                  ))
              }
            </div>
            <div>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>💵 Sales & bookings income</h3>
              {sales.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>No sales yet. Connect your bank and list items or services to start earning.</div>
                : sales.map((s) => (
                    <div key={s.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{s.post?.title || 'Sale'}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>you get ${((s.amount_cents - s.commission_cents) / 100).toFixed(2)}</span>
                      <span style={statusPill(s.status)}>{s.status}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewing && (
        <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && setReviewing(null)}>
          <div className="modal">
            <button onClick={() => setReviewing(null)} style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            <h2 style={{ fontSize: 19 }}>Rate: {reviewing.offering?.title}</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 14px' }}>Your review helps the community find trusted providers.</p>
            <div style={{ marginBottom: 14 }}>
              <StarRating value={rStars} onChange={setRStars} size={30} />
            </div>
            <div className="field"><label>Comment (optional)</label><textarea value={rComment} onChange={(e) => setRComment(e.target.value)} placeholder="How was the service? Would you recommend them?" /></div>
            <button className="btn-primary" onClick={submitTheReview}>Submit review</button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <button onClick={() => setEditing(null)} style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            <h2 style={{ fontSize: 19 }}>Edit listing</h2>
            <div className="field"><label>Title</label><input value={eTitle} onChange={(e) => setETitle(e.target.value)} /></div>
            <div className="field"><label>Description</label><textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} /></div>
            <div className="field"><label>{editing.type === 'marketplace' ? 'Price ($)' : 'Price / discount'}</label><input value={ePrice} onChange={(e) => setEPrice(e.target.value)} /></div>
            <button className="btn-primary" onClick={saveEdit}>Save changes</button>
          </div>
        </div>
      )}
    </>
  );
}
