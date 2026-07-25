import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import SellerOnboard from '../components/SellerOnboard';
import PostModal from '../components/PostModal';

interface Business {
  id: string; owner_id: string; name: string; business_type: string; city: string;
  address?: string; phone?: string; description?: string; logo_url?: string; is_active: boolean;
}

const TYPE_META: Record<string, { icon: string; label: string; engine: 'food' | 'booking' }> = {
  restaurant: { icon: '🍛', label: 'Restaurant',      engine: 'food' },
  grocery:    { icon: '🛒', label: 'Grocery',         engine: 'food' },
  catering:   { icon: '🍽️', label: 'Catering',        engine: 'booking' },
  photo:      { icon: '📸', label: 'Photo & Video',   engine: 'booking' },
  priest:     { icon: '🕉️', label: 'Priest & Pooja',  engine: 'booking' },
  beauty:     { icon: '💄', label: 'Mehndi & Beauty', engine: 'booking' },
  venue:      { icon: '🏛️', label: 'Event Hall',      engine: 'booking' },
  other:      { icon: '📌', label: 'Business',        engine: 'booking' },
};

export default function MyBusiness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Editable profile fields
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eAddress, setEAddress] = useState('');
  const [eDesc, setEDesc] = useState('');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle()
      .then(({ data }) => {
        setBiz(data as Business | null);
        setLoading(false);
        if (!data) navigate('/add-business');
      });
  }, [user]);

  if (loading) return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 120, borderRadius: 14 }} /></div>;
  if (!user) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Sign in to manage your business.</div>;
  if (!biz) return null;

  const meta = TYPE_META[biz.business_type] || TYPE_META.other;

  const startEdit = () => {
    setEName(biz.name); setEPhone(biz.phone || ''); setEAddress(biz.address || ''); setEDesc(biz.description || '');
    setEditing(true);
  };

  const saveEdit = async () => {
    const patch = { name: eName.trim() || biz.name, phone: ePhone.trim() || null, address: eAddress.trim() || null, description: eDesc.trim() || null };
    await supabase.from('businesses').update(patch).eq('id', biz.id);
    // Keep engine rows in sync for name/phone/address
    if (meta.engine === 'food') {
      await supabase.from('restaurants').update({ name: patch.name, phone: patch.phone, address: patch.address }).eq('business_id', biz.id);
    } else {
      await supabase.from('service_providers').update({ business_name: patch.name, phone: patch.phone, description: patch.description }).eq('business_id', biz.id);
    }
    setBiz({ ...biz, ...patch } as Business);
    setEditing(false);
    setSavedMsg('✅ Saved'); setTimeout(() => setSavedMsg(''), 1500);
  };

  const toggleActive = async () => {
    await supabase.from('businesses').update({ is_active: !biz.is_active }).eq('id', biz.id);
    if (meta.engine === 'food') await supabase.from('restaurants').update({ is_active: !biz.is_active }).eq('business_id', biz.id);
    setBiz({ ...biz, is_active: !biz.is_active });
  };

  const inputStyle = { width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 11px', fontSize: 13, boxSizing: 'border-box' as const };

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#3d1509,#5c2410)' }}>
        <div className="eyebrow">🏪 My Business</div>
        <h1>{biz.name}</h1>
        <p>{meta.icon} {meta.label} · {biz.city}</p>
      </div>

      <div style={{ padding: '24px 32px 48px', maxWidth: 860 }}>
        {/* Profile card */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, overflow: 'hidden' }}>
              {biz.logo_url ? <img src={biz.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : meta.icon}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{biz.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{meta.label} · {biz.city}{biz.phone ? ` · ${biz.phone}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: biz.is_active ? '#e8f9ee' : '#fee2e2', color: biz.is_active ? '#128c4b' : '#dc2626' }}>
                {biz.is_active ? 'Listed' : 'Hidden'}
              </span>
              <button className="btn-ghost" style={{ border: '1px solid var(--border)', fontSize: 12 }} onClick={toggleActive}>
                {biz.is_active ? '🙈 Hide listing' : '👁️ Show listing'}
              </button>
              <button className="btn-ghost" style={{ border: '1px solid var(--border)', fontSize: 12 }} onClick={editing ? () => setEditing(false) : startEdit}>
                {editing ? '✕ Cancel' : '✏️ Edit'}
              </button>
              {savedMsg && <span style={{ fontSize: 12.5, color: '#166534' }}>{savedMsg}</span>}
            </div>
          </div>

          {biz.description && !editing && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '12px 0 0' }}>{biz.description}</p>}

          {editing && (
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
              <div className="field"><label>Name</label><input style={inputStyle} value={eName} onChange={(e) => setEName(e.target.value)} /></div>
              <div className="field"><label>Phone</label><input style={inputStyle} value={ePhone} onChange={(e) => setEPhone(e.target.value)} /></div>
              <div className="field"><label>Address</label><input style={inputStyle} value={eAddress} onChange={(e) => setEAddress(e.target.value)} /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Description</label><textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} style={{ width: '100%', minHeight: 60, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }} /></div>
              <div><button className="btn-primary" onClick={saveEdit}>Save changes</button></div>
            </div>
          )}
        </div>

        {/* Manage cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12, marginBottom: 16 }}>
          {meta.engine === 'food' ? (
            <Link to="/my-restaurant" style={{ textDecoration: 'none', color: 'var(--text)', background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 22 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 6 }}>Menu & Orders</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>Add menu items, open/close for orders, manage active pickup orders.</div>
            </Link>
          ) : (
            <Link to="/services" style={{ textDecoration: 'none', color: 'var(--text)', background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 22 }}>🛠️</div>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 6 }}>Services & Bookings</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>Manage offerings, availability, and incoming bookings (For providers tab).</div>
            </Link>
          )}

          <button onClick={() => setPostOpen(true)} style={{ textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 22 }}>📣</div>
            <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 6 }}>Promote — post a deal</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>Share an offer in the Deals section and the home feed. Boost it for $2.99 to pin on top.</div>
          </button>

          <Link to="/profile" style={{ textDecoration: 'none', color: 'var(--text)', background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 22 }}>💰</div>
            <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 6 }}>Money</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>See your sales and payouts in your profile's Money tab.</div>
          </Link>
        </div>

        {/* Bank connect */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>🏦 Payouts</div>
          <SellerOnboard />
        </div>
      </div>

      {postOpen && <PostModal onClose={() => setPostOpen(false)} />}
    </>
  );
}
