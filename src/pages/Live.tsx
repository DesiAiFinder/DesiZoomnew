import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';
import GoLiveModal from '../components/GoLiveModal';

interface OutletCtx { onAuthOpen: () => void; }

export interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  city: string;
  platform: string;
  stream_url: string;
  status: string;
  created_at: string;
}

// Convert common live URLs into embeddable iframe URLs
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube: watch?v=, youtu.be/, /live/
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let id = u.searchParams.get('v');
      if (!id && u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
      if (!id && u.pathname.startsWith('/live/')) id = u.pathname.split('/live/')[1];
      if (id) return `https://www.youtube.com/embed/${id.split('?')[0]}?autoplay=0`;
    }
    // Facebook video/live
    if (u.hostname.includes('facebook.com')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }
    // Twitch
    if (u.hostname.includes('twitch.tv')) {
      const channel = u.pathname.slice(1).split('/')[0];
      if (channel) return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function Live() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { user } = useAuth();
  const { city } = useLocation();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [myStreams, setMyStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [goLiveOpen, setGoLiveOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('live_streams')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);
    setStreams((data as LiveStream[]) ?? []);

    if (user) {
      const { data: mine } = await supabase
        .from('live_streams')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5);
      setMyStreams((mine as LiveStream[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#2a0a0a,#180606)' }}>
        <div className="eyebrow">🔴 Live</div>
        <h1>DesiZoom Live</h1>
        <p>Community live streams — news, events, celebrations & more. Streams are reviewed by admins before going public.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: 18 }}>Live & Recent Streams</h2>
          <button
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={() => user ? setGoLiveOpen(true) : onAuthOpen()}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            Go Live
          </button>
        </div>

        {/* My pending submissions */}
        {myStreams.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {myStreams.map((s) => (
              <div key={s.id} style={{ padding: '10px 14px', background: s.status === 'pending' ? '#fff8e6' : '#fee2e2', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, fontSize: 13 }}>
                {s.status === 'pending' ? '⏳' : '❌'} <strong>{s.title}</strong> — {s.status === 'pending' ? 'awaiting admin approval' : 'was not approved'}
              </div>
            ))}
          </div>
        )}

        {loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 18 }}>
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 14 }} />)}
            </div>
          : streams.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📹</div>
                <p>No live streams right now.</p>
                <p style={{ fontSize: 13 }}>Hosting an event in {city}? Hit <strong>Go Live</strong> to stream it to the community.</p>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 18 }}>
                {streams.map((s) => {
                  const embed = toEmbedUrl(s.stream_url);
                  return (
                    <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'white' }}>
                      <div style={{ aspectRatio: '16/9', background: '#000' }}>
                        {embed
                          ? <iframe
                              src={embed}
                              title={s.title}
                              style={{ width: '100%', height: '100%', border: 'none' }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          : <a href={s.stream_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', textDecoration: 'none', fontSize: 14 }}>
                              ▶️ Watch on {s.platform}
                            </a>
                        }
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>LIVE</span>
                          <span style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                        </div>
                        {s.description && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{s.description}</div>}
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>📍 {s.city} · via {s.platform}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
        }
      </div>

      {goLiveOpen && <GoLiveModal onClose={() => { setGoLiveOpen(false); load(); }} />}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
    </>
  );
}
