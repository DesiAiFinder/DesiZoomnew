import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const register = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } },
    });
    setLoading(false);
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: 'Account created! Check your email to confirm, then sign in.', ok: true });
    setTimeout(() => navigate('/login'), 2500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(28,35,64,0.1)' }}>
        <Link to="/" style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--text)', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          Desi<span style={{ color: 'var(--accent)' }}>Zoom</span>
        </Link>
        <h1 style={{ fontSize: 22, marginBottom: 20 }}>Create account</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field"><label>Display name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button className="btn-primary" onClick={register} disabled={loading} style={{ width: '100%', padding: '12px', fontSize: 14 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent-text)', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
