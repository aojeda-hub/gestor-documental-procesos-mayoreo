import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mockRoles = [
  { id: 1, name: 'Super administrador' },
  { id: 2, name: 'Administrador básico' },
  { id: 3, name: 'Gerente' },
  { id: 4, name: 'Jefe' },
  { id: 5, name: 'Evaluador' },
];

export default function RolesList() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] font-bold text-slate-700">CONSECUTIVO</TableHead>
                <TableHead className="font-bold text-slate-700">DESCRIPCIÓN</TableHead>
                <TableHead className="text-right font-bold text-slate-700">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium px-4 py-3">{role.id}</TableCell>
                  <TableCell className="px-4 py-3 text-sm">{role.name}</TableCell>
                  <TableCell className="text-right px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between px-6 py-3 border-t bg-slate-50/50">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8 disabled:opacity-50" disabled>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 disabled:opacity-50" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm mx-2 text-slate-600">Página 1 de 1</span>
            <Button variant="outline" size="icon" className="h-8 w-8 disabled:opacity-50" disabled>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 disabled:opacity-50" disabled>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Select defaultValue="10">
              <SelectTrigger className="h-8 w-[70px] bg-white">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-600">
              Mostrando 1 - {mockRoles.length} de {mockRoles.length} registros
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
