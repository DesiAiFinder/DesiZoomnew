import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  user: Session['user'] | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, loading: true, isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileAdmin, setProfileAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Also read role from profiles table (reliable, no token refresh needed)
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { setProfileAdmin(false); return; }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => setProfileAdmin(data?.role === 'admin'));
  }, [session?.user?.id]);

  const signOut = async () => { await supabase.auth.signOut(); };

  const isAdmin = session?.user?.app_metadata?.role === 'admin' || profileAdmin;

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
