import { useState, useEffect } from 'react';
import { fetchSellerStats } from '../services/supabase';

interface Props { sellerId: string; }

export default function SellerInfo({ sellerId }: Props) {
  const [stats, setStats] = useState<{ name: string; memberSince?: string; completedSales: number } | null>(null);

  useEffect(() => {
    fetchSellerStats(sellerId).then(setStats).catch(() => {});
  }, [sellerId]);

  if (!stats) return null;

  const since = stats.memberSince
    ? new Date(stats.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%', background: '#e07820', color: 'white',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, flexShrink: 0,
      }}>
        {stats.name.charAt(0).toUpperCase()}
      </span>
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{stats.name}</span>
      {since && <span>· Member since {since}</span>}
      {stats.completedSales > 0 && (
        <span style={{ color: '#166534', fontWeight: 700 }}>· ✓ {stats.completedSales} sale{stats.completedSales > 1 ? 's' : ''}</span>
      )}
    </div>
  );
}
