import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';
import { CITIES } from '../config/env';

interface Props { onClose: () => void; }

type Mode = 'youtube' | 'link' | 'upload';

const MAX_VIDEO_MB = 500;

export default function GoLiveModal({ onClose }: Props) {
  const { user } = useAuth();
  const { city, detectedCity } = useLocation();
  const defaultCity = detectedCity || city;

  const [mode, setMode] = useState<Mode>('youtube');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [category, setCategory] = useState('community');
  const [audience, setAudience] = useState('national');
  const [streamCity, setStreamCity] = useState(defaultCity);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cityOptions = detectedCity && !CITIES.includes(detectedCity)
    ? [detectedCity, ...CITIES]
    : CITIES;

  const pickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) { setMsg({ text: 'Please choose a video file.', ok: false }); return; }
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) { setMsg({ text: `Video must be under ${MAX_VIDEO_MB}MB.`, ok: false }); return; }
    setVideoFile(f);
    setMsg(null);
  };

  const uploadVideo = async (): Promise<string> => {
    const ext = videoFile!.name.split('.').pop() || 'mp4';
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('stream-videos').upload(path, videoFile!, {
      cacheControl: '31536000', contentType: videoFile!.type,
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data } = supabase.storage.from('stream-videos').getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!title.trim()) return setMsg({ text: 'Title is required.', ok: false });

    let streamUrl = url.trim();
    let source = 'link';
    let plat = platform;

    if (mode === 'upload') {
      if (!videoFile) return setMsg({ text: 'Choose a video to upload.', ok: false });
      source = 'upload'; plat = 'upload';
    } else {
      // rtmp:// is the ingest endpoint an encoder pushes to — it's write-only
      // and usually paired with a secret stream key. People copy it from
      // YouTube Studio by mistake, so name the problem instead of just
      // rejecting the format.
      if (/^rtmps?:\/\//i.test(streamUrl)) {
        return setMsg({
          text: 'That\'s the RTMP address your encoder streams to, not a link people can watch. Paste the public watch link instead — in YouTube Studio use Share, and it looks like https://youtube.com/live/…',
          ok: false,
        });
      }
      if (!streamUrl || !/^https?:\/\//.test(streamUrl)) {
        return setMsg({ text: 'Enter a valid link (starts with https://).', ok: false });
      }
      if (mode === 'youtube') plat = 'youtube';
    }

    setLoading(true);
    try {
      if (mode === 'upload') {
        setMsg({ text: 'Uploading video…', ok: true });
        streamUrl = await uploadVideo();
      }
      const { error } = await supabase.from('live_streams').insert({
        user_id: user!.id,
        title: title.trim(),
        description: desc.trim() || null,
        city: streamCity,
        platform: plat,
        category,
        audience,
        source,
        stream_url: streamUrl,
        status: 'pending',
      });
      if (error) throw error;
      setMsg({ text: '✅ Submitted! An admin will review it shortly.', ok: true });
      setTimeout(onClose, 1600);
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : 'Error submitting', ok: false });
    }
    setLoading(false);
  };

  const modeBtn = (m: Mode, label: string) => (
    <button
      onClick={() => { setMode(m); setMsg(null); }}
      style={{
        flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontWeight: 600, fontSize: 12.5, fontFamily: 'inherit',
        background: mode === m ? 'var(--accent)' : 'transparent',
        color: mode === m ? '#412402' : 'var(--muted)',
      }}
    >{label}</button>
  );

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
        <h2 style={{ fontSize: 20 }}>🔴 Share on DesiZoom Live</h2>

        {/* Mode switch */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4, margin: '12px 0 6px', border: '1px solid var(--border)' }}>
          {modeBtn('youtube', '▶️ YouTube')}
          {modeBtn('link', '🔗 Other link')}
          {modeBtn('upload', '⬆️ Upload video')}
        </div>

        {/* YouTube helper */}
        {mode === 'youtube' && (
          <div style={{ background: '#fff8e6', border: '1px solid #f0d090', borderRadius: 10, padding: '12px 14px', margin: '8px 0 4px', fontSize: 12.5, lineHeight: 1.6 }}>
            <strong>Go live on YouTube first, then paste the link:</strong>
            <ol style={{ margin: '6px 0 8px', paddingLeft: 18 }}>
              <li>Open the YouTube app → tap <strong>➕ Create</strong> → <strong>Go Live</strong></li>
              <li>Once live, tap <strong>Share</strong> and copy the video link</li>
              <li>Paste it below 👇</li>
            </ol>
            <a href="https://www.youtube.com/live_dashboard" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: '#b84d00', textDecoration: 'none' }}>Open YouTube Live →</a>
          </div>
        )}

        <div className="field"><label>Title *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali Mela 2026 · Live from Little Elm" /></div>
        <div className="field"><label>Description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What are you sharing?" /></div>

        <div className="field">
          <label>Who is this for?</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="national">🇺🇸 Everyone (all cities)</option>
            <option value="local">📍 My city only</option>
          </select>
        </div>

        <div className="field">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="news">📰 News</option>
            <option value="event">🎉 Event</option>
            <option value="cultural">🎭 Cultural Program</option>
            <option value="religious">🕉️ Religious / Temple</option>
            <option value="community">💬 Community</option>
            <option value="sports">🏏 Sports</option>
            <option value="other">📌 Other</option>
          </select>
        </div>

        {/* Link inputs */}
        {mode === 'youtube' && (
          <div className="field"><label>YouTube link *</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/live/… or youtu.be/…" /></div>
        )}
        {mode === 'link' && (
          <>
            <div className="field">
              <label>Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="facebook">Facebook Live</option>
                <option value="instagram">Instagram Live</option>
                <option value="twitch">Twitch</option>
                <option value="youtube">YouTube</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label>Stream link *</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… the link viewers open to watch" />
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                The public watch link, not the RTMP address from your encoder settings.
              </div>
            </div>
          </>
        )}
        {mode === 'upload' && (
          <div className="field">
            <label>Video file * <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(max {MAX_VIDEO_MB}MB)</span></label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '18px 14px', textAlign: 'center', cursor: 'pointer', fontSize: 13, color: 'var(--muted)' }}
            >
              {videoFile ? <>🎬 {videoFile.name} <span style={{ color: 'var(--accent-text)' }}>· change</span></> : '⬆️ Tap to choose a video (MP4, MOV…)'}
            </div>
            <input ref={fileRef} type="file" accept="video/*" onChange={pickVideo} style={{ display: 'none' }} />
          </div>
        )}

        <div className="field">
          <label>City</label>
          <select value={streamCity} onChange={(e) => setStreamCity(e.target.value)}>
            {cityOptions.map((c) => (
              <option key={c} value={c}>{c === detectedCity ? `📍 ${c} (your location)` : c}</option>
            ))}
          </select>
        </div>

        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? (mode === 'upload' ? 'Uploading…' : 'Submitting…') : 'Submit for Approval'}
        </button>
        {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
      </div>
    </div>
  );
}
