import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMsg({ text: error.message, ok: false });
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(28,35,64,0.1)' }}>
        <Link to="/" style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--text)', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          Desi<span style={{ color: 'var(--accent)' }}>Zoom</span>
        </Link>
        <h1 style={{ fontSize: 22, marginBottom: 20 }}>Sign in</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && signIn()} /></div>
          <button className="btn-primary" onClick={signIn} disabled={loading} style={{ width: '100%', padding: '12px', fontSize: 14 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--accent-text)', fontWeight: 600 }}>Register</Link>
          </div>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            <Link to="/" style={{ color: 'var(--muted)' }}>← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
