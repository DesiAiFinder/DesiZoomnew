import RadioWidget from '../components/RadioWidget';
import { RADIO_STATIONS } from '../config/env';

export default function Radio() {
  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#1a1000,#0f0800)' }}>
        <div className="eyebrow">📻 Radio</div>
        <h1>Desi Radio</h1>
        <p>Listen to Bollywood, Punjabi, regional Indian music & talk shows, live from your browser.</p>
      </div>

      <div style={{ padding: '32px 32px 48px' }}>
        <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Available Stations</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              Click any station to start playing. Add your licensed stream URLs in <code>src/config/env.ts</code>.
            </p>
          </div>

          <RadioWidget compact />

          {/* Station list detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RADIO_STATIONS.map((s, i) => (
              <div key={i} style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📻</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.lang}</div>
                </div>
                {!s.src && <span style={{ marginLeft: 'auto', fontSize: 11, background: '#fff0e0', color: '#a05010', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>No stream URL</span>}
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 16px', background: 'var(--accent-soft)', borderRadius: 10, fontSize: 13, color: 'var(--accent-text)' }}>
            <strong>📢 Want to add your station?</strong> Add a licensed internet radio stream URL to <code>RADIO_STATIONS</code> in <code>src/config/env.ts</code>. Real desi radio streams require licensing agreements with the broadcasters.
          </div>
        </div>
      </div>
    </>
  );
}
