import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * "Tell me when there's something here."
 *
 * Shown on empty Order / Deals / Events pages. Takes an email and nothing
 * else — no password, no account. Someone who taps Order Food in a town
 * with no restaurants has told us precisely what they want; making them
 * create an account before we'll remember that loses almost all of them.
 *
 * Writes to public.waitlist, which is insert-only for anon (see
 * migration_waitlist.sql). Errors are shown, never swallowed — a silent
 * failure here means we quietly lose the only people who raised a hand.
 */

type Topic = 'restaurants' | 'deals' | 'events';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function NotifyMe({ topic, city, label, compact }: {
  topic: Topic;
  city: string;
  /** The promise being made. Keep it concrete and keepable. */
  label: string;
  /** Inline row (used under a populated list) rather than a stacked block. */
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = email.trim();
    if (!EMAIL.test(addr)) { setErr('That email address does not look right.'); return; }
    setErr('');
    setState('saving');

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: addr, city, topic, user_id: user?.id ?? null });

    // 23505 = unique violation. They already asked; that is a success to
    // them, not an error, and saying "already on the list" is friendlier
    // than a red box.
    if (error && error.code !== '23505') {
      console.error('[waitlist]', error);
      setErr("Couldn't save that just now. Please try again.");
      setState('idle');
      return;
    }
    setState('done');
  };

  if (state === 'done') {
    return (
      <div style={{
        fontSize: 13.5, color: 'var(--text)', background: '#f0fdf4',
        border: '1px solid #bbf7d0', borderRadius: 10, padding: '11px 14px',
      }}>
        ✅ You're on the list. We'll email you the moment there's something in {city}.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 360, margin: compact ? 0 : '0 auto', textAlign: 'left' }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 7, lineHeight: 1.5 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email" inputMode="email" autoComplete="email"
          value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }}
          placeholder="name@email.com"
          style={{
            flex: 1, minWidth: 0, height: 38, padding: '0 11px', fontSize: 14,
            border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'inherit',
          }}
        />
        <button type="submit" className="btn-primary" disabled={state === 'saving'} style={{ flexShrink: 0 }}>
          {state === 'saving' ? 'Saving…' : 'Notify me'}
        </button>
      </div>
      {err && <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 6 }}>{err}</div>}
    </form>
  );
}
