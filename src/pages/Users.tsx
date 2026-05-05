import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserTable } from '@/components/users/UserTable';
import { UserModal } from '@/components/users/UserModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Search, UserPlus, Filter, ShieldPlus, Loader2 } from 'lucide-react';
import { UserRole, SiloType } from '@/types/database';
import { useToast } from '@/components/ui/use-toast';

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string;
  silo: string | null;
  silos: SiloType[];
  created_at: string;
  updated_at: string;
  roles: UserRole[];
  email: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  const RESPONSABLES_INICIALES = [
    { email: 'saraya@mayoreo.biz', full_name: 'Stephanie Araya', silo: 'logistica' },
    { email: 'apulido@mayoreo.biz', full_name: 'Ambar Pulido', silo: 'compras' },
    { email: 'mzarraga@mayoreo.biz', full_name: 'Mayte Zarraga', silo: 'mercadeo' },
    { email: 'prodriguez@mayoreo.biz', full_name: 'Paola Rodriguez', silo: 'control' },
    { email: 'emonagas@mayoreo.biz', full_name: 'Edgar Monagas', silo: 'sistemas' },
  ];

  const handleSeedResponsables = async () => {
    if (!confirm('Se crearán las cuentas de los Responsables de Métodos con contraseña temporal "Mayoreo2026!". ¿Continuar?')) return;
    setSeeding(true);
    const results: string[] = [];
    for (const r of RESPONSABLES_INICIALES) {
      const { data, error } = await supabase.functions.invoke('create-responsable', { body: r });
      if (error || (data as any)?.error) {
        results.push(`❌ ${r.email}: ${error?.message || (data as any)?.error}`);
      } else {
        results.push(`✓ ${r.email}`);
      }
    }
    toast({ title: 'Responsables creados', description: results.join('\n') });
    setSeeding(false);
    fetchUsers();
  };


  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRoles[] = (profilesData || []).map(profile => ({
        ...profile,
        roles: (rolesData || []).filter(r => r.user_id === profile.user_id) as UserRole[],
        email: profile.email || (profile.full_name ? `${profile.full_name.toLowerCase().replace(/\s+/g, '.')}@mayoreo.biz` : 'sin-email@mayoreo.biz')
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: "Error al cargar usuarios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: UserWithRoles) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
      const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
      if (error) throw error;
      
      toast({ title: "Usuario eliminado correctamente" });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error al eliminar usuario",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      const { roles, ...profileData } = data;
      
      if (selectedUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', selectedUser.user_id);
        
        if (profileError) throw profileError;

        await supabase.from('user_roles').delete().eq('user_id', selectedUser.user_id);
        
        if (roles && roles.length > 0) {
          const { error: rolesError } = await supabase
            .from('user_roles')
            .insert(roles.map((r: any) => ({
              user_id: selectedUser.user_id,
              role: r.role,
            })));
          if (rolesError) throw rolesError;
        }
      } else {
        toast({ title: "Creación de usuarios no implementada en este demo" });
      }

      toast({ title: "Usuario actualizado correctamente" });
      setModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error al guardar usuario",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground italic">Administre las cuentas de usuario y sus permisos de acceso.</p>
        </div>
        <div className="flex gap-2 w-fit">
          <Button variant="outline" onClick={handleSeedResponsables} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldPlus className="h-4 w-4 mr-2" />}
            Crear Responsables Iniciales
          </Button>
          <Button onClick={() => { setSelectedUser(null); setModalOpen(true); }}>
            <UserPlus className="h-4 w-4 mr-2" /> Nuevo Usuario
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar por nombre o email..." 
            className="pl-10" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <UserTable 
        users={filteredUsers} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
      />

      <UserModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        user={selectedUser} 
        onSave={handleSave}
        loading={saving}
      />
    </div>
  );
}