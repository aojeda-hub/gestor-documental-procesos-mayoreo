import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trello, MoreVertical, Trash2, Pencil, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SeguimientoBoard } from '@/types/database';

interface BoardListProps {
  boards: SeguimientoBoard[];
  onSelectBoard: (boardId: string) => void;
  onRefresh: () => void;
}

export function BoardList({ boards, onSelectBoard, onRefresh }: BoardListProps) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newBoardName.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('seguimiento_boards').insert({
      nombre: newBoardName,
      created_by: user.id
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tablero creado', description: 'El tablero se ha creado correctamente.' });
      setNewBoardName('');
      setShowCreate(false);
      onRefresh();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de eliminar este tablero y todas sus columnas y tareas?')) return;
    
    const { error } = await supabase.from('seguimiento_boards').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else onRefresh();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <Card 
        className="border-dashed border-2 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-all hover:border-indigo-300 group"
        onClick={() => setShowCreate(true)}
      >
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6 text-indigo-600" />
          </div>
          <span className="mt-4 font-medium text-slate-600">Nuevo Tablero</span>
        </CardContent>
      </Card>

      {boards.map(board => (
        <Card 
          key={board.id} 
          className="group hover:shadow-md transition-all cursor-pointer border-slate-200"
          onClick={() => onSelectBoard(board.id)}
        >
          <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Personalizado</span>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {board.nombre}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleDelete(board.id, e as any)} className="text-rose-600">
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center -space-x-2">
                <div className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                  <Users className="h-3 w-3 text-slate-400" />
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-indigo-600 font-semibold p-0 h-auto hover:bg-transparent">
                Ver tablero →
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Tablero</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Nombre del Tablero</label>
            <Input 
              placeholder="Ej: Proyecto Lanzamiento, Tareas Equipo..." 
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading ? 'Creando...' : 'Crear Tablero'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
