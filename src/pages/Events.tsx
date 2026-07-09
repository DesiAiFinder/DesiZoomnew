import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchEvents } from '../services/supabase';
import PostModal from '../components/PostModal';
import type { Post } from '../types';

interface OutletCtx { onAuthOpen: () => void; }

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function Events() {
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const { city } = useLocation();
  const { user } = useAuth();
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchEvents(city).catch(() => []);
    setEvents(data as Post[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [city]);

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#1a0a2a,#100618)' }}>
        <div className="eyebrow">🎉 Events</div>
        <h1>Desi Events Near You</h1>
        <p>Melas, garba nights, cultural programs, temple calendars & community gatherings.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18 }}>Events in {city}</h2>
          <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>+ Add Event</button>
        </div>

        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12 }}>
                <div className="skeleton" style={{ width: 60, height: 60 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 18, width: '55%' }} />
                  <div className="skeleton" style={{ height: 13, width: '75%' }} />
                </div>
              </div>
            ))
          : events.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <p>No events posted yet in {city}.</p>
                <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>+ Add an Event</button>
              </div>
            : events.map((e) => {
                const hasDate = !!e.event_date;
                const d = hasDate ? new Date(e.event_date!) : null;
                return (
                  <div key={e.id} style={{
                    display: 'flex', gap: 16, padding: 16,
                    border: '1px solid var(--border)', borderRadius: 12,
                    background: 'white', marginBottom: 12,
                    transition: 'box-shadow 0.2s',
                  }}
                    onMouseEnter={(el) => (el.currentTarget.style.boxShadow = '0 4px 20px rgba(28,35,64,0.1)')}
                    onMouseLeave={(el) => (el.currentTarget.style.boxShadow = 'none')}
                  >
                    {d ? (
                      <div style={{
                        width: 60, height: 60, borderRadius: 10,
                        background: 'var(--pink-soft)', color: 'var(--pink-text)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{d.toLocaleString('en-US', { month: 'short' })}</span>
                      </div>
                    ) : (
                      <div style={{ width: 60, height: 60, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎉</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{e.title}</div>
                      {e.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{e.description}</div>}
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
                        <span>📍 {e.city}</span>
                        {d && <span>🕐 {formatDate(e.event_date!)} at {formatTime(e.event_date!)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
        }
      </div>

      {postOpen && <PostModal onClose={() => { setPostOpen(false); load(); }} defaultType="event" />}
    </>
  );
}
