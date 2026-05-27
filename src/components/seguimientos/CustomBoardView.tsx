import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, MoreVertical, Trash2, Pencil, ChevronLeft, Layout, ArrowLeftRight, Maximize2, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Seguimiento, SeguimientoBoard, SeguimientoColumn } from '@/types/database';

const COLUMN_COLORS = ['#64748b', '#4f46e5', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#7c3aed'];
const DEFAULT_COLUMN_COLOR = COLUMN_COLORS[0];

interface CustomBoardViewProps {
  board: SeguimientoBoard;
  onBack: () => void;
  onOpenTask: (id: string) => void;
  refreshKey?: number;
}

export function CustomBoardView({ board, onBack, onOpenTask, refreshKey = 0 }: CustomBoardViewProps) {
  const { toast } = useToast();
  const [columns, setColumns] = useState<SeguimientoColumn[]>([]);
  const [tasks, setTasks] = useState<Seguimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(DEFAULT_COLUMN_COLOR);
  const [editing, setEditing] = useState<Seguimiento | null>(null);
  const [editForm, setEditForm] = useState({ titulo: '', descripcion: '', prioridad: 'media' as any, responsable: '', fecha_limite: '' });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const dragMovedRef = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    titulo: '', descripcion: '', estado: 'pendiente' as any, prioridad: 'media' as any,
    responsable: '', categoria: '', fecha_limite: '', column_id: ''
  });

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
  }, [board.id, refreshKey]);

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    const { error } = await supabase.from('seguimiento_columns').insert({
      board_id: board.id,
      nombre: newColumnName,
      orden: columns.length,
      color: newColumnColor
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      setNewColumnName('');
      setNewColumnColor(DEFAULT_COLUMN_COLOR);
      setAddingColumn(false);
      loadData();
    }
  };

  const handleUpdateColumnColor = async (id: string, color: string) => {
    setColumns(curr => curr.map(col => col.id === id ? { ...col, color } : col));
    const { error } = await supabase.from('seguimiento_columns').update({ color }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      loadData();
    }
  };

  const handleDeleteColumn = async (id: string) => {
    if (!confirm('¿Eliminar esta columna? Las tareas quedarán sin columna.')) return;
    const { error } = await supabase.from('seguimiento_columns').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else loadData();
  };

  const openCreate = () => {
    const targetColumn = columns[0];
    if (!targetColumn) {
      toast({ title: 'Crea una lista primero', description: 'Necesitas al menos una lista para ubicar el seguimiento.', variant: 'destructive' });
      return;
    }
    setCreateForm({
      titulo: '', descripcion: '', estado: 'pendiente', prioridad: 'media',
      responsable: '', categoria: '', fecha_limite: '', column_id: targetColumn.id,
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!createForm.titulo.trim()) {
      toast({ title: 'Título requerido', variant: 'destructive' });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('seguimientos').insert({
      titulo: createForm.titulo.trim(),
      descripcion: createForm.descripcion.trim() || null,
      estado: createForm.estado,
      prioridad: createForm.prioridad,
      responsable: createForm.responsable.trim() || null,
      categoria: createForm.categoria.trim() || null,
      fecha_limite: createForm.fecha_limite || null,
      user_id: user.id,
      board_id: board.id,
      column_id: createForm.column_id,
    } as any).select('*').single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Seguimiento creado' });
    setCreateOpen(false);
    setTasks(curr => [data as Seguimiento, ...curr]);
  };


  const moveTask = async (taskId: string, targetColumnId: string) => {
    const prev = tasks;
    setTasks(curr => curr.map(t => t.id === taskId ? { ...t, column_id: targetColumnId } : t));
    const { error } = await supabase.from('seguimientos').update({
      board_id: board.id,
      column_id: targetColumnId
    }).eq('id', taskId);
    
    if (error) {
      setTasks(prev);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    dragMovedRef.current = false;
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverCol(null); };
  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) setDragOverCol(colId);
  };
  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedId;
    setDragOverCol(null);
    setDraggedId(null);
    if (!taskId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.column_id === colId) return;
    dragMovedRef.current = true;
    moveTask(taskId, colId);
  };

  const handleTaskClick = (taskId: string) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    onOpenTask(taskId);
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    const { error } = await supabase.from('seguimientos').delete().eq('id', taskId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Tarea eliminada' }); loadData(); }
  };

  const openEdit = (task: Seguimiento) => {
    setEditing(task);
    setEditForm({
      titulo: task.titulo,
      descripcion: task.descripcion || '',
      prioridad: task.prioridad,
      responsable: task.responsable || '',
      fecha_limite: task.fecha_limite || '',
    });
  };

  const saveEdit = async () => {
    if (!editing || !editForm.titulo.trim()) return;
    const { error } = await supabase.from('seguimientos').update({
      titulo: editForm.titulo.trim(),
      descripcion: editForm.descripcion.trim() || null,
      prioridad: editForm.prioridad,
      responsable: editForm.responsable.trim() || null,
      fecha_limite: editForm.fecha_limite || null,
    }).eq('id', editing.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Tarea actualizada' });
    setEditing(null);
    loadData();
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500">
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{board.nombre}</h2>
            <p className="text-sm text-slate-500">Tablero personalizado compartido</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={addNewSeguimiento}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4 mr-2" /> Nuevo seguimiento
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setAddingColumn(true)}
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4 mr-2" /> Añadir lista
          </Button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 items-start min-h-[60vh]">
        {columns.map(col => (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={() => setDragOverCol(curr => curr === col.id ? null : curr)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={cn(
              "w-80 shrink-0 flex flex-col bg-slate-100/50 rounded-xl border p-3 transition-colors",
              dragOverCol === col.id ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200/60"
            )}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color || DEFAULT_COLUMN_COLOR }} />
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
                  <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                    <Popover>
                      <PopoverTrigger className="flex w-full items-center px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground rounded-sm">
                        <Palette className="h-4 w-4 mr-2" /> Cambiar color
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-52 p-3">
                        <Label className="text-xs">Color de lista</Label>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                          {COLUMN_COLORS.map(color => (
                            <button
                              key={color}
                              type="button"
                              aria-label={`Usar color ${color}`}
                              onClick={() => handleUpdateColumnColor(col.id, color)}
                              className={cn(
                                "h-8 w-8 rounded-full border border-white shadow-sm ring-offset-2 ring-offset-background transition-transform hover:scale-105",
                                (col.color || DEFAULT_COLUMN_COLOR) === color && "ring-2 ring-indigo-500"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </DropdownMenuItem>
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
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-slate-200/80 group",
                    draggedId === task.id && "opacity-40"
                  )}
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h5 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-indigo-600 transition-colors flex-1">
                      {task.titulo}
                    </h5>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Abrir" onClick={() => onOpenTask(task.id)}>
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Editar" onClick={() => openEdit(task)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500" title="Eliminar" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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
              
              {groupedTasks[col.id]?.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-lg">
                  Arrastra seguimientos aquí
                </div>
              )}
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
            <div className="mb-3 space-y-2">
              <Label className="text-xs text-slate-500">Color de lista</Label>
              <div className="flex flex-wrap gap-2">
                {COLUMN_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Seleccionar color ${color}`}
                    onClick={() => setNewColumnColor(color)}
                    className={cn(
                      "h-7 w-7 rounded-full border border-white shadow-sm ring-offset-2 ring-offset-white transition-transform hover:scale-105",
                      newColumnColor === color && "ring-2 ring-indigo-500"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input value={editForm.titulo} onChange={e => setEditForm({ ...editForm, titulo: e.target.value })} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={editForm.descripcion} onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridad</Label>
                <Select value={editForm.prioridad} onValueChange={(v: any) => setEditForm({ ...editForm, prioridad: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsable</Label>
                <Input value={editForm.responsable} onChange={e => setEditForm({ ...editForm, responsable: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Fecha límite</Label>
              <Input type="date" value={editForm.fecha_limite} onChange={e => setEditForm({ ...editForm, fecha_limite: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
