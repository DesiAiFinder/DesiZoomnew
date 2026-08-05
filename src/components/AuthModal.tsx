import { useState } from 'react';
import { supabase } from '../services/supabase';

interface Props { onClose: () => void; }

/**
 * Sign in / create account.
 *
 * One decision at a time. The original showed three method tabs plus two
 * same-weight buttons ("Sign in" and "Create account") side by side, so nobody
 * could tell which applied to them. Now: one mode, one primary button, and
 * quiet text links for everything else.
 *
 * Google is offered first on purpose. Signup by email depends on a
 * confirmation message actually arriving, and Supabase's default mail service
 * is rate-limited and often spam-filed — a silent dead end for a new user.
 * Google skips email entirely: one tap, already-verified account.
 *
 * Phone/SMS was removed. It needs a paid SMS provider configured in Supabase,
 * and without one it fails exactly like the old Google button did. The code is
 * in git history if it's ever wanted.
 */

type Mode = 'signin' | 'signup';
type Method = 'password' | 'magic';

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const m = (text: string, ok: boolean) => setMsg({ text, ok });

  const submitPassword = async () => {
    if (!email.trim() || !password) return m('Enter your email and password.', false);
    if (mode === 'signup' && password.length < 6) {
      return m('Password needs at least 6 characters.', false);
    }
    setLoading(true);
    const { error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) return m(error.message, false);

    if (mode === 'signin') {
      m('Signed in.', true);
      setTimeout(onClose, 500);
    } else {
      m('Account created. Check your email to confirm, then sign in.', true);
    }
  };

  const magicLink = async () => {
    if (!email.trim()) return m('Enter your email first.', false);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setLoading(false);
    if (error) return m(error.message, false);
    m('Link sent. Check your email and tap it to sign in.', true);
  };

  const googleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    if (error) m(error.message, false);
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setMethod('password');
    setMsg(null);
  };

  const onEnter = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter') { e.preventDefault(); fn(); }
  };

  const linkStyle = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    color: 'var(--accent-text, #b84d00)', fontSize: 12.5, fontWeight: 600,
    fontFamily: 'inherit', textDecoration: 'underline',
  } as const;

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
        >✕</button>

        <h2 style={{ fontSize: 20, marginBottom: 4 }}>
          {mode === 'signin' ? 'Sign in to DesiZoom' : 'Create your account'}
        </h2>

        {mode === 'signin' ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>Welcome back.</p>
        ) : (
          // What an account unlocks. "Free" was the old line, but cost isn't the
          // hesitation at a signup box — not knowing what you get is.
          <div style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 14px', lineHeight: 1.75 }}>
            <div>🍛 &nbsp;Order pickup from desi restaurants</div>
            <div>❤️ &nbsp;Save deals and get alerts</div>
            <div>➕ &nbsp;Post your own listings</div>
          </div>
        )}

        {/* Offered first: fastest path, and it doesn't depend on email delivery */}
        <button
          className="btn-ghost"
          onClick={googleSignIn}
          style={{ width: '100%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '10px' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, margin: '12px 0' }}>— or —</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Email</label>
            <input
              type="email" value={email} autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => onEnter(e, method === 'magic' ? magicLink : submitPassword)}
            />
          </div>

          {method === 'password' && (
            <div className="field">
              {/* Hint sits on the label, not its own line — keeps the primary
                  button above the fold on small screens. */}
              <label>
                Password
                {mode === 'signup' && (
                  <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11 }}> · 6+ characters</span>
                )}
              </label>
              <input
                type="password" value={password}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => onEnter(e, submitPassword)}
              />
            </div>
          )}

          <button
            className="btn-primary"
            onClick={method === 'magic' ? magicLink : submitPassword}
            disabled={loading}
          >
            {loading
              ? 'Just a moment…'
              : method === 'magic'
                ? 'Email me a sign-in link'
                : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </div>

        {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginTop: 12 }}>{msg.text}</div>}

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          {method === 'password' ? (
            <button style={linkStyle} onClick={() => { setMethod('magic'); setMsg(null); }}>
              Email me a link instead — no password
            </button>
          ) : (
            <button style={linkStyle} onClick={() => { setMethod('password'); setMsg(null); }}>
              Use email and password
            </button>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12, textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
          {mode === 'signin' ? 'New to DesiZoom? ' : 'Already have an account? '}
          <button style={linkStyle} onClick={switchMode}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
