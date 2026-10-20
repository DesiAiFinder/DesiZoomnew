import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchEventsByState } from '../services/supabase';
import PostModal from '../components/PostModal';
import AutoEvents from '../components/AutoEvents';
import BuyTicketButton from '../components/BuyTicketButton';
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
  // Events use their own 50–100 mile net, not the global radius picker.
  const { city, eventCities, eventRadius } = useLocation();
  const { user } = useAuth();
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [err, setErr] = useState('');

  const state = city.split(',')[1]?.trim() || '';

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      setEvents((await fetchEventsByState(state)) as Post[]);
    } catch (e) {
      console.error('events', e);
      setErr("Couldn't load events just now.");
      setEvents([]);
    }
    setLoading(false);
  };

  useEffect(() => { if (state) load(); }, [state]);

  // Near you first, then the rest of the state grouped by city. Someone in
  // Dallas should still find out about a Diwali mela in Houston — they just
  // shouldn't have to scroll past it to see what's on this weekend nearby.
  const near = events.filter((e) => eventCities.includes(e.city));
  const elsewhere = events.filter((e) => !eventCities.includes(e.city));
  const byCity = elsewhere.reduce<Record<string, Post[]>>((acc, e) => {
    (acc[e.city] ??= []).push(e);
    return acc;
  }, {});
  const otherCities = Object.keys(byCity).sort(
    (a, b) => byCity[b].length - byCity[a].length || a.localeCompare(b)
  );

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#1a0a2a,#100618)' }}>
        <div className="eyebrow">🎉 Events</div>
        <h1>Desi Events Near You</h1>
        <p>Melas, garba nights, cultural programs, temple calendars & community gatherings.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {new URLSearchParams(window.location.search).get('ticket') === 'success' && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, fontWeight: 600, color: '#166534' }}>
            🎟️ Tickets purchased! Check your email and your profile for details.
          </div>
        )}
        {/* Auto-populated nearby events (Ticketmaster) */}
        <AutoEvents />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18 }}>Near {city}</h2>
          <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>+ Add Event</button>
        </div>

        {err && (
          <div style={{ padding: '12px 16px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 10, fontSize: 13.5, marginBottom: 16 }}>
            {err} Please try again shortly.
          </div>
        )}

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
                <p>No desi events posted yet in {state || 'your state'}.</p>
                <button className="btn-primary" onClick={() => user ? setPostOpen(true) : onAuthOpen()}>+ Add an Event</button>
              </div>
            : (
              <>
                {near.length > 0 && near.map((e) => <EventRow key={e.id} e={e} />)}

                {near.length === 0 && (
                  <div style={{ padding: '18px 20px', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--muted)', fontSize: 13.5, marginBottom: 24 }}>
                    Nothing within {eventRadius} miles of {city} yet — but here's what's on elsewhere in {state}.
                  </div>
                )}

                {otherCities.length > 0 && (
                  <div style={{ marginTop: near.length ? 36 : 0 }}>
                    <h2 style={{ fontSize: 18, marginBottom: 4 }}>Elsewhere in {state}</h2>
                    <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 16px' }}>
                      Worth the drive for the big ones.
                    </p>
                    {otherCities.map((c) => (
                      <div key={c} style={{ marginBottom: 28 }}>
                        <h3 style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 10, color: 'var(--muted)' }}>
                          {c} · {byCity[c].length} event{byCity[c].length === 1 ? '' : 's'}
                        </h3>
                        {byCity[c].map((e) => <EventRow key={e.id} e={e} />)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
        }
      </div>

      {postOpen && <PostModal onClose={() => { setPostOpen(false); load(); }} defaultType="event" />}
    </>
  );
}

/** One event. Extracted so the near-you list and each city group share it. */
function EventRow({ e }: { e: Post }) {
  const d = e.event_date ? new Date(e.event_date) : null;
  return (
    <div
      style={{
        display: 'flex', gap: 16, padding: 16,
        border: '1px solid var(--border)', borderRadius: 12,
        background: 'white', marginBottom: 12, transition: 'box-shadow 0.2s',
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
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
            {d.toLocaleString('en-US', { month: 'short' })}
          </span>
        </div>
      ) : (
        <div style={{ width: 60, height: 60, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎉</div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{e.title}</span>
          {e.ticket_price_cents
            ? <span style={{ fontSize: 11, fontWeight: 800, background: '#e8f9ee', color: '#128c4b', padding: '2px 8px', borderRadius: 20 }}>${(e.ticket_price_cents / 100).toFixed(0)} ticket</span>
            : <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--blue-soft)', color: 'var(--blue-text)', padding: '2px 8px', borderRadius: 20 }}>Free</span>
          }
        </div>
        {e.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{e.description}</div>}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap', marginBottom: e.ticket_price_cents ? 10 : 0 }}>
          <span>📍 {e.venue || e.city}</span>
          {d && <span>🕐 {formatDate(e.event_date!)} at {formatTime(e.event_date!)}</span>}
        </div>
        <BuyTicketButton event={e} />
      </div>
    </div>
  );
}
