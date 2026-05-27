import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings, Ban, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SECTIONS = [
  'Documentos',
  'Indicadores',
  'Proyectos',
  'Mis Seguimientos',
  'BPA',
  'Desarrollos',
  'Administración'
];

type PermissionState = { ver: boolean; editar: boolean };
type RolePermissions = Record<string, PermissionState>;

const initialPermissions: Record<string, RolePermissions> = {
  'Super administrador': {
    'Documentos': { ver: true, editar: true },
    'Indicadores': { ver: true, editar: true },
    'Proyectos': { ver: true, editar: true },
    'Mis Seguimientos': { ver: true, editar: true },
    'BPA': { ver: true, editar: true },
    'Desarrollos': { ver: true, editar: true },
    'Administración': { ver: true, editar: true },
  },
  'Administrador básico': {
    'Documentos': { ver: true, editar: true },
    'Indicadores': { ver: true, editar: true },
    'Proyectos': { ver: true, editar: true },
    'Mis Seguimientos': { ver: true, editar: true },
    'BPA': { ver: true, editar: true },
    'Desarrollos': { ver: false, editar: false },
    'Administración': { ver: true, editar: true },
  },
  'Gerente': {
    'Documentos': { ver: true, editar: true },
    'Indicadores': { ver: true, editar: true },
    'Proyectos': { ver: true, editar: true },
    'Mis Seguimientos': { ver: true, editar: true },
    'BPA': { ver: true, editar: true },
    'Desarrollos': { ver: false, editar: false },
    'Administración': { ver: false, editar: false },
  },
  'Jefe': {
    'Documentos': { ver: true, editar: true },
    'Indicadores': { ver: true, editar: true },
    'Proyectos': { ver: true, editar: true },
    'Mis Seguimientos': { ver: true, editar: true },
    'BPA': { ver: false, editar: false },
    'Desarrollos': { ver: false, editar: false },
    'Administración': { ver: false, editar: false },
  },
  'Evaluador': {
    'Documentos': { ver: true, editar: false },
    'Indicadores': { ver: true, editar: false },
    'Proyectos': { ver: false, editar: false },
    'Mis Seguimientos': { ver: false, editar: false },
    'BPA': { ver: true, editar: false },
    'Desarrollos': { ver: false, editar: false },
    'Administración': { ver: false, editar: false },
  }
};

export default function PermissionsList() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState(initialPermissions);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [tempPerms, setTempPerms] = useState<PermissionState>({ ver: false, editar: false });

  const roles = [
    'Super administrador', 
    'Administrador básico', 
    'Gerente', 
    'Jefe', 
    'Evaluador'
  ];

  const openEdit = (role: string) => {
    setEditingRole(role);
    setSelectedSection('');
    setTempPerms({ ver: false, editar: false });
  };

  const handleSectionChange = (val: string) => {
    setSelectedSection(val);
    if (editingRole) {
      setTempPerms(permissions[editingRole][val] || { ver: false, editar: false });
    }
  };

  const handleSave = () => {
    if (editingRole && selectedSection) {
      setPermissions(prev => ({
        ...prev,
        [editingRole]: {
          ...prev[editingRole],
          [selectedSection]: tempPerms
        }
      }));
      toast({ title: 'Permisos actualizados localmente (modo demo)' });
    }
    setEditingRole(null);
  };

  const handleVerChange = (checked: boolean) => {
    if (!checked) {
      setTempPerms({ ver: false, editar: false });
    } else {
      setTempPerms(prev => ({ ...prev, ver: true }));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-center">ROL</TableHead>
                {SECTIONS.map(s => (
                  <TableHead key={s} className="text-center text-xs uppercase">{s}</TableHead>
                ))}
                <TableHead className="text-center font-bold">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map(role => (
                <TableRow key={role}>
                  <TableCell className="text-center font-medium whitespace-nowrap">
                    {role}
                  </TableCell>
                  {SECTIONS.map(s => {
                    const hasAccess = permissions[role]?.[s]?.ver;
                    return (
                      <TableCell key={s} className="text-center">
                        {hasAccess ? (
                          <Settings className="h-5 w-5 text-blue-500 mx-auto" />
                        ) : (
                          <Ban className="h-5 w-5 text-red-300 mx-auto" />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(role)}>
                      <Pencil className="h-4 w-4 text-amber-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingRole} onOpenChange={(o) => !o && setEditingRole(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar Permisos</DialogTitle>
            <p className="text-sm text-muted-foreground">{editingRole}</p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Sección</Label>
              <Select value={selectedSection} onValueChange={handleSectionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una sección" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSection && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Permisos para: <span className="text-blue-500">{selectedSection}</span></p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="ver" checked={tempPerms.ver} onCheckedChange={handleVerChange} />
                    <label htmlFor="ver" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Ver
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="editar" 
                      checked={tempPerms.editar} 
                      onCheckedChange={(c) => setTempPerms(prev => ({ ...prev, editar: !!c, ver: c ? true : prev.ver }))} 
                      disabled={!tempPerms.ver}
                    />
                    <label htmlFor="editar" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Editar
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si no tiene permiso de Ver, tampoco podrá acceder ni editar la sección.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
