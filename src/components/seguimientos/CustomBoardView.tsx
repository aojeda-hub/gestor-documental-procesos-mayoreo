import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, MoreVertical, Trash2, Pencil, ChevronLeft, Layout, ArrowLeftRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Seguimiento, SeguimientoBoard, SeguimientoColumn } from '@/types/database';

interface CustomBoardViewProps {
  board: SeguimientoBoard;
  onBack: () => void;
  onOpenTask: (id: string) => void;
}

export function CustomBoardView({ board, onBack, onOpenTask }: CustomBoardViewProps) {
  const { toast } = useToast();
  const [columns, setColumns] = useState<SeguimientoColumn[]>([]);
  const [tasks, setTasks] = useState<Seguimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const loadData = async () => {
    setLoading(true);
    // Load columns
    const { data: cols, error: errCols } = await supabase
      .from('seguimiento_columns')
      .select('*')
      .eq('board_id', board.id)
      .order('orden', { ascending: true });

    // Load tasks for this board
    const { data: tks, error: errTks } = await supabase
      .from('seguimientos')
      .select('*')
      .eq('board_id', board.id);

    if (errCols || errTks) {
      toast({ title: 'Error', description: 'No se pudieron cargar los datos del tablero.', variant: 'destructive' });
    } else {
      setColumns(cols || []);
      setTasks((tks as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [board.id]);

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    const { error } = await supabase.from('seguimiento_columns').insert({
      board_id: board.id,
      nombre: newColumnName,
      orden: columns.length
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      setNewColumnName('');
      setAddingColumn(false);
      loadData();
    }
  };

  const handleDeleteColumn = async (id: string) => {
    if (!confirm('¿Eliminar esta columna? Las tareas quedarán sin columna.')) return;
    const { error } = await supabase.from('seguimiento_columns').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else loadData();
  };

  const addTaskToColumn = async (columnId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('seguimientos').insert({
      titulo: 'Nueva tarea',
      user_id: user.id,
      board_id: board.id,
      column_id: columnId,
      estado: 'pendiente' // Default status required by schema but we use column_id for view
    });

    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else loadData();
  };

  const moveTask = async (taskId: string, targetColumnId: string) => {
    const { error } = await supabase.from('seguimientos').update({
      column_id: targetColumnId
    }).eq('id', taskId);
    
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else loadData();
  };

  const groupedTasks = useMemo(() => {
    const g: Record<string, Seguimiento[]> = {};
    columns.forEach(c => g[c.id] = []);
    tasks.forEach(t => {
      if (t.column_id && g[t.column_id]) g[t.column_id].push(t);
    });
    return g;
  }, [columns, tasks]);

  if (loading) return <div className="p-12 text-center text-slate-500">Cargando tablero...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500">
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{board.nombre}</h2>
            <p className="text-sm text-slate-500">Tablero personalizado compartido</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setAddingColumn(true)}
          className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          <Plus className="h-4 w-4 mr-2" /> Añadir Lista
        </Button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 items-start min-h-[60vh]">
        {columns.map(col => (
          <div key={col.id} className="w-80 shrink-0 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                {col.nombre}
                <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-600 text-[10px]">
                  {groupedTasks[col.id]?.length || 0}
                </Badge>
              </h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDeleteColumn(col.id)} className="text-rose-600">
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar Lista
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-3 flex-1">
              {groupedTasks[col.id]?.map(task => (
                <Card 
                  key={task.id} 
                  className="p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border-slate-200/80 group"
                  onClick={() => onOpenTask(task.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-indigo-600 transition-colors">
                      {task.titulo}
                    </h5>
                  </div>
                  {task.prioridad !== 'baja' && (
                    <Badge className={cn(
                      "text-[10px] uppercase tracking-wider mb-2",
                      task.prioridad === 'critica' ? "bg-rose-100 text-rose-700" :
                      task.prioridad === 'alta' ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {task.prioridad}
                    </Badge>
                  )}
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-indigo-600">
                            <ArrowLeftRight className="h-3 w-3 mr-1" /> Mover
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {columns.filter(c => c.id !== col.id).map(c => (
                            <DropdownMenuItem key={c.id} onClick={() => moveTask(task.id, c.id)}>
                              A {c.nombre}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 h-9"
                onClick={() => addTaskToColumn(col.id)}
              >
                <Plus className="h-4 w-4 mr-2" /> Añadir tarjeta
              </Button>
            </div>
          </div>
        ))}

        {addingColumn ? (
          <div className="w-80 shrink-0 bg-white rounded-xl border border-indigo-200 p-4 shadow-lg shadow-indigo-100/50">
            <Input 
              autoFocus
              placeholder="Nombre de la lista..." 
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="mb-3 border-indigo-100 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAddColumn} className="bg-indigo-600 hover:bg-indigo-700">Añadir lista</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingColumn(false)}>Cancelar</Button>
            </div>
          </div>
        ) : columns.length === 0 && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <Layout className="h-10 w-10 text-slate-300 mb-4" />
            <h4 className="text-slate-900 font-semibold">Este tablero está vacío</h4>
            <p className="text-slate-500 text-sm mb-6">Empieza añadiendo tu primera columna (lista).</p>
            <Button onClick={() => setAddingColumn(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Crear primera lista
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
