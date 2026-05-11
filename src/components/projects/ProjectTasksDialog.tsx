import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import type { ProjectTask } from '@/types/database';

interface ProjectTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  projectPhase: string;
  onTasksChange: () => void;
}

const PHASES = ['Alineación', 'Diseño', 'Construcción', 'Implementación', 'Adopción'];

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100];

const emptyTaskForm = {
  name: '',
  phase: 'Alineación',
  weight: 1,
  status: 'Pendiente' as 'Pendiente' | 'En Progreso' | 'Completada',
  actual_progress: 0,
  progress_percent: 0,
  start_date: '',
  end_date: '',
};

export function ProjectTasksDialog({ open, onOpenChange, projectId, projectName, projectPhase, onTasksChange }: ProjectTasksDialogProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskForm, setTaskForm] = useState({ ...emptyTaskForm, phase: projectPhase });

  useEffect(() => {
    setTaskForm(f => ({ ...f, phase: projectPhase }));
  }, [projectPhase, open]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks((data || []) as ProjectTask[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      fetchTasks();
    }
  }, [open, projectId]);

  const addTask = async () => {
    if (!taskForm.name) return;
    
    // Validation: sum of weights in phase <= 100
    const currentPhaseWeight = tasks
      .filter(t => t.phase === taskForm.phase)
      .reduce((sum, t) => sum + Number(t.weight), 0);
    
    if (currentPhaseWeight + taskForm.weight > 100) {
      toast({ 
        title: 'Límite de peso excedido', 
        description: `La suma de pesos para la fase "${taskForm.phase}" no puede superar 100. Actualmente hay ${currentPhaseWeight}.`,
        variant: 'destructive' 
      });
      return;
    }

    // Restriction: Only allow adding tasks to current phase unless it's 'Alineación' (planning)
    // Actually, user says: "Al crear proyecto: definir todas las tareas planificadas por fase"
    // and "No permitir agregar tareas a fases futuras o pasadas".
    // I'll assume they can plan everything while in 'Alineación'.
    // But once they move forward, they are locked to the current phase.
    
    // I need the current project phase. I'll pass it as a prop or fetch it.
    // Let's assume I have a `projectPhase` prop.

    try {
      const { error } = await supabase
        .from('project_tasks')
        .insert({ ...taskForm, project_id: projectId });

      if (error) throw error;
      toast({ title: 'Tarea añadida' });
      setTaskForm(emptyTaskForm);
      fetchTasks();
      onTasksChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateTaskStatus = async (task: ProjectTask, newStatus: ProjectTask['status']) => {
    try {
      const patch: any = { status: newStatus };
      if (newStatus === 'Completada') patch.progress_percent = 100;
      else if (newStatus === 'Pendiente') patch.progress_percent = 0;
      const { error } = await supabase
        .from('project_tasks')
        .update(patch)
        .eq('id', task.id);

      if (error) throw error;
      fetchTasks();
      onTasksChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateTaskProgress = async (task: ProjectTask, pct: number) => {
    try {
      const patch: any = { progress_percent: pct };
      if (pct === 100) patch.status = 'Completada';
      else if (pct === 0 && task.status === 'Completada') patch.status = 'Pendiente';
      else if (pct > 0 && pct < 100 && task.status !== 'En Progreso') patch.status = 'En Progreso';
      const { error } = await supabase.from('project_tasks').update(patch).eq('id', task.id);
      if (error) throw error;
      fetchTasks();
      onTasksChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Tarea eliminada' });
      fetchTasks();
      onTasksChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const advancePhase = async () => {
    const currentIndex = PHASES.indexOf(projectPhase);
    if (currentIndex === -1 || currentIndex === PHASES.length - 1) return;
    
    const nextPhase = PHASES[currentIndex + 1];
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ phase: nextPhase })
        .eq('id', projectId);

      if (error) throw error;
      toast({ title: `Proyecto avanzado a fase: ${nextPhase}` });
      onTasksChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const totalWeight = tasks.reduce((sum, t) => sum + Number(t.weight), 0);
  const currentPhaseTasks = tasks.filter(t => t.phase === projectPhase);
  const currentPhaseWeight = currentPhaseTasks.reduce((sum, t) => sum + Number(t.weight), 0);
  const currentPhaseCompletedWeight = currentPhaseTasks
    .filter(t => t.status === 'Completada')
    .reduce((sum, t) => sum + Number(t.weight), 0);
  
  const currentPhaseProgress = currentPhaseWeight > 0 ? (currentPhaseCompletedWeight / currentPhaseWeight) * 100 : 0;
  const canAdvance = currentPhaseWeight === 100 && currentPhaseCompletedWeight === 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>Tareas: {projectName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Fase Actual: {projectPhase}</Badge>
                <span className="text-xs text-muted-foreground">
                  Progreso Fase: {currentPhaseProgress.toFixed(1)}% ({currentPhaseWeight}/100 pts)
                </span>
              </div>
            </div>
            {projectPhase !== 'Adopción' && (
              <Button 
                onClick={advancePhase} 
                disabled={!canAdvance}
                variant={canAdvance ? "default" : "outline"}
                className={canAdvance ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Avanzar a {PHASES[PHASES.indexOf(projectPhase) + 1]}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* New Task Form */}
          <div className="grid grid-cols-12 gap-2 items-end bg-muted/30 p-3 rounded-lg border">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Nombre de la Tarea</Label>
              <Input 
                value={taskForm.name} 
                onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Descripción..."
              />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Fase</Label>
              <Select 
                value={taskForm.phase} 
                onValueChange={(v: any) => setTaskForm(f => ({ ...f, phase: v }))}
                disabled={projectPhase !== 'Alineación'}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Peso</Label>
              <Input 
                type="number" 
                min="1"
                max="100"
                value={taskForm.weight} 
                onChange={e => setTaskForm(f => ({ ...f, weight: Number(e.target.value) }))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Estatus</Label>
              <Select value={taskForm.status} onValueChange={(v: any) => setTaskForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="En Progreso">En Progreso</SelectItem>
                  <SelectItem value="Completada">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Inicio</Label>
              <Input 
                type="date" 
                value={taskForm.start_date} 
                onChange={e => setTaskForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Fin</Label>
              <Input 
                type="date" 
                value={taskForm.end_date} 
                onChange={e => setTaskForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>
            <div className="col-span-1">
              <Button size="icon" onClick={addTask} disabled={!taskForm.name}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Tarea</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead className="w-[100px]">Inicio</TableHead>
                  <TableHead className="w-[100px]">Fin</TableHead>
                  <TableHead className="w-[80px] text-center">Peso</TableHead>
                  <TableHead className="w-[110px]">Avance</TableHead>
                  <TableHead className="w-[150px]">Estatus</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4">Cargando...</TableCell></TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Sin tareas aún.</TableCell></TableRow>
                ) : tasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell>
                      {task.status === 'Completada' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className={task.status === 'Completada' ? 'line-through text-muted-foreground' : ''}>
                      {task.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">{task.phase}</Badge>
                    </TableCell>
                    <TableCell className="text-[10px] whitespace-nowrap">{task.start_date || '-'}</TableCell>
                    <TableCell className="text-[10px] whitespace-nowrap">{task.end_date || '-'}</TableCell>
                    <TableCell className="text-center">{task.weight}</TableCell>
                    <TableCell>
                      <Select
                        value={String(task.progress_percent ?? 0)}
                        onValueChange={(v) => updateTaskProgress(task, Number(v))}
                      >
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROGRESS_OPTIONS.map(p => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={task.status} 
                        onValueChange={(v: any) => updateTaskStatus(task, v)}
                      >
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="En Progreso">En Progreso</SelectItem>
                          <SelectItem value="Completada">Completada</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
