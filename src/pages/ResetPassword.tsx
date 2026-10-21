import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

/**
 * Set a new password, reached from the reset email.
 *
 * Supabase puts a recovery token in the URL fragment and the client exchanges
 * it for a short-lived session before this renders, so updateUser() works
 * without the old password.
 *
 * Deliberately tells the user to go back to the installed app afterwards.
 * This page will almost always open in the phone's browser — email links
 * can't be handed to a home-screen PWA — so the session created here is NOT
 * the one the app uses. Leaving that unsaid is what caused a live checkout to
 * fail with "You must be signed in" while the app looked signed in.
 */
export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The client may still be parsing the token out of the URL fragment.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) { setValid(true); setReady(true); }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValid(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 6) return setErr('Password needs at least 6 characters.');
    if (password !== confirm) return setErr("Those two passwords don't match.");
    setBusy(true); setErr('');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
  };

  const field: React.CSSProperties = {
    width: '100%', height: 44, border: '1px solid var(--border)',
    borderRadius: 10, padding: '0 14px', fontSize: 15, marginTop: 6,
  };

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#3d1509,#2a1500)' }}>
        <div className="eyebrow">Account</div>
        <h1>{done ? 'Password updated' : 'Set a new password'}</h1>
        <p>{done ? 'You can sign in with it now.' : 'Choose something you\'ll remember.'}</p>
      </div>

      <div style={{ padding: '28px 32px 64px', maxWidth: 420 }}>
        {!ready ? (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Checking your link…</p>

        ) : done ? (
          <>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: '0 0 14px' }}>
              Your password has been changed.
            </p>
            {/* The part people get wrong. */}
            <div style={{ padding: '14px 16px', background: 'var(--accent-soft)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13.5, lineHeight: 1.65, color: 'var(--accent-text)', marginBottom: 18 }}>
              Using DesiZoom from your home screen? Open the app and sign in there with
              your new password. Signing in here only signs you in to this browser.
            </div>
            <Link to="/" className="btn-primary" style={{ display: 'inline-block', padding: '11px 22px', textDecoration: 'none', fontSize: 14 }}>
              Go to DesiZoom
            </Link>
          </>

        ) : !valid ? (
          <>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: '0 0 8px' }}>
              This link has expired or has already been used.
            </p>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--muted)', margin: '0 0 18px' }}>
              Reset links are valid for a short time. Request a new one from the sign-in
              screen — tap "Forgot your password?".
            </p>
            <Link to="/" className="btn-primary" style={{ display: 'inline-block', padding: '11px 22px', textDecoration: 'none', fontSize: 14 }}>
              Back to DesiZoom
            </Link>
          </>

        ) : (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
              New password
              <input
                type="password" value={password} autoComplete="new-password"
                onChange={(e) => { setPassword(e.target.value); setErr(''); }}
                style={field} placeholder="At least 6 characters"
              />
            </label>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginTop: 14 }}>
              Confirm it
              <input
                type="password" value={confirm} autoComplete="new-password"
                onChange={(e) => { setConfirm(e.target.value); setErr(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                style={field} placeholder="Type it again"
              />
            </label>

            {err && (
              <div style={{ marginTop: 12, fontSize: 13.5, color: '#b91c1c' }}>{err}</div>
            )}

            <button
              className="btn-primary" onClick={submit} disabled={busy}
              style={{ marginTop: 18, padding: '12px 24px', fontSize: 14.5 }}
            >
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
