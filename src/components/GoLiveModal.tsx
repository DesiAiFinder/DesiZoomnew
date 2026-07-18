import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';
import { CITIES } from '../config/env';

interface Props { onClose: () => void; }

export default function GoLiveModal({ onClose }: Props) {
  const { user } = useAuth();
  const { city, detectedCity } = useLocation();
  const defaultCity = detectedCity || city;

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [streamCity, setStreamCity] = useState(defaultCity);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const cityOptions = detectedCity && !CITIES.includes(detectedCity)
    ? [detectedCity, ...CITIES]
    : CITIES;

  const submit = async () => {
    if (!title.trim()) return setMsg({ text: 'Title is required.', ok: false });
    if (!url.trim() || !/^https?:\/\//.test(url.trim())) {
      return setMsg({ text: 'Enter a valid stream link (YouTube, Facebook, etc).', ok: false });
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('live_streams').insert({
        user_id: user!.id,
        title: title.trim(),
        description: desc.trim() || null,
        city: streamCity,
        platform,
        stream_url: url.trim(),
        status: 'pending',
      });
      if (error) throw error;
      setMsg({ text: '✅ Submitted! An admin will review and approve your stream shortly.', ok: true });
      setTimeout(onClose, 1600);
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : 'Error submitting', ok: false });
    }
    setLoading(false);
  };

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
        <h2 style={{ fontSize: 20 }}>🔴 Go Live on DesiZoom</h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 14px' }}>
          Start your live stream on YouTube, Facebook or Instagram, then paste the link here.
          Your stream appears on the Live page after admin approval.
        </p>

        <div className="field"><label>Stream title *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali Mela 2026 — Live from Little Elm" /></div>
        <div className="field"><label>Description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What are you streaming?" /></div>

        <div className="field">
          <label>Platform</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="youtube">YouTube Live</option>
            <option value="facebook">Facebook Live</option>
            <option value="instagram">Instagram Live</option>
            <option value="twitch">Twitch</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="field"><label>Stream link *</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/live/..." /></div>

        <div className="field">
          <label>City</label>
          <select value={streamCity} onChange={(e) => setStreamCity(e.target.value)}>
            {cityOptions.map((c) => (
              <option key={c} value={c}>{c === detectedCity ? `📍 ${c} (your location)` : c}</option>
            ))}
          </select>
        </div>

        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Submitting…' : 'Submit for Approval'}
        </button>
        {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
      </div>
    </div>
  );
}
