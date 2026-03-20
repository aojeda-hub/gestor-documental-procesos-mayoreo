import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, X } from 'lucide-react';
import { 
  Profile, UserRole, SILO_LABELS, ROLE_LABELS, AppRole, SiloType 
} from '@/types/database';

interface UserWithRoles extends Profile {
  roles: UserRole[];
}

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  onSave: (data: Partial<UserWithRoles>) => Promise<void>;
  loading: boolean;
}

export function UserModal({ open, onOpenChange, user, onSave, loading }: UserModalProps) {
  const [formData, setFormData] = useState<Partial<UserWithRoles>>({});
  const [userRoles, setUserRoles] = useState<Partial<UserRole>[]>([]);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        email: user.email,
        is_active: user.is_active,
      });
      setUserRoles(user.roles.map(r => ({ ...r })));
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        is_active: true,
      });
      setUserRoles([]);
    }
  }, [user, open]);

  const addRole = () => {
    setUserRoles([...userRoles, { role: 'colaborador' as AppRole, silo: null, department: '' }]);
  };

  const removeRole = (index: number) => {
    setUserRoles(userRoles.filter((_, i) => i !== index));
  };

  const updateRole = (index: number, field: keyof UserRole, value: any) => {
    const newRoles = [...userRoles];
    newRoles[index] = { ...newRoles[index], [field]: value };
    setUserRoles(newRoles);
  };

  const handleSave = async () => {
    await onSave({ ...formData, roles: userRoles as UserRole[] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold">Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifique la información del usuario y sus roles asignados.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basicos" className="w-full">
          <TabsList className="px-6 border-b w-full justify-start rounded-none h-12 bg-transparent gap-6">
            <TabsTrigger value="basicos" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 bg-transparent">Datos Básicos</TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 bg-transparent">Roles y Permisos</TabsTrigger>
          </TabsList>
          
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <TabsContent value="basicos" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input 
                    id="first_name" 
                    value={formData.first_name || ''} 
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })} 
                    placeholder="Ej. Nelson"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input 
                    id="last_name" 
                    value={formData.last_name || ''} 
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })} 
                    placeholder="Ej. Lucena"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <Input 
                    id="username" 
                    value={formData.username || ''} 
                    onChange={e => setFormData({ ...formData, username: e.target.value })} 
                    placeholder="Ej. nlucena"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email || ''} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    placeholder="email@mayoreo.biz"
                    disabled={!!user} // Email usually disabled on edit in many systems
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña (dejar vacío para mantener)</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Nueva contraseña"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="active" 
                  checked={formData.is_active} 
                  onCheckedChange={checked => setFormData({ ...formData, is_active: !!checked })} 
                />
                <Label htmlFor="active" className="text-sm font-medium leading-none cursor-pointer">
                  Usuario Activo
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="roles" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Asignación de Roles</h3>
                  <p className="text-xs text-muted-foreground">Debe tener al menos un rol asignado</p>
                </div>
                <Button variant="outline" size="sm" onClick={addRole} className="h-8">
                  <Plus className="h-4 w-4 mr-1" /> Agregar Rol
                </Button>
              </div>

              <div className="space-y-3">
                {userRoles.map((role, index) => (
                  <div key={index} className="relative border rounded-lg p-4 space-y-4 bg-muted">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-6 w-6 text-muted-foreground"
                      onClick={() => removeRole(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Rol #{index + 1}</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Silo</Label>
                        <Select 
                          value={role.silo || 'undefined'} 
                          onValueChange={v => updateRole(index, 'silo', v === 'undefined' ? null : v)}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Seleccionar Silo" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SILO_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Departamento</Label>
                        <Input 
                          className="h-9 text-xs"
                          placeholder="Ej. Gerencia"
                          value={role.department || ''}
                          onChange={e => updateRole(index, 'department', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Rol</Label>
                        <Select 
                          value={role.role || 'colaborador'} 
                          onValueChange={v => updateRole(index, 'role', v)}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Seleccionar Rol" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                {userRoles.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                    No hay roles asignados.
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-6 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : user ? 'Actualizar Usuario' : 'Crear Usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
