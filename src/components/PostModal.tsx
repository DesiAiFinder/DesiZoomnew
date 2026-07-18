import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { createPost, supabase } from '../services/supabase';
import { CITIES } from '../config/env';

interface Props { onClose: () => void; defaultType?: string; }

const MAX_PHOTOS = 4;
const MAX_SIZE_MB = 5;

export default function PostModal({ onClose, defaultType = 'deal' }: Props) {
  const { user } = useAuth();
  const { city, detectedCity } = useLocation();

  // Default to GPS city if available, otherwise fall back to selected city
  const defaultCity = detectedCity || city;

  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [postCity, setPostCity] = useState(defaultCity);
  const [category, setCategory] = useState('For sale');
  const [storeName, setStoreName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [rent, setRent] = useState('');
  const [accomType, setAccomType] = useState('Roommate');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build city list: GPS city pinned at top if not already in list
  const cityOptions = detectedCity && !CITIES.includes(detectedCity)
    ? [detectedCity, ...CITIES]
    : CITIES;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setMsg({ text: `"${f.name}" is over ${MAX_SIZE_MB}MB — skipped.`, ok: false });
        return false;
      }
      return true;
    });
    const next = [...photos, ...valid].slice(0, MAX_PHOTOS);
    setPhotos(next);
    setPhotoPreviews(next.map((f) => URL.createObjectURL(f)));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    setPhotoPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('post-images').upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
      });
      if (error) throw new Error(`Photo upload failed: ${error.message}`);
      const { data } = supabase.storage.from('post-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const submit = async () => {
    if (!title.trim()) return setMsg({ text: 'Title is required.', ok: false });
    setLoading(true);
    try {
      // Upload photos first
      const imageUrls = photos.length > 0 ? await uploadPhotos() : [];

      const looksLikeDiscount = /%|off/i.test(price);
      // Convert price to cents for marketplace listings (enables Stripe checkout)
      const priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
      const priceCents = type === 'marketplace' && !isNaN(priceNum) && priceNum > 0
        ? Math.round(priceNum * 100)
        : null;

      await createPost({
        user_id: user!.id,
        type,
        title: title.trim(),
        description: desc.trim() || null,
        city: postCity,
        price: looksLikeDiscount ? null : price || null,
        price_cents: priceCents,
        discount: looksLikeDiscount ? price : null,
        category: type === 'marketplace' ? category : type === 'roommate' ? accomType : null,
        event_date: type === 'event' && eventDate ? eventDate : null,
        image_urls: imageUrls,
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
            <option value="roommate">Accommodation (room / apartment / home)</option>
            <option value="event">Event</option>
          </select>
        </div>

        <div className="field"><label>Title *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you posting?" /></div>
        <div className="field"><label>Description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add details…" /></div>

        {/* Photo upload */}
        <div className="field">
          <label>Photos (up to {MAX_PHOTOS})</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {photoPreviews.map((src, i) => (
              <div key={i} style={{ position: 'relative', width: 64, height: 64 }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                <button
                  onClick={() => removePhoto(i)}
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#dc2626', color: 'white', border: 'none', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}
                >✕</button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed var(--border)', background: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--muted)' }}
              >+</button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

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
          <>
            <div className="field">
              <label>Accommodation type</label>
              <select value={accomType} onChange={(e) => setAccomType(e.target.value)}>
                {['Roommate','Room for rent','Apartment','Home for rent','Sublease'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Monthly rent</label><input value={rent} onChange={(e) => setRent(e.target.value)} placeholder="e.g. $800/mo" /></div>
          </>
        )}

        {type === 'event' && (
          <div className="field"><label>Event date & time</label><input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></div>
        )}

        <div className="field">
          <label>City</label>
          <select value={postCity} onChange={(e) => setPostCity(e.target.value)}>
            {/* GPS city shown first with label if not in preset list */}
            {detectedCity && !CITIES.includes(detectedCity) && (
              <option value={detectedCity}>📍 {detectedCity} (your location)</option>
            )}
            {cityOptions
              .filter((c) => c !== detectedCity || CITIES.includes(detectedCity))
              .map((c) => (
                <option key={c} value={c}>
                  {c === detectedCity ? `📍 ${c} (your location)` : c}
                </option>
              ))
            }
          </select>
          {detectedCity && postCity === detectedCity && (
            <div style={{ fontSize: 11, color: '#166534', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Auto-detected from your GPS
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? (photos.length ? 'Uploading photos…' : 'Posting…') : 'Post'}
        </button>
        {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
      </div>
    </div>
  );
}
