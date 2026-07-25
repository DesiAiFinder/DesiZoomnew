import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';
import SellerOnboard from '../components/SellerOnboard';
import { CITIES } from '../config/env';

interface OutletCtx { onAuthOpen: () => void; }

// Business types → which engine powers them
const TYPES = [
  { key: 'restaurant', icon: '🍛', label: 'Restaurant',      hint: 'pickup orders',  engine: 'food' as const },
  { key: 'grocery',    icon: '🛒', label: 'Grocery',         hint: 'pickup orders',  engine: 'food' as const },
  { key: 'catering',   icon: '🍽️', label: 'Catering',        hint: 'bookings',       engine: 'booking' as const },
  { key: 'photo',      icon: '📸', label: 'Photo & Video',   hint: 'bookings',       engine: 'booking' as const },
  { key: 'priest',     icon: '🕉️', label: 'Priest & Pooja',  hint: 'bookings',       engine: 'booking' as const },
  { key: 'beauty',     icon: '💄', label: 'Mehndi & Beauty', hint: 'bookings',       engine: 'booking' as const },
  { key: 'venue',      icon: '🏛️', label: 'Event Hall',      hint: 'date bookings',  engine: 'booking' as const },
  { key: 'other',      icon: '📌', label: 'Something else',  hint: 'tell us',        engine: 'booking' as const },
];

// Map wizard type → service category label used by the Services page
const TYPE_TO_CATEGORY: Record<string, string> = {
  catering: 'Catering', photo: 'Photography & Video', priest: 'Priest & Pooja',
  beauty: 'Mehndi & Makeup', venue: 'Event Decor', other: 'Other',
};

interface ItemDraft { name: string; price: string; }

