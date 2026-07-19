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
  const [sessionLoading, setSessionLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [profileAdmin, setProfileAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Read role from profiles table (reliable, no token refresh needed)
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { setProfileAdmin(false); setRoleLoading(false); return; }
    setRoleLoading(true);
    supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => {
        setProfileAdmin(data?.role === 'admin');
        setRoleLoading(false);
      });
  }, [session?.user?.id]);

  const signOut = async () => { await supabase.auth.signOut(); };

  const tokenAdmin = session?.user?.app_metadata?.role === 'admin';
  const isAdmin = tokenAdmin || profileAdmin;
  // Stay in "loading" until both the session AND (if signed in) the role check resolve,
  // so admin-guarded routes don't redirect before the role is known.
  const loading = sessionLoading || (!!session?.user && roleLoading);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
