import { useState, useEffect } from 'react';
import { fetchAdminStats, fetchAllUsers } from '../services/supabase';
import type { AdminStats } from '../types';

export default function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');

  useEffect(() => {
    Promise.all([fetchAdminStats(), fetchAllUsers()])
      .then(([s, u]) => {
        setStats(s);
        setUsers(u as Record<string, unknown>[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    const headers = ['ID', 'Email', 'Created At'];
    const rows = users.map((u) => [u.id, u.email, u.created_at].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'desizoom-users.csv'; a.click();
  };

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#1a1a2a,#0f0f1a)' }}>
        <div className="eyebrow">🔐 Admin</div>
        <h1>Admin Dashboard</h1>
        <p>Manage users, posts, and monitor DesiZoom activity.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 24 }}>
          {(['overview', 'users'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                background: activeTab === t ? 'white' : 'transparent',
                color: activeTab === t ? 'var(--text)' : 'var(--muted)',
                boxShadow: activeTab === t ? '0 1px 3px rgba(28,35,64,0.12)' : 'none',
              }}
            >
              {t === 'overview' ? '📊 Overview' : '👥 Users'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
          </div>
        ) : activeTab === 'overview' ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', color: 'var(--blue-soft)' },
                { label: 'New This Month', value: stats?.newUsersThisMonth ?? 0, icon: '📈', color: 'var(--accent-soft)' },
                { label: 'Total Posts', value: stats?.totalPosts ?? 0, icon: '📝', color: 'var(--pink-soft)' },
                { label: 'Posts This Month', value: stats?.postsThisMonth ?? 0, icon: '🔥', color: '#efffee' },
              ].map((s) => (
                <div key={s.label} style={{ padding: 20, background: s.color, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", marginTop: 8 }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>All Users ({users.length})</h2>
              <button className="btn-ghost" style={{ border: '1px solid var(--border)', fontSize: 13 }} onClick={exportCSV}>
                ⬇️ Export CSV
              </button>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    {['Email', 'Role', 'Joined'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={String(u.id)} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--bg)' }}>
                      <td style={{ padding: '10px 14px' }}>{String(u.email || '—')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: u.role === 'admin' ? 'var(--accent-soft)' : 'var(--blue-soft)', color: u.role === 'admin' ? 'var(--accent-text)' : 'var(--blue-text)' }}>
                          {String(u.role || 'user')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>
                        {new Date(String(u.created_at)).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
