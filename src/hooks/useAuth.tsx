import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, AppRole, SiloType } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  /** Silos asignados al usuario (user_silos). Un usuario puede tener varios. */
  silos: SiloType[];
  loading: boolean;
  /** true cuando ya se cargaron perfil, roles y silos del usuario actual. */
  rolesLoaded: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [silos, setSilos] = useState<SiloType[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    // Supabase revalida la sesión al volver a la pestaña (y al refrescar el
    // token) y entrega un objeto `user` nuevo aunque sea el mismo usuario.
    // Si se reemplazara, todo lo que depende de `user` se reiniciaría: la app
    // volvía a "Cargando..." y se perdía lo que había en pantalla (p. ej. un
    // documento a medio crear). Solo se cambia cuando cambia el usuario.
    const applySession = (session: Session | null) => {
      setSession(session);
      const next = session?.user ?? null;
      setUser(prev => (prev && next && prev.id === next.id ? prev : next));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRoles([]);
      setSilos([]);
      setRolesLoaded(false);
      return;
    }
    setRolesLoaded(false);
    const fetchData = async () => {
      const [profileRes, rolesRes, silosRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('user_silos').select('silo').eq('user_id', user.id),
      ]);
      if (profileRes.data) setProfile(profileRes.data as unknown as Profile);
      setRoles(((rolesRes.data ?? []) as unknown as { role: AppRole }[]).map(r => r.role));
      setSilos(((silosRes.data ?? []) as unknown as { silo: SiloType }[]).map(s => s.silo));
      setRolesLoaded(true);
    };
    fetchData();
  // Se recargan perfil/roles/silos solo cuando cambia el usuario, no en cada
  // revalidación de la sesión.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, silos, loading, rolesLoaded, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
