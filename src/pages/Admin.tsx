import { useState, useEffect } from 'react';
import {
  fetchAdminStats, fetchAllUsers,
  adminFetchAllPosts, adminSetPostActive, adminDeletePost, adminSetSponsored,
  adminFetchReports, adminResolveReport,
  adminFetchPayments,
  adminFetchStreams, adminSetStreamStatus, adminDeleteStream,
  adminFetchRestaurants, adminSetRestaurantActive, adminDeleteRestaurant,
  adminFetchOrders,
  adminFetchOrgs, adminSaveOrg, adminSetOrgActive, adminDeleteOrg,
  refundPayment,
  supabase,
} from '../services/supabase';
import type { AdminStats, Post } from '../types';

type Tab = 'overview' | 'posts' | 'reports' | 'streams' | 'news' | 'restaurants' | 'orders' | 'orgs' | 'users';

// Revenue-stream labels for payments
const KIND_META: Record<string, { icon: string; label: string }> = {
  sale:    { icon: '🛍️', label: 'Marketplace' },
  order:   { icon: '🍛', label: 'Food order' },
  ticket:  { icon: '🎟️', label: 'Ticket' },
  booking: { icon: '🛠️', label: 'Booking' },
  boost:   { icon: '🚀', label: 'Boost' },
  lead:    { icon: '🔓', label: 'Lead' },
};

interface RestaurantRow { id: string; name: string; cuisine?: string; city: string; is_open: boolean; is_active: boolean; created_at: string; }
interface OrderRow { id: string; customer_name?: string; customer_phone?: string; subtotal_cents: number; commission_cents: number; status: string; created_at: string; restaurant?: { name: string }; }
interface OrgRow { id: string; name: string; org_type?: string; city: string; website?: string; phone?: string; email?: string; is_active: boolean; }

