import { useRef, useState } from 'react';
import { supabase } from '../services/supabase';

/**
 * Upload a menu photo/PDF, have it read, review the result, save.
 *
 * This is a shortcut for the first bulk load only — the manual "add an item"
 * form below it stays the way you live with a menu afterwards (new dishes,
 * price changes, sold-out toggles). Extracted rows land in the same
 * menu_items table and behave identically once saved.
 *
 * Nothing is written until the user presses Save. A misread price is real
 * money, so the model types and a human checks.
 */

const CATS = ['Appetizers', 'Main', 'Breads', 'Rice', 'Desserts', 'Drinks', 'Tiffin', 'Other'];
const MAX_MB = 12;

interface Draft {
  name: string;
  description: string | null;
  category: string;
  price_cents: number | null;
  is_veg: boolean | null;
  include: boolean;
}

interface Props {
  restaurantId: string;
  /** Called after items are saved so the parent can reload its list. */
  onSaved: () => void;
}

export default function MenuUpload({ restaurantId, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'reading' | 'review'>('idle');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const fail = (text: string) => { setMsg({ text, ok: false }); setStage('idle'); };

  const handleFile = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) return fail(`That file is over ${MAX_MB}MB. Try a smaller photo.`);
    setMsg(null);
    setStage('uploading');

    // Store it: it's what the model reads, and it stays on the restaurant
    // afterwards as "View full menu" for customers.
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${restaurantId}/menu-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('post-images')
      .upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: true });
    if (upErr) return fail(upErr.message);

    const fileUrl = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
    await supabase.from('restaurants').update({ menu_file_url: fileUrl }).eq('id', restaurantId);

    setStage('reading');
    const { data, error } = await supabase.functions.invoke('parse-menu', {
      body: { restaurant_id: restaurantId, file_url: fileUrl },
    });
    if (error || data?.error) return fail(data?.error || error?.message || 'Could not read that menu.');

    const items = (data?.items ?? []) as Omit<Draft, 'include'>[] & { is_item: boolean }[];
    if (!items.length) return fail('No dishes found in that image. Try a clearer, straight-on photo.');

    setDrafts(items.map((i) => ({
      name: i.name,
      description: i.description,
      category: i.category,
      price_cents: i.price_cents,
      is_veg: i.is_veg,
      // Non-dishes and anything with no price start unticked, so the user has
      // to look at them rather than accidentally publishing them.
      include: (i as { is_item?: boolean }).is_item !== false && i.price_cents != null,
    })));
    setStage('review');
  };

  const patch = (idx: number, change: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...change } : d)));

  const save = async () => {
    const keep = drafts.filter((d) => d.include && d.name.trim() && d.price_cents);
    if (!keep.length) return setMsg({ text: 'Nothing ticked to save.', ok: false });
    setSaving(true);
    const { error } = await supabase.from('menu_items').insert(
      keep.map((d) => ({
        restaurant_id: restaurantId,
        name: d.name.trim(),
        description: d.description?.trim() || null,
        category: d.category,
        price_cents: d.price_cents,
        is_veg: d.is_veg ?? false,
      }))
    );
    setSaving(false);
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: `Added ${keep.length} item${keep.length > 1 ? 's' : ''}.`, ok: true });
    setDrafts([]);
    setStage('idle');
    onSaved();
  };

  const missing = drafts.filter((d) => d.price_cents == null).length;
  const ready = drafts.filter((d) => d.include && d.price_cents).length;

  const cell = {
    width: '100%', border: '1px solid var(--border)', borderRadius: 6,
    padding: '5px 7px', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' as const,
  };

  // ── Review table ─────────────────────────────────────────────────────────
  if (stage === 'review') {
    return (
      <div style={{ border: '1px solid #ea580c', borderRadius: 14, padding: 16, marginBottom: 16, background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14.5 }}>Found {drafts.length} rows</strong>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Check the prices, then save. Nothing is live yet.</span>
        </div>

        {missing > 0 && (
          <div style={{ fontSize: 12, background: '#fff8e6', color: '#92700c', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 11px', margin: '10px 0' }}>
            {missing} row{missing > 1 ? 's' : ''} had no readable price — add one to include it.
          </div>
        )}

        <div style={{ marginTop: 10, maxHeight: 420, overflowY: 'auto' }}>
          {drafts.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 7, alignItems: 'center', padding: '7px 0',
                borderTop: '1px solid var(--border)',
                opacity: d.include ? 1 : 0.55,
              }}
            >
              <input
                type="checkbox" checked={d.include}
                onChange={(e) => patch(i, { include: e.target.checked })}
                style={{ width: 16, height: 16, flex: '0 0 16px', cursor: 'pointer' }}
                aria-label={`Include ${d.name}`}
              />
              <input
                value={d.name} onChange={(e) => patch(i, { name: e.target.value })}
                style={{ ...cell, flex: 3 }}
              />
              <select
                value={d.category} onChange={(e) => patch(i, { category: e.target.value })}
                style={{ ...cell, flex: 1.4 }}
              >
                {CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input
                value={d.price_cents != null ? (d.price_cents / 100).toFixed(2) : ''}
                placeholder="—"
                inputMode="decimal"
                onChange={(e) => {
                  const p = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                  patch(i, { price_cents: isNaN(p) || p <= 0 ? null : Math.round(p * 100) });
                }}
                style={{
                  ...cell, flex: 0.9, textAlign: 'right',
                  borderColor: d.price_cents == null ? '#f59e0b' : 'var(--border)',
                }}
              />
            </div>
          ))}
        </div>

        {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginTop: 10 }}>{msg.text}</div>}

        <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={save} disabled={saving || !ready}>
            {saving ? 'Saving…' : `Save ${ready} item${ready === 1 ? '' : 's'}`}
          </button>
          <button
            onClick={() => { setDrafts([]); setStage('idle'); setMsg(null); }}
            style={{ fontSize: 12.5, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 'auto' }}>
            Untick anything that isn't a dish
          </span>
        </div>
      </div>
    );
  }

  // ── Upload prompt ────────────────────────────────────────────────────────
  const busy = stage === 'uploading' || stage === 'reading';

  return (
    <div style={{ border: '1px dashed #ea580c', borderRadius: 14, padding: '13px 15px', marginBottom: 16, background: '#fff7ed' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 21 }} aria-hidden>📸</span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>
            {busy ? (stage === 'uploading' ? 'Uploading…' : 'Reading your menu…') : 'Upload your menu to fill this in'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {busy
              ? 'Usually about 10 seconds'
              : 'Photo or PDF · you review everything before it saves'}
          </div>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{
            fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 20,
            border: '1px solid #ea580c', background: 'white', color: '#ea580c',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? '…' : 'Upload'}
        </button>
        <input
          ref={fileRef} type="file" accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </div>
      {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginTop: 10 }}>{msg.text}</div>}
    </div>
  );
}
