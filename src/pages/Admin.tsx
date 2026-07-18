import { useState, useEffect } from 'react';
import {
  fetchAdminStats, fetchAllUsers,
  adminFetchAllPosts, adminSetPostActive, adminDeletePost, adminSetSponsored,
  adminFetchReports, adminResolveReport,
  adminFetchPayments,
  adminFetchStreams, adminSetStreamStatus,
} from '../services/supabase';
import type { AdminStats, Post } from '../types';

type Tab = 'overview' | 'posts' | 'reports' | 'streams' | 'users';

interface StreamRow {
  id: string;
  title: string;
  description?: string;
  city: string;
  platform: string;
  stream_url: string;
  status: string;
  created_at: string;
}

interface ReportRow {
  id: string;
  reason: string;
  details?: string;
  status: string;
  created_at: string;
  post?: { id: string; title: string; type: string; city: string; is_active: boolean; user_id: string };
}

interface PaymentRow {
  id: string;
  amount_cents: number;
  commission_cents: number;
  status: string;
  created_at: string;
  post?: { title: string };
}

const TYPE_ICONS: Record<string, string> = {
  deal: '🏷️', marketplace: '🛍️', roommate: '🏠', event: '🎉',
};

export default function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [postFilter, setPostFilter] = useState('');

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetchAdminStats(),
      fetchAllUsers(),
      adminFetchAllPosts(),
      adminFetchReports('open'),
      adminFetchPayments(),
      adminFetchStreams(),
    ])
      .then(([s, u, p, r, pay, st]) => {
        setStats(s);
        setUsers(u as Record<string, unknown>[]);
        setPosts(p as Post[]);
        setReports(r as ReportRow[]);
        setPayments(pay as PaymentRow[]);
        setStreams(st as StreamRow[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  // Revenue calculations
  const completed = payments.filter((p) => p.status === 'completed');
  const totalRevenue = completed.reduce((s, p) => s + p.commission_cents, 0);
  const totalVolume = completed.reduce((s, p) => s + p.amount_cents, 0);
  const monthAgo = Date.now() - 30 * 86400000;
  const revenueThisMonth = completed
    .filter((p) => new Date(p.created_at).getTime() > monthAgo)
    .reduce((s, p) => s + p.commission_cents, 0);

  const togglePost = async (p: Post) => {
    await adminSetPostActive(p.id, !p.is_active).catch(() => {});
    setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
  };

  const toggleSponsor = async (p: Post) => {
    await adminSetSponsored(p.id, !p.is_sponsored).catch(() => {});
    setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_sponsored: !p.is_sponsored } : x));
  };

  const removePost = async (p: Post) => {
    if (!window.confirm(`Permanently delete "${p.title}"? This cannot be undone.`)) return;
    await adminDeletePost(p.id).catch(() => {});
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
  };

  const handleReport = async (r: ReportRow, action: 'resolved' | 'dismissed', deactivate?: boolean) => {
    if (deactivate && r.post) {
      await adminSetPostActive(r.post.id, false).catch(() => {});
    }
    await adminResolveReport(r.id, action).catch(() => {});
    setReports((prev) => prev.filter((x) => x.id !== r.id));
  };

  const exportCSV = () => {
    const headers = ['ID', 'Email', 'Created At'];
    const rows = users.map((u) => [u.id, u.email, u.created_at].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'desizoom-users.csv'; a.click();
  };

  const filteredPosts = postFilter
    ? posts.filter((p) =>
        p.title.toLowerCase().includes(postFilter.toLowerCase()) ||
        p.city.toLowerCase().includes(postFilter.toLowerCase()) ||
        p.type.includes(postFilter.toLowerCase()))
    : posts;

  const pendingStreams = streams.filter((s) => s.status === 'pending');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'posts',    label: `📝 Posts (${posts.length})` },
    { id: 'reports',  label: `🚩 Reports${reports.length ? ` (${reports.length})` : ''}` },
    { id: 'streams',  label: `🔴 Streams${pendingStreams.length ? ` (${pendingStreams.length})` : ''}` },
    { id: 'users',    label: `👥 Users (${users.length})` },
  ];

  const handleStream = async (s: StreamRow, status: 'approved' | 'rejected' | 'ended') => {
    await adminSetStreamStatus(s.id, status).catch(() => {});
    setStreams((prev) => prev.map((x) => x.id === s.id ? { ...x, status } : x));
  };

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#1a1a2a,#0f0f1a)' }}>
        <div className="eyebrow">🔐 Admin</div>
        <h1>Admin Dashboard</h1>
        <p>Manage users, posts, reports and monitor DesiZoom revenue.</p>
      </div>

      <div style={{ padding: '24px 32px 48px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                background: activeTab === t.id ? 'white' : 'transparent',
                color: activeTab === t.id ? 'var(--text)' : 'var(--muted)',
                boxShadow: activeTab === t.id ? '0 1px 3px rgba(28,35,64,0.12)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
          </div>

        /* ── OVERVIEW ─────────────────────────────────────────── */
        ) : activeTab === 'overview' ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
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

            {/* Revenue */}
            <h2 style={{ fontSize: 17, marginBottom: 14 }}>💰 Revenue</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Commission Earned (all time)', value: `$${(totalRevenue / 100).toFixed(2)}`, icon: '🏦' },
                { label: 'Commission (30 days)', value: `$${(revenueThisMonth / 100).toFixed(2)}`, icon: '📅' },
                { label: 'Sales Volume', value: `$${(totalVolume / 100).toFixed(2)}`, icon: '💳' },
                { label: 'Completed Sales', value: completed.length, icon: '✅' },
              ].map((s) => (
                <div key={s.label} style={{ padding: 20, background: '#f6fef8', borderRadius: 12, border: '1px solid #cdeed7' }}>
                  <div style={{ fontSize: 24 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", marginTop: 8 }}>{s.value}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent transactions */}
            {payments.length > 0 && (
              <>
                <h2 style={{ fontSize: 17, marginBottom: 14 }}>Recent Transactions</h2>
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                        {['Item', 'Amount', 'Your Cut', 'Status', 'Date'].map((h) => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 15).map((p, i) => (
                        <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--bg)' }}>
                          <td style={{ padding: '10px 14px' }}>{p.post?.title || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>${(p.amount_cents / 100).toFixed(2)}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#166534' }}>${(p.commission_cents / 100).toFixed(2)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                              background: p.status === 'completed' ? '#e8f9ee' : p.status === 'refunded' ? '#fee2e2' : '#fff8e6',
                              color: p.status === 'completed' ? '#128c4b' : p.status === 'refunded' ? '#dc2626' : '#92700c',
                            }}>{p.status}</span>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        /* ── POSTS MODERATION ─────────────────────────────────── */
        ) : activeTab === 'posts' ? (
          <div>
            <input
              value={postFilter}
              onChange={(e) => setPostFilter(e.target.value)}
              placeholder="Filter by title, city, or type…"
              style={{ width: 320, height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', fontSize: 13, marginBottom: 16 }}
            />
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    {['Post', 'Type', 'City', 'Status', 'Created', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((p, i) => (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--bg)', opacity: p.is_active ? 1 : 0.55 }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                      <td style={{ padding: '10px 14px' }}>{TYPE_ICONS[p.type]} {p.type}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{p.city}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                          background: p.is_active ? '#e8f9ee' : '#fee2e2',
                          color: p.is_active ? '#128c4b' : '#dc2626',
                        }}>{p.is_active ? 'active' : 'hidden'}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => togglePost(p)}
                          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', marginRight: 6 }}
                        >
                          {p.is_active ? '🙈 Hide' : '👁️ Show'}
                        </button>
                        <button
                          onClick={() => toggleSponsor(p)}
                          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #f0d090', background: p.is_sponsored ? '#fdf0e0' : 'white', color: '#b84d00', cursor: 'pointer', marginRight: 6, fontWeight: p.is_sponsored ? 700 : 400 }}
                        >
                          {p.is_sponsored ? '⭐ Sponsored' : '☆ Sponsor'}
                        </button>
                        <button
                          onClick={() => removePost(p)}
                          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        /* ── REPORTS QUEUE ────────────────────────────────────── */
        ) : activeTab === 'reports' ? (
          reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <p>No open reports. All clear!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reports.map((r) => (
                <div key={r.id} style={{ padding: 16, border: '1px solid #fecaca', borderRadius: 12, background: '#fffbfb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        🚩 {r.reason}
                        {r.post && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> — "{r.post.title}" ({r.post.type}, {r.post.city})</span>}
                      </div>
                      {r.details && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{r.details}</div>}
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Reported {new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleReport(r, 'resolved', true)}
                        style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer' }}
                      >
                        Hide post & resolve
                      </button>
                      <button
                        onClick={() => handleReport(r, 'dismissed')}
                        style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )

        /* ── STREAMS ──────────────────────────────────────────── */
        ) : activeTab === 'streams' ? (
          streams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📹</div>
              <p>No stream submissions yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {streams.map((s) => (
                <div key={s.id} style={{
                  padding: 16, borderRadius: 12, border: '1px solid var(--border)',
                  background: s.status === 'pending' ? '#fffbeb' : 'white',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14.5 }}>{s.title}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                          background: s.status === 'approved' ? '#e8f9ee' : s.status === 'pending' ? '#fff8e6' : '#fee2e2',
                          color: s.status === 'approved' ? '#128c4b' : s.status === 'pending' ? '#92700c' : '#dc2626',
                        }}>{s.status}</span>
                      </div>
                      {s.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{s.description}</div>}
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        📍 {s.city} · {s.platform} · {new Date(s.created_at).toLocaleString()}
                      </div>
                      <a href={s.stream_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>
                        🔗 Preview stream link →
                      </a>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {s.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStream(s, 'approved')}
                            style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer' }}
                          >✓ Approve</button>
                          <button
                            onClick={() => handleStream(s, 'rejected')}
                            style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer' }}
                          >✕ Reject</button>
                        </>
                      )}
                      {s.status === 'approved' && (
                        <button
                          onClick={() => handleStream(s, 'ended')}
                          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
                        >⏹ End stream</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )

        /* ── USERS ────────────────────────────────────────────── */
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
