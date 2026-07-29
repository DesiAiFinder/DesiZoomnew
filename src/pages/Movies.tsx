import { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { fetchDesiMovies, showtimesUrl, DESI_LANGUAGES } from '../services/tmdb';
import type { DesiMovie } from '../services/tmdb';
import { env } from '../config/env';

export default function Movies() {
  const { city } = useLocation();
  const [movies, setMovies] = useState<DesiMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('all');

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
              <a
                key={`${m.language}-${m.id}`}
                href={showtimesUrl(m.title, city)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'var(--text)', background: 'white', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ position: 'relative', aspectRatio: '2/3', background: 'var(--bg)' }}>
                  {m.poster && <img src={m.poster} alt={m.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10.5, fontWeight: 700, background: 'rgba(0,0,0,0.75)', color: '#fac775', padding: '3px 9px', borderRadius: 20 }}>
                    {m.languageLabel}
                  </span>
                  {!!m.rating && m.rating > 0 && (
                    <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10.5, fontWeight: 700, background: 'rgba(0,0,0,0.75)', color: 'white', padding: '3px 8px', borderRadius: 20 }}>
                      ★ {m.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3 }}>{m.title}</div>
                  {m.releaseDate && (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Released {new Date(m.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--accent-text)' }}>
                    🎟️ Find showtimes →
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 24 }}>
          Film data from TMDB. Showtimes open in a search for your city — DesiZoom doesn't sell cinema tickets.
        </p>
      </div>
    </>
  );
}
