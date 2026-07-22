import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';
import SellerOnboard from '../components/SellerOnboard';
import StarRating from '../components/StarRating';
import { CITIES } from '../config/env';

interface OutletCtx { onAuthOpen: () => void; }

const SERVICE_CATEGORIES = [
  '🕉️ Priest & Pooja', '🍛 Catering', '📸 Photography & Video', '💄 Mehndi & Makeup',
  '💇 Salon & Beauty', '🎪 Event Decor', '📚 Tutoring', '💻 IT & Tax Services', '🛂 Immigration Help',
  '🔧 Home Services', '✈️ Travel', '📌 Other',
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Provider {
  id: string; user_id: string; business_name: string; categories: string[];
  city: string; phone?: string; description?: string;
  available_days: string[]; availability_note?: string;
}
interface Offering {
  id: string; provider_id: string; title: string; category: string;
  description?: string; price_cents: number; duration_label?: string; is_active: boolean;
  provider?: Provider;
}
interface Booking {
  id: string; offering_id: string; provider_user_id: string; customer_id: string;
  requested_date: string; requested_time?: string; note?: string; customer_phone?: string;
  amount_cents: number; status: string; created_at: string;
  offering?: { title: string };
}
interface ServiceRequest {
  id: string; user_id: string; city: string; category: string; title: string;
  description?: string; budget?: string; status: string; created_at: string;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Services() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const { city, detectedCity } = useLocation();
  const defaultCity = detectedCity || city;

  const [tab, setTab] = useState<'book' | 'requests' | 'provide'>('book');
  const [activeCat, setActiveCat] = useState('All');
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [myProvider, setMyProvider] = useState<Provider | null>(null);
  const [myOfferings, setMyOfferings] = useState<Offering[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});

  // Booking modal
  const [bookingFor, setBookingFor] = useState<Offering | null>(null);
  const [bDate, setBDate] = useState('');
  const [bTime, setBTime] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [bNote, setBNote] = useState('');
  const [bBusy, setBBusy] = useState(false);
  const [bErr, setBErr] = useState('');

  // Request form
  const [showReqForm, setShowReqForm] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fCat, setFCat] = useState(SERVICE_CATEGORIES[0]);
  const [fDesc, setFDesc] = useState('');
  const [fBudget, setFBudget] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fCity, setFCity] = useState(defaultCity);
  const [fMsg, setFMsg] = useState('');

  // Provider register form
  const [pName, setPName] = useState('');
  const [pCats, setPCats] = useState<string[]>([]);
  const [pPhone, setPPhone] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pMsg, setPMsg] = useState('');

  // Provider: availability + new offering
  const [availDays, setAvailDays] = useState<string[]>([]);
  const [availNote, setAvailNote] = useState('');
  const [oTitle, setOTitle] = useState('');
  const [oCat, setOCat] = useState(SERVICE_CATEGORIES[0]);
  const [oPrice, setOPrice] = useState('');
  const [oDuration, setODuration] = useState('');
  const [oDesc, setODesc] = useState('');
  const [oMsg, setOMsg] = useState('');

  const load = async () => {
    setLoading(true);
    // Offerings for city (via provider city)
    const { data: offs } = await supabase
      .from('service_offerings')
      .select('*, provider:service_providers(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(60);
    const rows = ((offs as Offering[]) ?? []).filter((o) => o.provider?.city === city || o.provider?.city?.endsWith(city.split(',')[1]?.trim() ?? ''));
    setOfferings(rows);

    // Provider ratings
    const providerIds = [...new Set(rows.map((o) => o.provider?.user_id).filter(Boolean))];
    if (providerIds.length) {
      const { data: rat } = await supabase
        .from('provider_ratings')
        .select('provider_user_id, avg_rating, review_count')
        .in('provider_user_id', providerIds as string[]);
      const map: Record<string, { avg: number; count: number }> = {};
      (rat ?? []).forEach((r) => { map[r.provider_user_id] = { avg: r.avg_rating, count: r.review_count }; });
      setRatings(map);
    }

    const { data: reqs } = await supabase
      .from('service_requests')
      .select('id, user_id, city, category, title, description, budget, status, created_at')
      .eq('status', 'open')
      .eq('city', city)
      .order('created_at', { ascending: false })
      .limit(30);
    setRequests((reqs as ServiceRequest[]) ?? []);

    if (user) {
      const { data: prov } = await supabase
        .from('service_providers').select('*').eq('user_id', user.id).maybeSingle();
      setMyProvider(prov as Provider | null);
      if (prov) {
        setAvailDays((prov as Provider).available_days ?? []);
        setAvailNote((prov as Provider).availability_note ?? '');
        const { data: mine } = await supabase
          .from('service_offerings').select('*').eq('provider_id', (prov as Provider).id).order('created_at');
        setMyOfferings((mine as Offering[]) ?? []);
      }
      const { data: books } = await supabase
        .from('service_bookings')
        .select('*, offering:service_offerings(title)')
        .or(`customer_id.eq.${user.id},provider_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      setMyBookings((books as Booking[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [city, user]);

  const catName = (c: string) => c.replace(/^\S+\s/, '');
  const filteredOfferings = activeCat === 'All'
    ? offerings
    : offerings.filter((o) => o.category === catName(activeCat));

  const startBooking = (o: Offering) => {
    if (!user) return onAuthOpen();
    setBookingFor(o); setBDate(''); setBTime(''); setBPhone(''); setBNote(''); setBErr('');
  };

  const submitBooking = async () => {
    if (!bDate) return setBErr('Pick a date.');
    if (!bPhone.trim()) return setBErr('Phone is required so the provider can coordinate.');
    setBBusy(true); setBErr('');
    try {
      const { data, error } = await supabase.functions.invoke('create-booking-session', {
        body: {
          offering_id: bookingFor!.id,
          customer_id: user!.id,
          requested_date: bDate,
          requested_time: bTime || null,
          customer_phone: bPhone.trim(),
          note: bNote.trim() || null,
          success_url: `${window.location.origin}/services?booking=success`,
          cancel_url: `${window.location.origin}/services`,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      window.location.href = data.url;
    } catch (e: unknown) {
      setBErr(e instanceof Error ? e.message : 'Something went wrong');
      setBBusy(false);
    }
  };

  const submitRequest = async () => {
    if (!fTitle.trim()) return setFMsg('Title is required.');
    if (!fPhone.trim()) return setFMsg('Phone number is required.');
    const { data: inserted, error } = await supabase.from('service_requests').insert({
      user_id: user!.id, city: fCity, category: catName(fCat),
      title: fTitle.trim(), description: fDesc.trim() || null,
      budget: fBudget.trim() || null, contact_phone: fPhone.trim(),
    }).select('id').single();
    if (error) { setFMsg(error.message); return; }
    // Notify matching providers (fire-and-forget)
    if (inserted?.id) {
      supabase.functions.invoke('notify-providers', { body: { request_id: inserted.id } }).catch(() => {});
    }
    setFMsg('✅ Posted! Matching providers have been notified.');
    setFTitle(''); setFDesc(''); setFBudget(''); setFPhone('');
    setTimeout(() => { setShowReqForm(false); setFMsg(''); load(); }, 1000);
  };

  const registerProvider = async () => {
    if (!pName.trim()) return setPMsg('Business name is required.');
    if (pCats.length === 0) return setPMsg('Pick at least one category.');
    const { error } = await supabase.from('service_providers').insert({
      user_id: user!.id, business_name: pName.trim(),
      categories: pCats.map(catName), city: defaultCity,
      phone: pPhone.trim() || null, description: pDesc.trim() || null,
    });
    if (error) { setPMsg(error.message); return; }
    setPMsg('✅ Registered!');
    load();
  };

  const saveAvailability = async () => {
    if (!myProvider) return;
    await supabase.from('service_providers')
      .update({ available_days: availDays, availability_note: availNote.trim() || null })
      .eq('id', myProvider.id);
    setOMsg('✅ Availability saved');
    setTimeout(() => setOMsg(''), 1500);
  };

  const addOffering = async () => {
    if (!myProvider) return;
    if (!oTitle.trim()) return setOMsg('Service name is required.');
    const priceNum = parseFloat(oPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(priceNum) || priceNum <= 0) return setOMsg('Enter a valid price.');
    const { error } = await supabase.from('service_offerings').insert({
      provider_id: myProvider.id,
      title: oTitle.trim(),
      category: catName(oCat),
      description: oDesc.trim() || null,
      price_cents: Math.round(priceNum * 100),
      duration_label: oDuration.trim() || null,
    });
    if (error) { setOMsg(error.message); return; }
    setOMsg('✅ Service added');
    setOTitle(''); setOPrice(''); setODuration(''); setODesc('');
    load();
  };

  const toggleOffering = async (o: Offering) => {
    await supabase.from('service_offerings').update({ is_active: !o.is_active }).eq('id', o.id);
    load();
  };

  const setBookingStatus = async (b: Booking, status: string) => {
    await supabase.from('service_bookings').update({ status }).eq('id', b.id);
    load();
  };

  const bookingStatusStyle = (s: string) => ({
    fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
    background: s === 'paid' ? '#e8f9ee' : s === 'pending' ? '#fff8e6' : s === 'completed' ? '#e8eef8' : '#fee2e2',
    color: s === 'paid' ? '#128c4b' : s === 'pending' ? '#92700c' : s === 'completed' ? '#2a4a8a' : '#dc2626',
  });

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#1a2a0a,#101806)' }}>
        <div className="eyebrow">🛠️ Bookings</div>
        <h1>Desi Services — Book Trusted Providers</h1>
        <p>Poojas, catering, mehndi, photography & more. Fixed prices, secure payment, contact shared after booking.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'white', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 24, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {([['book', '📅 Book a service'], ['requests', '🙋 Custom requests'], ['provide', '🛠️ For providers']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                background: tab === id ? 'var(--accent)' : 'transparent',
                color: tab === id ? '#412402' : 'var(--muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {err && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 10 }}>{err}</div>}

        {/* ══ BOOK TAB ══ */}
        {tab === 'book' && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {['All', ...SERVICE_CATEGORIES].map((c) => (
                <span key={c} className={`chip ${activeCat === c ? 'active' : ''}`} style={{ fontSize: 12 }} onClick={() => setActiveCat(c)}>{c}</span>
              ))}
            </div>

            {loading
              ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />)}
                </div>
              : filteredOfferings.length === 0
                ? <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 44, marginBottom: 10 }}>📅</div>
                    <p>No bookable services in {city} yet.</p>
                    <p style={{ fontSize: 13 }}>Are you a provider? List your services in the "For providers" tab — it's free.</p>
                  </div>
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                    {filteredOfferings.map((o) => (
                      <div key={o.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{o.title}</div>
                          <div style={{ fontWeight: 800, fontSize: 17, color: '#166534', whiteSpace: 'nowrap' }}>${(o.price_cents / 100).toFixed(0)}</div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span>{o.provider?.business_name} · 📍 {o.provider?.city}{o.duration_label ? ` · ⏱ ${o.duration_label}` : ''}</span>
                          {o.provider?.user_id && ratings[o.provider.user_id] && (
                            <StarRating value={ratings[o.provider.user_id].avg} count={ratings[o.provider.user_id].count} size={13} />
                          )}
                        </div>
                        {o.description && <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{o.description}</div>}
                        {(o.provider?.available_days?.length ?? 0) > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Available:</span>
                            {WEEKDAYS.map((d) => (
                              <span key={d} style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                                background: o.provider!.available_days.includes(d) ? 'var(--accent-soft)' : '#f3f0ea',
                                color: o.provider!.available_days.includes(d) ? 'var(--accent-text)' : '#c0b8a8',
                              }}>{d}</span>
                            ))}
                          </div>
                        )}
                        {o.provider?.availability_note && (
                          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>🕐 {o.provider.availability_note}</div>
                        )}
                        <button className="btn-primary" style={{ marginTop: 'auto' }} onClick={() => startBooking(o)}>
                          📅 Book · ${(o.price_cents / 100).toFixed(0)}
                        </button>
                      </div>
                    ))}
                  </div>
            }

            {/* My bookings (as customer) */}
            {user && myBookings.filter((b) => b.customer_id === user.id).length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 17, marginBottom: 12 }}>Your bookings</h2>
                {myBookings.filter((b) => b.customer_id === user.id).map((b) => (
                  <div key={b.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{b.offering?.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>📅 {b.requested_date}{b.requested_time ? ` · ${b.requested_time}` : ''}</span>
                    <span style={bookingStatusStyle(b.status)}>{b.status}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ REQUESTS TAB ══ */}
        {tab === 'requests' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0, maxWidth: 480 }}>
                Don't see what you need in the catalog? Post a custom request — providers in {city} will reach out.
              </p>
              <button className="btn-primary" onClick={() => user ? setShowReqForm((v) => !v) : onAuthOpen()}>+ Post Request</button>
            </div>

            {showReqForm && (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 20, maxWidth: 560 }}>
                <div className="field"><label>What do you need? *</label><input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="e.g. Mehndi artist for 5 people, Aug 9" /></div>
                <div className="field"><label>Category</label>
                  <select value={fCat} onChange={(e) => setFCat(e.target.value)}>
                    {SERVICE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field"><label>Details</label><textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} /></div>
                <div className="field"><label>Budget (optional)</label><input value={fBudget} onChange={(e) => setFBudget(e.target.value)} placeholder="e.g. $200–300" /></div>
                <div className="field"><label>Your phone *</label><input value={fPhone} onChange={(e) => setFPhone(e.target.value)} /></div>
                <div className="field"><label>City</label>
                  <select value={fCity} onChange={(e) => setFCity(e.target.value)}>
                    {(detectedCity && !CITIES.includes(detectedCity) ? [detectedCity, ...CITIES] : CITIES).map((c) => (
                      <option key={c} value={c}>{c === detectedCity ? `📍 ${c} (your location)` : c}</option>
                    ))}
                  </select>
                </div>
                <button className="btn-primary" onClick={submitRequest}>Post Request</button>
                {fMsg && <div style={{ fontSize: 13, marginTop: 8, color: fMsg.startsWith('✅') ? '#166534' : '#dc2626' }}>{fMsg}</div>}
              </div>
            )}

            {requests.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>No open requests in {city}.</div>
              : requests.map((r) => (
                  <div key={r.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--accent-soft)', color: 'var(--accent-text)', padding: '2px 8px', borderRadius: 20 }}>{r.category}</span>
                    </div>
                    {r.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{r.description}</div>}
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      📍 {r.city} · 🕐 {timeAgo(r.created_at)}{r.budget ? ` · 💰 ${r.budget}` : ''}
                    </div>
                  </div>
                ))
            }
          </>
        )}

        {/* ══ PROVIDE TAB ══ */}
        {tab === 'provide' && (
          !user ? (
            <div style={{ padding: '14px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13.5 }}>
              <button className="btn-primary" onClick={onAuthOpen}>Sign in</button> to register as a service provider.
            </div>
          ) : !myProvider ? (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18, maxWidth: 560 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>Register as a provider — free</h3>
              <div className="field"><label>Business / your name *</label><input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. Pandit Sharma Ji" /></div>
              <div className="field">
                <label>Categories *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SERVICE_CATEGORIES.map((c) => (
                    <span key={c} className={`chip ${pCats.includes(c) ? 'active' : ''}`} style={{ fontSize: 12 }}
                      onClick={() => setPCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}>{c}</span>
                  ))}
                </div>
              </div>
              <div className="field"><label>Phone</label><input value={pPhone} onChange={(e) => setPPhone(e.target.value)} /></div>
              <div className="field"><label>About your services</label><textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} /></div>
              <button className="btn-primary" onClick={registerProvider}>Register</button>
              {pMsg && <div style={{ fontSize: 13, marginTop: 8, color: pMsg.startsWith('✅') ? '#166534' : '#dc2626' }}>{pMsg}</div>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
              <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, fontSize: 13.5 }}>
                ✅ <strong>{myProvider.business_name}</strong> · {myProvider.categories.join(', ')}
              </div>

              {/* Bank connect (required to get paid) */}
              <SellerOnboard />

              {/* Availability */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                <h3 style={{ fontSize: 15, marginBottom: 10 }}>📆 Your availability</h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {WEEKDAYS.map((d) => (
                    <span key={d} className={`chip ${availDays.includes(d) ? 'active' : ''}`} style={{ fontSize: 12 }}
                      onClick={() => setAvailDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}>{d}</span>
                  ))}
                </div>
                <div className="field"><label>Notes</label><input value={availNote} onChange={(e) => setAvailNote(e.target.value)} placeholder='e.g. "Weekdays after 6pm, all day weekends"' /></div>
                <button className="btn-primary" onClick={saveAvailability}>Save availability</button>
              </div>

              {/* Offerings */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                <h3 style={{ fontSize: 15, marginBottom: 10 }}>💼 Your services & prices</h3>
                {myOfferings.map((o) => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1, opacity: o.is_active ? 1 : 0.5 }}>{o.title}</span>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: '#166534' }}>${(o.price_cents / 100).toFixed(0)}</span>
                    <button onClick={() => toggleOffering(o)} style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>
                      {o.is_active ? 'Hide' : 'Show'}
                    </button>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <div className="field"><label>Service name *</label><input value={oTitle} onChange={(e) => setOTitle(e.target.value)} placeholder="e.g. Satyanarayana Pooja" /></div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div className="field" style={{ flex: 1, minWidth: 140 }}><label>Price *</label><input value={oPrice} onChange={(e) => setOPrice(e.target.value)} placeholder="$100" /></div>
                    <div className="field" style={{ flex: 1, minWidth: 140 }}><label>Duration</label><input value={oDuration} onChange={(e) => setODuration(e.target.value)} placeholder="~2 hours" /></div>
                  </div>
                  <div className="field"><label>Category</label>
                    <select value={oCat} onChange={(e) => setOCat(e.target.value)}>
                      {SERVICE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>What's included</label><textarea value={oDesc} onChange={(e) => setODesc(e.target.value)} placeholder="Samagri included, performed in Telugu or Hindi…" /></div>
                  <button className="btn-primary" onClick={addOffering}>+ Add service</button>
                  {oMsg && <div style={{ fontSize: 13, marginTop: 8, color: oMsg.startsWith('✅') ? '#166534' : '#dc2626' }}>{oMsg}</div>}
                </div>
              </div>

              {/* Incoming bookings */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                <h3 style={{ fontSize: 15, marginBottom: 10 }}>📅 Incoming bookings</h3>
                {myBookings.filter((b) => b.provider_user_id === user.id).length === 0
                  ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>No bookings yet. Once a customer books & pays, their contact appears here.</div>
                  : myBookings.filter((b) => b.provider_user_id === user.id).map((b) => (
                      <div key={b.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{b.offering?.title}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>📅 {b.requested_date}{b.requested_time ? ` · ${b.requested_time}` : ''}</span>
                          <span style={bookingStatusStyle(b.status)}>{b.status}</span>
                        </div>
                        {b.status === 'paid' && b.customer_phone && (
                          <div style={{ fontSize: 13, marginTop: 4 }}>
                            📞 Customer: <a href={`tel:${b.customer_phone}`} style={{ fontWeight: 700, color: '#166534' }}>{b.customer_phone}</a>
                            {b.note && <span style={{ color: 'var(--muted)' }}> · "{b.note}"</span>}
                          </div>
                        )}
                        {b.status === 'paid' && (
                          <button
                            onClick={() => setBookingStatus(b, 'completed')}
                            style={{ marginTop: 8, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', cursor: 'pointer' }}
                          >✓ Mark completed</button>
                        )}
                      </div>
                    ))
                }
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Booking modal ── */}
      {bookingFor && (
        <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && setBookingFor(null)}>
          <div className="modal">
            <button onClick={() => setBookingFor(null)} style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            <h2 style={{ fontSize: 19 }}>📅 Book: {bookingFor.title}</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 14px' }}>
              {bookingFor.provider?.business_name} · <strong style={{ color: '#166534' }}>${(bookingFor.price_cents / 100).toFixed(0)}</strong>
              {bookingFor.provider?.availability_note ? ` · ${bookingFor.provider.availability_note}` : ''}
            </p>
            <div className="field"><label>Date *</label><input type="date" value={bDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setBDate(e.target.value)} /></div>
            <div className="field"><label>Preferred time</label><input value={bTime} onChange={(e) => setBTime(e.target.value)} placeholder="e.g. 10:00 AM" /></div>
            <div className="field"><label>Your phone *</label><input value={bPhone} onChange={(e) => setBPhone(e.target.value)} placeholder="Shared with provider after payment" /></div>
            <div className="field"><label>Note to provider</label><textarea value={bNote} onChange={(e) => setBNote(e.target.value)} placeholder="Address area, number of people, language preference…" /></div>
            <button className="btn-primary" onClick={submitBooking} disabled={bBusy}>
              {bBusy ? 'Redirecting…' : `Pay $${(bookingFor.price_cents / 100).toFixed(0)} & Book`}
            </button>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
              Secure payment via Stripe. Provider receives your contact details once payment completes.
            </p>
            {bErr && <div style={{ fontSize: 13, marginTop: 6, color: '#dc2626' }}>{bErr}</div>}
          </div>
        </div>
      )}
    </>
  );
}