interface NewsRow {
  id: string; title: string; url: string; source?: string; category: string;
  city?: string; status: string; created_at: string;
}

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
  kind?: string;
  stripe_session_id?: string;
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
  const [news, setNews] = useState<NewsRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [postFilter, setPostFilter] = useState('');

  // Org add/edit form
  const blankOrg = { name: '', city: '', org_type: 'cultural', website: '', phone: '', email: '' };
  const [orgForm, setOrgForm] = useState<Record<string, string>>(blankOrg);
  const [orgFormOpen, setOrgFormOpen] = useState(false);
  const [orgMsg, setOrgMsg] = useState('');

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetchAdminStats(),
      fetchAllUsers(),
      adminFetchAllPosts(),
      adminFetchReports('open'),
      adminFetchPayments(),
      adminFetchStreams(),
      supabase.from('news_items').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      adminFetchRestaurants(),
      adminFetchOrders(),
      adminFetchOrgs(),
    ])
      .then(([s, u, p, r, pay, st, nw, rest, ord, og]) => {
        setStats(s as AdminStats);
        setUsers(u as Record<string, unknown>[]);
        setPosts(p as Post[]);
        setReports(r as ReportRow[]);
        setPayments(pay as PaymentRow[]);
        setStreams(st as StreamRow[]);
        setNews(((nw as { data?: NewsRow[] }).data) ?? []);
        setRestaurants(rest as RestaurantRow[]);
        setOrders(ord as OrderRow[]);
        setOrgs(og as OrgRow[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  // Revenue split by stream (completed only)
  const kindKeys = ['sale', 'order', 'ticket', 'booking', 'boost', 'lead'];
  const revenueByKind = kindKeys.map((k) => {
    const rows = payments.filter((p) => p.status === 'completed' && (p.kind || 'sale') === k);
    return { k, meta: KIND_META[k], commission: rows.reduce((s, p) => s + p.commission_cents, 0), count: rows.length };
  }).filter((x) => x.count > 0);

  const toggleRestaurant = async (r: RestaurantRow) => {
    await adminSetRestaurantActive(r.id, !r.is_active).catch(() => {});
    setRestaurants((prev) => prev.map((x) => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
  };

  const removeRestaurant = async (r: RestaurantRow) => {
    if (!window.confirm(`Permanently delete "${r.name}" and its menu & orders? This cannot be undone.`)) return;
    await adminDeleteRestaurant(r.id).catch(() => {});
    setRestaurants((prev) => prev.filter((x) => x.id !== r.id));
  };

  const [refunding, setRefunding] = useState<string | null>(null);
  const doRefund = async (p: PaymentRow) => {
    if (!p.stripe_session_id) { alert('This payment has no Stripe session recorded, so it must be refunded from the Stripe dashboard.'); return; }
    const amount = `$${(p.amount_cents / 100).toFixed(2)}`;
    if (!window.confirm(`Refund ${amount} to the customer?\n\nThe money is pulled back from the seller and your commission is returned too. This cannot be undone.`)) return;
    setRefunding(p.id);
    try {
      await refundPayment(p.stripe_session_id, 'requested_by_customer');
      setPayments((prev) => prev.map((x) => x.id === p.id ? { ...x, status: 'refunded' } : x));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Refund failed');
    } finally { setRefunding(null); }
  };

  const removeStream = async (s: StreamRow) => {
    if (!window.confirm(`Permanently delete stream "${s.title}"? This cannot be undone.`)) return;
    await adminDeleteStream(s.id).catch(() => {});
    setStreams((prev) => prev.filter((x) => x.id !== s.id));
  };

  const saveOrg = async () => {
    if (!orgForm.name.trim() || !orgForm.city.trim()) { setOrgMsg('Name and city are required.'); return; }
    try {
      await adminSaveOrg({ ...orgForm });
      setOrgMsg('✅ Saved.');
      setOrgForm(blankOrg);
      const og = await adminFetchOrgs();
      setOrgs(og as OrgRow[]);
      setTimeout(() => { setOrgFormOpen(false); setOrgMsg(''); }, 900);
    } catch (e: unknown) { setOrgMsg(e instanceof Error ? e.message : 'Could not save.'); }
  };

  const toggleOrg = async (o: OrgRow) => {
    await adminSetOrgActive(o.id, !o.is_active).catch(() => {});
    setOrgs((prev) => prev.map((x) => x.id === o.id ? { ...x, is_active: !o.is_active } : x));
  };

  const removeOrg = async (o: OrgRow) => {
    if (!window.confirm(`Delete "${o.name}"?`)) return;
    await adminDeleteOrg(o.id).catch(() => {});
    setOrgs((prev) => prev.filter((x) => x.id !== o.id));
  };

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
    { id: 'overview',    label: '📊 Overview' },
    { id: 'posts',       label: `📝 Posts (${posts.length})` },
    { id: 'reports',     label: `🚩 Reports${reports.length ? ` (${reports.length})` : ''}` },
    { id: 'streams',     label: `🔴 Streams${pendingStreams.length ? ` (${pendingStreams.length})` : ''}` },
    { id: 'news',        label: `📰 News${news.length ? ` (${news.length})` : ''}` },
    { id: 'restaurants', label: `🍛 Restaurants (${restaurants.length})` },
    { id: 'orders',      label: `📦 Orders (${orders.length})` },
    { id: 'orgs',        label: `🏛️ Orgs (${orgs.length})` },
    { id: 'users',       label: `👥 Users (${users.length})` },
  ];

  const handleNews = async (n: NewsRow, status: 'approved' | 'rejected') => {
    if (status === 'rejected') await supabase.from('news_items').delete().eq('id', n.id);
    else await supabase.from('news_items').update({ status: 'approved' }).eq('id', n.id);
    setNews((prev) => prev.filter((x) => x.id !== n.id));
  };

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

            {/* Revenue by stream */}
            {revenueByKind.length > 0 && (
              <>
                <h2 style={{ fontSize: 17, marginBottom: 14 }}>Revenue by stream</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 24 }}>
                  {revenueByKind.map((r) => (
                    <div key={r.k} style={{ padding: 14, background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.meta.icon} {r.meta.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", marginTop: 6 }}>${(r.commission / 100).toFixed(2)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{r.count} txn{r.count !== 1 ? 's' : ''}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Recent transactions */}
            {payments.length > 0 && (
              <>
                <h2 style={{ fontSize: 17, marginBottom: 14 }}>Recent Transactions</h2>
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                        {['Type', 'Item', 'Amount', 'Your Cut', 'Status', 'Date', ''].map((h) => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 15).map((p, i) => {
                        const meta = KIND_META[p.kind || 'sale'] || KIND_META.sale;
                        return (
                        <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--bg)' }}>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{meta.icon} {meta.label}</td>
                          <td style={{ padding: '10px 14px' }}>{p.post?.title || meta.label}</td>
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
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            {p.status === 'completed' && (
                              <button
                                onClick={() => doRefund(p)}
                                disabled={refunding === p.id}
                                style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: refunding === p.id ? 'wait' : 'pointer' }}
                              >
                                {refunding === p.id ? 'Refunding…' : '↩️ Refund'}
                              </button>
                            )}
                          </td>
                        </tr>
                        );
                      })}
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
                      <button
                        onClick={() => removeStream(s)}
                        style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                      >🗑️ Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )

        /* ── NEWS ─────────────────────────────────────────────── */
        ) : activeTab === 'news' ? (
          news.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
              <p>No community news awaiting review.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {news.map((n) => (
                <div key={n.id} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: '#fffbeb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{n.category} · {n.city || 'Local'} · {new Date(n.created_at).toLocaleString()}</div>
                      <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>🔗 Preview link →</a>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <button onClick={() => handleNews(n, 'approved')} style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer' }}>✓ Approve</button>
                      <button onClick={() => handleNews(n, 'rejected')} style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer' }}>✕ Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )

        /* ── RESTAURANTS ──────────────────────────────────────── */
        ) : activeTab === 'restaurants' ? (
          restaurants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🍛</div>
              <p>No restaurants yet.</p>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    {['Restaurant', 'City', 'Open', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((r, i) => (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--bg)', opacity: r.is_active ? 1 : 0.55 }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.name}<span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {r.cuisine || 'Indian'}</span></td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{r.city}</td>
                      <td style={{ padding: '10px 14px' }}>{r.is_open ? '🟢' : '⚫'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: r.is_active ? '#e8f9ee' : '#fee2e2', color: r.is_active ? '#128c4b' : '#dc2626' }}>{r.is_active ? 'active' : 'hidden'}</span>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => toggleRestaurant(r)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', marginRight: 6 }}>{r.is_active ? '🙈 Hide' : '👁️ Show'}</button>
                        <button onClick={() => removeRestaurant(r)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>🗑️ Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

        /* ── ORDERS ───────────────────────────────────────────── */
        ) : activeTab === 'orders' ? (
          orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <p>No food orders yet.</p>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    {['Restaurant', 'Customer', 'Phone', 'Total', 'Your Cut', 'Status', 'Date'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--bg)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{o.restaurant?.name || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{o.customer_name || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{o.customer_phone || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>${(o.subtotal_cents / 100).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#166534' }}>${(o.commission_cents / 100).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'var(--bg)', color: 'var(--text)' }}>{o.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

        /* ── ORGANIZATIONS ────────────────────────────────────── */
        ) : activeTab === 'orgs' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 18 }}>Organizations ({orgs.length})</h2>
              <button className="btn-primary" onClick={() => { setOrgForm(blankOrg); setOrgFormOpen((v) => !v); }}>{orgFormOpen ? '✕ Close' : '+ Add organization'}</button>
            </div>

            {orgFormOpen && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16, background: 'var(--bg)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                  <div className="field"><label>Name *</label><input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} placeholder="e.g. Telugu Association of DFW" /></div>
                  <div className="field"><label>City *</label><input value={orgForm.city} onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })} placeholder="e.g. Dallas, TX" /></div>
                  <div className="field"><label>Type</label>
                    <select value={orgForm.org_type} onChange={(e) => setOrgForm({ ...orgForm, org_type: e.target.value })}>
                      {['cultural', 'temple', 'professional', 'student', 'nonprofit', 'sports', 'other'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Website</label><input value={orgForm.website} onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })} placeholder="https://…" /></div>
                  <div className="field"><label>Phone</label><input value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} /></div>
                  <div className="field"><label>Email</label><input value={orgForm.email} onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })} /></div>
                </div>
                <button className="btn-primary" style={{ marginTop: 10 }} onClick={saveOrg}>Save organization</button>
                {orgMsg && <span style={{ fontSize: 13, marginLeft: 10, color: orgMsg.startsWith('✅') ? '#166534' : '#dc2626' }}>{orgMsg}</span>}
              </div>
            )}

            {orgs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>No organizations yet. Add one above.</div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['Name', 'City', 'Type', 'Status', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((o, i) => (
                      <tr key={o.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--bg)', opacity: o.is_active ? 1 : 0.55 }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{o.name}{o.website && <a href={o.website} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent-text)' }}>↗</a>}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{o.city}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{o.org_type || 'other'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: o.is_active ? '#e8f9ee' : '#fee2e2', color: o.is_active ? '#128c4b' : '#dc2626' }}>{o.is_active ? 'active' : 'hidden'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => toggleOrg(o)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', marginRight: 6 }}>{o.is_active ? '🙈 Hide' : '👁️ Show'}</button>
                          <button onClick={() => removeOrg(o)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>🗑️ Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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
