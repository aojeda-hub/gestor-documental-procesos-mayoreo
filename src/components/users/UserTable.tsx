import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { UserRole, SILO_LABELS, ROLE_LABELS, SiloType } from '@/types/database';

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

interface UserTableProps {
  users: UserWithRoles[];
  onEdit: (user: UserWithRoles) => void;
  onDelete: (id: string) => void;
}

export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Silo</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <span className="font-medium text-foreground">{user.full_name}</span>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                {user.silos && user.silos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {user.silos.map(s => (
                      <Badge key={s} variant="outline" className="text-[10px]">
                        {SILO_LABELS[s] || s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sin silo</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((ur) => (
                    <Badge key={ur.id} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {ROLE_LABELS[ur.role]}
                    </Badge>
                  ))}
                  {user.roles.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Sin roles</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(user)} className="h-8 w-8 text-primary">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(user.user_id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No se encontraron usuarios.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}