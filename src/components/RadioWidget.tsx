import { useState, useRef } from 'react';
import { RADIO_STATIONS } from '../config/env';

interface Props { compact?: boolean; }

export default function RadioWidget({ compact }: Props) {
  const [playing, setPlaying] = useState<number | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = (i: number) => {
    const station = RADIO_STATIONS[i];
    const audio = audioRef.current!;

    if (playing === i) {
      audio.pause();
      setPlaying(null);
      return;
    }

    if (!station.src) return;

    audio.src = station.src;
    setLoading(i);
    setPlaying(i);
    audio.play()
      .then(() => setLoading(null))
      .catch(() => { setPlaying(null); setLoading(null); });
  };

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {RADIO_STATIONS.map((s, i) => (
          <div
            key={i}
            onClick={() => toggle(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: playing === i ? 'var(--accent-soft)' : '#f5f7ff',
              borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
              border: playing === i ? '1px solid var(--accent)' : '1px solid transparent',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 12,
              background: playing === i ? 'var(--accent)' : 'rgba(0,0,0,0.08)',
              color: playing === i ? 'white' : 'var(--text)',
            }}>
              {loading === i ? '⏳' : playing === i ? '⏸' : '▶'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.lang}</div>
            </div>
            {playing === i && (
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
                {[1, 2, 3].map((b) => (
                  <div key={b} style={{
                    width: 3, borderRadius: 2, background: 'var(--accent)',
                    animation: `eq${b} 0.8s ease-in-out infinite alternate`,
                    height: b === 2 ? 16 : 10,
                  }} />
                ))}
              </div>
            )}
          </div>
        ))}
        <audio ref={audioRef} preload="none" />
        <style>{`
          @keyframes eq1 { from { height: 6px; } to { height: 14px; } }
          @keyframes eq2 { from { height: 14px; } to { height: 6px; } }
          @keyframes eq3 { from { height: 8px; } to { height: 16px; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="radio-widget">
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#e07820', marginBottom: 10 }}>
        📻 Desi Radio
      </div>

      {RADIO_STATIONS.map((s, i) => (
        <div
          key={i}
          className={`radio-row ${playing === i ? 'playing' : ''}`}
          onClick={() => toggle(i)}
        >
          <div className="radio-play">
            {loading === i ? '⏳' : playing === i ? '⏸' : '▶'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(200,210,240,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.lang}</div>
          </div>
          {playing === i && (
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
              {[1, 2, 3].map((b) => (
                <div key={b} style={{
                  width: 3, borderRadius: 2, background: '#e07820',
                  animation: `eq${b} 0.8s ease-in-out infinite alternate`,
                  height: b === 2 ? 14 : 8,
                }} />
              ))}
            </div>
          )}
        </div>
      ))}

      <audio ref={audioRef} preload="none" />
      <style>{`
        @keyframes eq1 { from { height: 4px; } to { height: 12px; } }
        @keyframes eq2 { from { height: 12px; } to { height: 4px; } }
        @keyframes eq3 { from { height: 6px; } to { height: 14px; } }
      `}</style>
    </div>
  );
}
