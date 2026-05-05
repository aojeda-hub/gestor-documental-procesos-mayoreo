import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { 
  UserRole, SILO_LABELS, ROLE_LABELS, AppRole, SiloType
} from '@/types/database';

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

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  onSave: (data: any) => Promise<void>;
  loading: boolean;
}

export function UserModal({ open, onOpenChange, user, onSave, loading }: UserModalProps) {
  const [fullName, setFullName] = useState('');
  const [silos, setSilos] = useState<SiloType[]>([]);
  const [userRoles, setUserRoles] = useState<Partial<UserRole>[]>([]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setSilos(user.silos || []);
      setUserRoles(user.roles.map(r => ({ ...r })));
    } else {
      setFullName('');
      setSilos([]);
      setUserRoles([]);
    }
  }, [user, open]);

  const addRole = () => {
    setUserRoles([...userRoles, { role: 'viewer' as AppRole }]);
  };

  const removeRole = (index: number) => {
    setUserRoles(userRoles.filter((_, i) => i !== index));
  };

  const toggleSilo = (s: SiloType) => {
    setSilos(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = async () => {
    await onSave({ 
      full_name: fullName, 
      silo: silos[0] ?? null, // mantener compat: silo principal = primero
      silos, 
      roles: userRoles 
    });
  };

  const availableSilos = (Object.keys(SILO_LABELS) as SiloType[]).filter(s => !silos.includes(s));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          <DialogDescription>
            Modifique la información del usuario y sus roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre Completo</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre completo" />
          </div>

          <div className="space-y-2">
            <Label>Silos asignados</Label>
            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 border rounded-md bg-background">
              {silos.length === 0 && (
                <span className="text-xs text-muted-foreground italic self-center">Sin silos asignados</span>
              )}
              {silos.map(s => (
                <Badge key={s} variant="secondary" className="text-xs gap-1 pr-1">
                  {SILO_LABELS[s]}
                  <button onClick={() => toggleSilo(s)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {availableSilos.length > 0 && (
              <Select value="" onValueChange={(v) => toggleSilo(v as SiloType)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="+ Agregar silo" />
                </SelectTrigger>
                <SelectContent>
                  {availableSilos.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{SILO_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Roles</Label>
              <Button variant="outline" size="sm" onClick={addRole} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {userRoles.map((role, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select value={role.role || 'viewer'} onValueChange={v => {
                    const newRoles = [...userRoles];
                    newRoles[index] = { ...newRoles[index], role: v as AppRole };
                    setUserRoles(newRoles);
                  }}>
                    <SelectTrigger className="h-9 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRole(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {userRoles.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-3 border-2 border-dashed rounded-lg">
                  Sin roles asignados
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : user ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
