import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { fetchDesiMovies, showtimesUrl, DESI_LANGUAGES } from '../services/tmdb';
import type { DesiMovie } from '../services/tmdb';
import { env } from '../config/env';
import PostModal from '../components/PostModal';

interface OutletCtx { onAuthOpen: () => void; }

export default function Movies() {
  const { city } = useLocation();
  const { user } = useAuth();
  const { onAuthOpen } = useOutletContext<OutletCtx>();
  const [movies, setMovies] = useState<DesiMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('all');
  const [screening, setScreening] = useState<DesiMovie | null>(null);
  const [openComposer, setOpenComposer] = useState(false);

  // Open the event composer pre-filled for a group screening
  const organize = (m: DesiMovie | null) => {
    if (!user) return onAuthOpen();
    setScreening(m);
    setOpenComposer(true);
  };

  useEffect(() => {
    fetchDesiMovies()
      .then((m) => setMovies(m))
      .finally(() => setLoading(false));
  }, []);

  const shown = lang === 'all' ? movies : movies.filter((m) => m.language === lang);
  // Only offer language chips we actually have films for
  const available = DESI_LANGUAGES.filter((l) => movies.some((m) => m.language === l.code));

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#2a0d2a,#160716)' }}>
        <div className="eyebrow">🎬 Desi Movies</div>
        <h1>Now in Theatres Near You</h1>
        <p>Hindi, Telugu, Tamil, Malayalam &amp; more, currently playing in US cinemas. Tap any film for showtimes in {city}.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {!env.tmdbKey && (
          <div style={{ padding: '16px 20px', background: '#fff8e6', border: '1px solid #f0d090', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
            ⚠️ Add <code>VITE_TMDB_API_KEY</code> to your environment variables to enable movie listings.
          </div>
        )}

        {/* Group screening pitch */}
        <div style={{ background: 'linear-gradient(120deg,#2a0d2a,#3d1509)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fac775' }}>🎟️ Going with a group? Organise a screening</div>
            <div style={{ fontSize: 12.5, color: 'rgba(240,220,200,0.75)', marginTop: 4, lineHeight: 1.5 }}>
              Block-book seats for opening night and sell them here instead of chasing everyone on WhatsApp.
              Buyers pay you through DesiZoom and get a QR ticket. You keep 95%.
            </div>
          </div>
          <button
            onClick={() => organize(null)}
            style={{ background: '#ef9f27', color: '#412402', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + Create screening
          </button>
        </div>

        {available.length > 0 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
            <span className={`chip ${lang === 'all' ? 'active' : ''}`} onClick={() => setLang('all')}>🎬 All ({movies.length})</span>
            {available.map((l) => (
              <span key={l.code} className={`chip ${lang === l.code ? 'active' : ''}`} onClick={() => setLang(l.code)}>
                {l.label} ({movies.filter((m) => m.language === l.code).length})
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 16 }}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 14 }} />)}
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
            <p>No desi films listed in US theatres right now.</p>
            <p style={{ fontSize: 13 }}>Check back soon — new releases usually land on Fridays.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 16 }}>
            {shown.map((m) => (
              <div
                key={`${m.language}-${m.id}`}
                style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <a href={showtimesUrl(m.title, city)} target="_blank" rel="noopener noreferrer" style={{ display: 'block', position: 'relative', aspectRatio: '2/3', background: 'var(--bg)' }}>
                  {m.poster && <img src={m.poster} alt={m.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10.5, fontWeight: 700, background: 'rgba(0,0,0,0.75)', color: '#fac775', padding: '3px 9px', borderRadius: 20 }}>
                    {m.languageLabel}
                  </span>
                  {!!m.rating && m.rating > 0 && (
                    <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10.5, fontWeight: 700, background: 'rgba(0,0,0,0.75)', color: 'white', padding: '3px 8px', borderRadius: 20 }}>
                      ★ {m.rating.toFixed(1)}
                    </span>
                  )}
                </a>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3, color: 'var(--text)' }}>{m.title}</div>
                  {m.releaseDate && (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Released {new Date(m.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <a href={showtimesUrl(m.title, city)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', textDecoration: 'none' }}>
                      🎟️ Find showtimes →
                    </a>
                    <button
                      onClick={() => organize(m)}
                      style={{ fontSize: 11.5, fontWeight: 700, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      👥 Organise group screening
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 24 }}>
          Film data from TMDB. Showtimes open in a search for your city. DesiZoom doesn't sell cinema tickets,
          but you can organise a group screening and sell those seats here.
        </p>
      </div>

      {openComposer && (
        <PostModal
          defaultType="event"
          prefill={{
            title: screening ? `${screening.title} — group screening` : 'Movie group screening',
            description: screening
              ? `Group screening of ${screening.title} (${screening.languageLabel}). Book your seat here and I'll hold it in the block booking. Meet at the theatre 15 minutes early.`
              : 'Group screening. Book your seat here and I will hold it in the block booking.',
          }}
          onClose={() => { setOpenComposer(false); setScreening(null); }}
        />
      )}
    </>
  );
}
