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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
  }, [user]);

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
