import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, AuthUser } from '../types';

interface AuthCtx {
  user:    AuthUser | null;
  profile: Profile  | null;
  loading: boolean;
  signIn:  (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  canEdit: boolean;
}

const Ctx = createContext<AuthCtx>({
  user: null, profile: null, loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  isAdmin: false, canEdit: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile  | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga perfil desde Supabase
  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      if (u) {
        setUser({ id: u.id, email: u.email! });
        loadProfile(u.id);
      }
      setLoading(false);
    });

    // Escucha cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u) {
        setUser({ id: u.id, email: u.email! });
        loadProfile(u.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isAdmin = profile?.role === 'admin';
  const canEdit = profile?.role === 'admin' || profile?.role === 'editor';

  return (
    <Ctx.Provider value={{ user, profile, loading, signIn, signOut, isAdmin, canEdit }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
