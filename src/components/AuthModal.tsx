import { useState } from 'react';
import { supabase } from '../services/supabase';

interface Props { onClose: () => void; }

type Tab = 'password' | 'magic' | 'phone';

export default function AuthModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const m = (text: string, ok: boolean) => setMsg({ text, ok });

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return m(error.message, false);
    m('Signed in!', true);
    setTimeout(onClose, 600);
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return m(error.message, false);
    m('Account created. Check your email to confirm.', true);
  };

  const magicLink = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    setLoading(false);
    if (error) return m(error.message, false);
    m('Check your email for the sign-in link!', true);
  };

  const sendSms = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return m(error.message, false);
    m('Code sent by SMS.', true);
  };

  const verifySms = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    setLoading(false);
    if (error) return m(error.message, false);
    m('Signed in!', true);
    setTimeout(onClose, 600);
  };

  const googleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
  };

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
        <h2 style={{ fontSize: 20 }}>Sign in to DesiZoom</h2>

        <div className="tabs">
          {(['password', 'magic', 'phone'] as Tab[]).map((t) => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'password' ? 'Email' : t === 'magic' ? 'Magic link' : 'Phone'}
            </div>
          ))}
        </div>

        {tab === 'password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={signIn} disabled={loading}>Sign in</button>
              <button className="btn-ghost" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={signUp} disabled={loading}>Create account</button>
            </div>
          </div>
        )}

        {tab === 'magic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <button className="btn-primary" onClick={magicLink} disabled={loading}>Email me a sign-in link</button>
          </div>
        )}

        {tab === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>Phone (+1XXXXXXXXXX)</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <button className="btn-primary" onClick={sendSms} disabled={loading}>Send code</button>
            <div className="field"><label>6-digit code</label><input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} /></div>
            <button className="btn-ghost" style={{ border: '1px solid var(--border)' }} onClick={verifySms} disabled={loading}>Verify & sign in</button>
          </div>
        )}

        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>— or —</div>
        <button className="btn-ghost" style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={googleSignIn}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
      </div>
    </div>
  );
}
