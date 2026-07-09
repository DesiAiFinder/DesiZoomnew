import { useState, useRef } from 'react';
import { RADIO_STATIONS } from '../config/env';

interface Props { compact?: boolean; }

export default function RadioWidget({ compact }: Props) {
  const [playing, setPlaying] = useState<number | null>(null);
  const [nowPlaying, setNowPlaying] = useState('Tap a station to play');
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = (i: number) => {
    const station = RADIO_STATIONS[i];
    const audio = audioRef.current!;

    if (playing === i) {
      audio.pause();
      setPlaying(null);
      setNowPlaying('Tap a station to play');
      return;
    }

    if (station.src) {
      audio.src = station.src;
      audio.play().catch(() => {});
    }
    setPlaying(i);
    setNowPlaying(`${station.name} — now playing`);
  };

  return (
    <div className={compact ? '' : 'radio-widget'}>
      {!compact && (
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#e07820' }}>
          📻 Desi Radio
        </div>
      )}

      {RADIO_STATIONS.map((s, i) => (
        <div
          key={i}
          className={`radio-row ${playing === i ? 'playing' : ''}`}
          onClick={() => toggle(i)}
          style={compact ? { background: '#f5f7ff', borderRadius: 8, marginBottom: 6 } : {}}
        >
          <div className="radio-play">{playing === i ? '⏸' : '▶'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: compact ? 'var(--text)' : 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
            <div style={{ fontSize: 10, color: compact ? 'var(--muted)' : 'rgba(200,210,240,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.lang}</div>
          </div>
        </div>
      ))}

      {!compact && (
        <div style={{ fontSize: 10, color: 'rgba(180,190,220,0.7)', marginTop: 4 }}>
          Add stream URLs in config/env.ts
        </div>
      )}

      <audio ref={audioRef} preload="none" />

      {/* Expose nowPlaying for parent */}
      <div id="now-playing-text" data-text={nowPlaying} style={{ display: 'none' }} />
    </div>
  );
}