export default function AddBusiness() {
  const { user } = useAuth();
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { city: userCity, detectedCity } = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Step 1
  const [type, setType] = useState('');
  const engine = TYPES.find((t) => t.key === type)?.engine ?? 'booking';

  // Step 2
  const [name, setName] = useState('');
  const [city, setCity] = useState(detectedCity || userCity || CITIES[0]);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [desc, setDesc] = useState('');

  // Step 3 (first items — optional)
  const [items, setItems] = useState<ItemDraft[]>([{ name: '', price: '' }]);

  // Created ids
  const [bizId, setBizId] = useState<string | null>(null);
  const [engineId, setEngineId] = useState<string | null>(null); // restaurant id or provider id

  // If they already have a business, send them to the dashboard
  useEffect(() => {
    if (!user) return;
    supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
      .then(({ data }) => { if (data && !bizId) navigate('/my-business'); });
  }, [user]);

  const stepLabels = ['What you offer', 'Profile', engine === 'food' ? 'Your menu' : 'Your services', 'Get paid'];

  // Create the business + engine row when leaving step 2
  const createBusiness = async () => {
    if (!user) return onAuthOpen();
    if (!name.trim()) return setErr('Business name is required.');
    if (!city.trim()) return setErr('City is required.');
    setBusy(true); setErr('');
    try {
      const { data: biz, error: bErr } = await supabase.from('businesses').insert({
        owner_id: user.id, name: name.trim(), business_type: type, city: city.trim(),
        address: address.trim() || null, phone: phone.trim() || null, description: desc.trim() || null,
      }).select().single();
      if (bErr) throw bErr;
      setBizId(biz.id);

      if (engine === 'food') {
        const { data: rest, error: rErr } = await supabase.from('restaurants').insert({
          owner_id: user.id, name: name.trim(), city: city.trim(),
          address: address.trim() || null, phone: phone.trim() || null,
          cuisine: type === 'grocery' ? 'Grocery' : 'Indian',
          business_id: biz.id,
        }).select().single();
        if (rErr) throw rErr;
        setEngineId(rest.id);
      } else {
        const { data: prov, error: pErr } = await supabase.from('service_providers').insert({
          user_id: user.id, business_name: name.trim(), city: city.trim(),
          phone: phone.trim() || null, description: desc.trim() || null,
          categories: [TYPE_TO_CATEGORY[type] || 'Other'],
          business_id: biz.id,
        }).select().single();
        if (pErr) throw pErr;
        setEngineId(prov.id);
      }
      setStep(3);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not create your business.');
    } finally { setBusy(false); }
  };

  // Save first items/offerings (optional) when leaving step 3
  const saveItems = async () => {
    const valid = items.filter((i) => i.name.trim() && parseFloat(i.price) > 0);
    if (valid.length === 0) { setStep(4); return; }
    setBusy(true); setErr('');
    try {
      if (engine === 'food') {
        await supabase.from('menu_items').insert(valid.map((i, idx) => ({
          restaurant_id: engineId, name: i.name.trim(),
          price_cents: Math.round(parseFloat(i.price) * 100), category: 'Main', sort: idx,
        })));
      } else {
        await supabase.from('service_offerings').insert(valid.map((i) => ({
          provider_id: engineId, title: i.name.trim(),
          category: TYPE_TO_CATEGORY[type] || 'Other',
          price_cents: Math.round(parseFloat(i.price) * 100),
        })));
      }
      setStep(4);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not save items.');
    } finally { setBusy(false); }
  };

  const inputStyle = { width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 9, padding: '0 12px', fontSize: 13.5, boxSizing: 'border-box' as const, background: 'white' };

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#3d1509,#5c2410)' }}>
        <div className="eyebrow">🏪 Add Business</div>
        <h1>List your business or service on DesiZoom</h1>
        <p>Free to list. Reach desi customers nearby. Low commission, no monthly fees. Takes about 5 minutes.</p>
      </div>

      <div style={{ padding: '24px 32px 48px', maxWidth: 720 }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 22, flexWrap: 'wrap' }}>
          {stepLabels.map((l, i) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11.5, fontWeight: 600, borderRadius: 20, padding: '4px 12px',
                background: step === i + 1 ? 'var(--accent)' : step > i + 1 ? 'var(--accent-soft)' : 'white',
                color: step === i + 1 ? 'white' : step > i + 1 ? 'var(--accent-text)' : 'var(--muted)',
                border: `1px solid ${step >= i + 1 ? 'var(--accent)' : 'var(--border)'}`,
              }}>{step > i + 1 ? '✓ ' : `${i + 1} · `}{l}</span>
              {i < 3 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>→</span>}
            </span>
          ))}
        </div>

        {/* ── STEP 1: type ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>What will you offer the Desi community?</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>Food, groceries, services, venues — pick the closest match.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  style={{
                    padding: '16px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                    border: `2px solid ${type === t.key ? 'var(--accent)' : 'var(--border)'}`,
                    background: type === t.key ? 'var(--accent-soft)' : 'white',
                  }}
                >
                  <div style={{ fontSize: 26 }}>{t.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 5 }}>{t.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{t.hint}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn-primary" disabled={!type} onClick={() => user ? setStep(2) : onAuthOpen()} style={{ opacity: type ? 1 : 0.5 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: profile ── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 14 }}>Tell customers about you</h2>
            <div className="field"><label>Business name *</label><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ruchulu Catering" /></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: '1 1 200px' }}><label>City *</label>
                <select style={inputStyle} value={CITIES.includes(city) ? city : '__other'} onChange={(e) => setCity(e.target.value === '__other' ? '' : e.target.value)}>
                  {[...(detectedCity && !CITIES.includes(detectedCity) ? [detectedCity] : []), ...CITIES].map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__other">Other city…</option>
                </select>
                {!CITIES.includes(city) && (
                  <input style={{ ...inputStyle, marginTop: 6 }} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City, ST (e.g. Little Elm, TX)" />
                )}
              </div>
              <div className="field" style={{ flex: '1 1 180px' }}><label>Phone</label><input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Customers may call you" /></div>
            </div>
            <div className="field"><label>Address {engine === 'food' ? '(pickup location) *' : '(optional)'}</label><input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city" /></div>
            <div className="field"><label>Short description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={engine === 'food' ? 'e.g. Authentic Hyderabadi biryani, fresh daily' : 'e.g. Traditional poojas for all occasions, 15 years experience'} style={{ width: '100%', minHeight: 70, border: '1px solid var(--border)', borderRadius: 9, padding: 10, fontSize: 13.5, boxSizing: 'border-box', fontFamily: 'inherit' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <button className="btn-ghost" style={{ border: '1px solid var(--border)' }} onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" disabled={busy} onClick={createBusiness}>{busy ? 'Creating…' : 'Continue →'}</button>
            </div>
            {err && <div style={{ fontSize: 13, marginTop: 8, color: '#dc2626' }}>{err}</div>}
          </div>
        )}

        {/* ── STEP 3: first items ── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>{engine === 'food' ? 'Add your first menu items' : 'Add your first services'}</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
              Just a few to get started. You can add more and organize them anytime from My Business.
            </p>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input style={{ ...inputStyle, flex: 2 }} value={it.name} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={engine === 'food' ? 'e.g. Chicken Biryani' : 'e.g. Satyanarayana Pooja'} />
                <input style={{ ...inputStyle, flex: 1 }} value={it.price} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} placeholder="Price $" inputMode="decimal" />
              </div>
            ))}
            <button className="btn-ghost" style={{ border: '1px dashed var(--border)', fontSize: 13 }} onClick={() => setItems((p) => [...p, { name: '', price: '' }])}>+ Add another</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button className="btn-ghost" style={{ border: '1px solid var(--border)' }} onClick={() => setStep(4)}>Skip for now</button>
              <button className="btn-primary" disabled={busy} onClick={saveItems}>{busy ? 'Saving…' : 'Continue →'}</button>
            </div>
            {err && <div style={{ fontSize: 13, marginTop: 8, color: '#dc2626' }}>{err}</div>}
          </div>
        )}

        {/* ── STEP 4: get paid ── */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>Get paid</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
              Connect your bank once and payouts arrive automatically.
              {engine === 'food' ? ' Just 6% per order (vs ~30% on delivery apps).' : ' Just 8% per booking. No monthly fees.'}
            </p>
            <SellerOnboard />
            <div style={{ marginTop: 18, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>🎉 {name || 'Your business'} is listed!</div>
              <div style={{ fontSize: 12.5, color: '#166534', marginTop: 3 }}>
                {engine === 'food'
                  ? 'Customers can find you under Order Food once your menu is set and you are marked open.'
                  : 'Customers can find and book you under Bookings.'}
                {' '}You can connect the bank later, but you need it to receive payments.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-primary" onClick={() => navigate('/my-business')}>Go to My Business →</button>
              <button className="btn-ghost" style={{ border: '1px solid var(--border)' }} onClick={() => navigate('/deals')}>📣 Post a deal to promote</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
