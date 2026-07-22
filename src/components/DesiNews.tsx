import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';

interface NewsItem {
  id: string; title: string; url: string; source?: string;
  category: string; city?: string; published_at: string; submitted_by?: string;
}

const CAT_STYLE: Record<string, { bg: string; fg: string }> = {
  India:      { bg: '#FAECE7', fg: '#993C1D' },
  Cricket:    { bg: '#E6F1FB', fg: '#185FA5' },
  'US Desi':  { bg: '#FAEEDA', fg: '#854F0B' },
  Bollywood:  { bg: '#FBEAF0', fg: '#993556' },
  Local:      { bg: '#E1F5EE', fg: '#0F6E56' },
  Business:   { bg: '#EEEDFE', fg: '#534AB7' },
};

export default function DesiNews() {
  const { user } = useAuth();
  const { city, detectedCity } = useLocation();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Submit modal
  const [submitOpen, setSubmitOpen] = useState(false);
  const [nTitle, setNTitle] = useState('');
  const [nUrl, setNUrl] = useState('');
  const [nMsg, setNMsg] = useState('');

  useEffect(() => {
    supabase
      .from('news_items')
      .select('*')
      .eq('status', 'approved')
      .order('published_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setItems((data as NewsItem[]) ?? []); setLoading(false); });
  }, []);

  const submit = async () => {
    if (!nTitle.trim()) return setNMsg('Headline is required.');
    if (!nUrl.trim() || !/^https?:\/\//.test(nUrl.trim())) return setNMsg('Enter a valid link (https://…).');
    const { error } = await supabase.from('news_items').insert({
      title: nTitle.trim(), url: nUrl.trim(), source: 'Community',
      category: 'Local', city: detectedCity || city, submitted_by: user!.id, status: 'pending',
    });
    if (error) return setNMsg(error.message);
    setNMsg('✅ Submitted! An admin will review it shortly.');
    setNTitle(''); setNUrl('');
    setTimeout(() => { setSubmitOpen(false); setNMsg(''); }, 1400);
  };

  if (loading || items.length === 0) return null;

  const shown = expanded ? items : items.slice(0, 5);

  return (
    <div style={{ padding: '18px 32px 0' }}>
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#3d1509' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fac775' }}>📰 Desi News</span>
          <button
            onClick={() => user ? setSubmitOpen(true) : null}
            title={user ? 'Post local news' : 'Sign in to post news'}
            style={{ fontSize: 11.5, fontWeight: 600, color: '#fac775', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(250,199,117,0.3)', borderRadius: 20, padding: '3px 11px', cursor: user ? 'pointer' : 'default' }}
          >
            + Post local news
          </button>
        </div>

        {shown.map((n) => {
          const cs = CAT_STYLE[n.category] || CAT_STYLE.India;
          return (
            <a
              key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text)' }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, background: cs.bg, color: cs.fg, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{n.category}</span>
              <span style={{ fontSize: 13.5, flex: 1, minWidth: 0, lineHeight: 1.4 }}>{n.title}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{n.source} ↗</span>
            </a>
          );
        })}

        {items.length > 5 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ width: '100%', padding: '9px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--accent-text)' }}
          >
            {expanded ? '▲ Show less' : `▼ More headlines (${items.length - 5})`}
          </button>
        )}
      </div>

      {/* Submit modal */}
      {submitOpen && (
        <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && setSubmitOpen(false)}>
          <div className="modal">
            <button onClick={() => setSubmitOpen(false)} style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            <h2 style={{ fontSize: 19 }}>📰 Post local news</h2>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 12px' }}>
              Share a local community news headline with a link to the full story. Reviewed by an admin before it appears.
            </p>
            <div className="field"><label>Headline *</label><input value={nTitle} onChange={(e) => setNTitle(e.target.value)} placeholder="e.g. New Hindu temple opens in Frisco this weekend" /></div>
            <div className="field"><label>Link to story *</label><input value={nUrl} onChange={(e) => setNUrl(e.target.value)} placeholder="https://…" /></div>
            <button className="btn-primary" onClick={submit}>Submit for review</button>
            {nMsg && <div style={{ fontSize: 13, marginTop: 8, color: nMsg.startsWith('✅') ? '#166534' : '#dc2626' }}>{nMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
