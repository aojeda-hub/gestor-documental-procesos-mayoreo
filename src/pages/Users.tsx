import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserTable } from '@/components/users/UserTable';
import { UserModal } from '@/components/users/UserModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Search, UserPlus, Filter } from 'lucide-react';
import { Profile, UserRole } from '@/types/database';
import { useToast } from '@/components/ui/use-toast';

interface UserWithRoles extends Profile {
  roles: UserRole[];
}

export default function Users() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with auth emails (requires service role or advanced RLS, 
      // but here we assume profiles exist for users and we can join or fetch separately)
      // Since we can't easily join auth.users from client without a function, 
      // we'll fetch profiles and assume email is in meta or handled.
      // Actually, in this project, we might have emails in the profile if we sync them.
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Temporary optimization: fetch emails if possible or use usernames
      const usersWithRoles: UserWithRoles[] = (profilesData || []).map(profile => ({
        ...profile,
        roles: (rolesData || []).filter(r => r.user_id === profile.user_id) as UserRole[],
        // In a real app, we'd fetch email from auth or a secure view
        email: profile.username ? `${profile.username}@mayoreo.biz` : 'sin-email@mayoreo.biz'
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
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', selectedUser.user_id);
        
        if (profileError) throw profileError;

        // Update roles (Delete and Re-insert for simplicity in MVP)
        await supabase.from('user_roles').delete().eq('user_id', selectedUser.user_id);
        
        if (roles && roles.length > 0) {
          const { error: rolesError } = await supabase
            .from('user_roles')
            .insert(roles.map((r: any) => ({
              user_id: selectedUser.user_id,
              role: r.role,
              silo: r.silo,
              department: r.department
            })));
          if (rolesError) throw rolesError;
        }
      } else {
        // Create user logic would involve auth.signUp which is complex for a dash 
        // usually handled via a function or admin API.
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
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      user.username?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) || 
      (statusFilter === 'inactive' && !user.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground italic">Administre las cuentas de usuario y sus permisos de acceso.</p>
        </div>
        <Button onClick={() => { setSelectedUser(null); setModalOpen(true); }} className="w-fit">
          <UserPlus className="h-4 w-4 mr-2" /> Nuevo Usuario
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar por nombre o usuario..." 
            className="pl-10" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-64">
          <Filter className="h-4 w-4 text-muted-foreground mr-2" />
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Solo Activos</SelectItem>
              <SelectItem value="inactive">Solo Inactivos</SelectItem>
            </SelectContent>
          </Select>
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
