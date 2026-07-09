import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { createPost } from '../services/supabase';
import { CITIES } from '../config/env';

interface Props { onClose: () => void; defaultType?: string; }

export default function PostModal({ onClose, defaultType = 'deal' }: Props) {
  const { user } = useAuth();
  const { city } = useLocation();
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [postCity, setPostCity] = useState(city);
  const [category, setCategory] = useState('For sale');
  const [storeName, setStoreName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [rent, setRent] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!title.trim()) return setMsg({ text: 'Title is required.', ok: false });
    setLoading(true);
    try {
      const looksLikeDiscount = /%|off/i.test(price);
      await createPost({
        user_id: user!.id,
        type,
        title: title.trim(),
        description: desc.trim() || null,
        city: postCity,
        price: looksLikeDiscount ? null : price || null,
        discount: looksLikeDiscount ? price : null,
        category: type === 'marketplace' ? category : null,
        event_date: type === 'event' && eventDate ? eventDate : null,
        details: {
          ...(type === 'deal' && storeName ? { store_name: storeName } : {}),
          ...(type === 'deal' && expiry ? { expiry } : {}),
          ...(type === 'roommate' && rent ? { rent } : {}),
        },
        is_active: true,
      });
      setMsg({ text: '✅ Posted successfully!', ok: true });
      setTimeout(onClose, 800);
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : 'Error posting', ok: false });
    }
    setLoading(false);
  };

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
        <h2 style={{ fontSize: 20 }}>Post to DesiZoom</h2>

        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="deal">Deal</option>
            <option value="marketplace">Marketplace listing</option>
            <option value="roommate">Roommate</option>
            <option value="event">Event</option>
          </select>
        </div>

        <div className="field"><label>Title *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you posting?" /></div>
        <div className="field"><label>Description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add details…" /></div>

        {type === 'deal' && (
          <>
            <div className="field"><label>Store name</label><input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Patel Brothers" /></div>
            <div className="field"><label>Discount / Price</label><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder='e.g. "20% OFF" or "$5.99"' /></div>
            <div className="field"><label>Valid until</label><input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
          </>
        )}

        {type === 'marketplace' && (
          <>
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {['For sale','Vehicles','Services','Jobs','Matrimony','Student','Temple','Lost & found'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Price</label><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. $200" /></div>
          </>
        )}

        {type === 'roommate' && (
          <div className="field"><label>Monthly rent</label><input value={rent} onChange={(e) => setRent(e.target.value)} placeholder="e.g. $800/mo" /></div>
        )}

        {type === 'event' && (
          <div className="field"><label>Event date & time</label><input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></div>
        )}

        <div className="field">
          <label>City</label>
          <select value={postCity} onChange={(e) => setPostCity(e.target.value)}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Posting…' : 'Post'}
        </button>
        {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
      </div>
    </div>
  );
}
