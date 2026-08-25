import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserDirectoryEntry {
  user_id: string;
  full_name: string;
}

// Directorio mínimo de usuarios (id + nombre) para poblar selectores de
// responsable/miembros sin depender del acceso directo a "profiles"
// (restringido por RLS a favor de la privacidad de otros campos).
export function useUserDirectory() {
  const [directory, setDirectory] = useState<UserDirectoryEntry[]>([]);

  useEffect(() => {
    supabase.rpc('list_user_directory').then(({ data, error }) => {
      if (!error) setDirectory((data as UserDirectoryEntry[]) || []);
    });
  }, []);

  return directory;
}
