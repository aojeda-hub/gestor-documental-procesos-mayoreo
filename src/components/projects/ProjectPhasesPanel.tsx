import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Trash2, CheckCircle2, Circle, Lock, PlayCircle, ChevronRight,
} from 'lucide-react';
import type { ProjectTask, ProjectPhase, PhaseStatus } from '@/types/database';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  projectPhase?: string;
  onTasksChange: () => void;
}

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100];
const DEFAULT_PHASES = ['Alineación', 'Diseño', 'Construcción', 'Implementación', 'Adopción'];

const STATUS_META: Record<PhaseStatus, { label: string; cls: string; icon: any }> = {
  completada: { label: 'Completada', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  activa:     { label: 'Activa',     cls: 'bg-blue-500/15 text-blue-700 border-blue-300',          icon: PlayCircle },
  bloqueada:  { label: 'Bloqueada',  cls: 'bg-muted text-muted-foreground border-border',          icon: Lock },
};

export function ProjectPhasesPanel({ open, onOpenChange, projectId, projectName, projectPhase, onTasksChange }: Props) {
  const { toast } = useToast();
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskWeight, setNewTaskWeight] = useState(1);
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskEnd, setNewTaskEnd] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      let { data: ph, error: e1 } = await supabase
        .from('project_phases').select('*').eq('project_id', projectId).order('order_index');
      if (e1) throw e1;

      // Auto-seed default phases if none exist
      if (!ph || ph.length === 0) {
        const activeIdx = Math.max(0, DEFAULT_PHASES.indexOf(projectPhase || ''));
        const toInsert = DEFAULT_PHASES.map((name, idx) => ({
          project_id: projectId,
          name,
          order_index: idx + 1,
          status: idx < activeIdx ? 'completada' : idx === activeIdx ? 'activa' : 'bloqueada',
        }));
        const { error: insErr } = await supabase.from('project_phases').insert(toInsert);
        if (insErr) throw insErr;
        const reload = await supabase
          .from('project_phases').select('*').eq('project_id', projectId).order('order_index');
        if (reload.error) throw reload.error;
        ph = reload.data;
      }

      const { data: tk, error: e2 } = await supabase
        .from('project_tasks').select('*').eq('project_id', projectId).order('created_at');
      if (e2) throw e2;

      setPhases((ph || []) as ProjectPhase[]);
      setTasks((tk || []) as ProjectTask[]);
      const active = (ph || []).find((p: any) => p.status === 'activa');
      setSelectedPhaseId(prev => prev ?? active?.id ?? (ph?.[0]?.id ?? null));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) fetchData();
    if (!open) setSelectedPhaseId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const selectedPhase = phases.find(p => p.id === selectedPhaseId) || null;
  const selectedPhaseTasks = useMemo(
    () => tasks.filter(t => t.phase_id === selectedPhaseId),
    [tasks, selectedPhaseId]
  );

  const calcPhaseProgress = (phaseId: string) => {
    const ts = tasks.filter(t => t.phase_id === phaseId);
    const w = ts.reduce((s, t) => s + Number(t.weight), 0);
    if (w === 0) return null;
    const wp = ts.reduce((s, t) => s + Number(t.weight) * Number(t.progress_percent ?? 0), 0);
    return wp / w;
  };

  const projectProgress = useMemo(() => {
    const w = tasks.reduce((s, t) => s + Number(t.weight), 0);
    if (w === 0) return null;
    const wp = tasks.reduce((s, t) => s + Number(t.weight) * Number(t.progress_percent ?? 0), 0);
    return wp / w;
  }, [tasks]);

  const canEditPhase = (p: ProjectPhase | null) => p?.status === 'activa';

  const addTask = async () => {
    if (!selectedPhase || !canEditPhase(selectedPhase) || !newTaskName.trim()) return;
    try {
      const { error } = await supabase.from('project_tasks').insert({
        project_id: projectId,
        phase_id: selectedPhase.id,
        phase: selectedPhase.name,
        name: newTaskName.trim(),
        weight: newTaskWeight,
        status: 'Pendiente',
        progress_percent: 0,
        start_date: newTaskStart || null,
        end_date: newTaskEnd || null,
      });
      if (error) throw error;
      setNewTaskName(''); setNewTaskWeight(1); setNewTaskStart(''); setNewTaskEnd('');
      fetchData();
      onTasksChange();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const updateTaskProgress = async (task: ProjectTask, pct: number) => {
    if (!canEditPhase(selectedPhase)) return;
    const patch: any = { progress_percent: pct };
    if (pct === 100) patch.status = 'Completada';
    else if (pct === 0) patch.status = 'Pendiente';
    else patch.status = 'En Progreso';
    const { error } = await supabase.from('project_tasks').update(patch).eq('id', task.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    fetchData();
    onTasksChange();
  };

  const deleteTask = async (id: string) => {
    if (!canEditPhase(selectedPhase)) return;
    const { error } = await supabase.from('project_tasks').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    fetchData();
    onTasksChange();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Fases del proyecto: {projectName}</span>
            {projectProgress !== null && (
              <Badge variant="secondary" className="ml-auto">
                Avance global: {projectProgress.toFixed(1)}%
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto py-3 px-1">
          {phases.map((p, idx) => {
            const meta = STATUS_META[p.status];
            const Icon = meta.icon;
            const isSel = p.id === selectedPhaseId;
            const pct = calcPhaseProgress(p.id);
            return (
              <div key={p.id} className="flex items-center">
                <button
                  onClick={() => setSelectedPhaseId(p.id)}
                  className={`group flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition min-w-[150px] ${meta.cls} ${
                    isSel ? 'ring-2 ring-primary/60 shadow-sm' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{idx + 1}. {p.name}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-wide opacity-70">{meta.label}</div>
                  <div className="w-full">
                    <Progress value={pct ?? 0} className="h-1" />
                    <div className="text-[10px] mt-0.5 opacity-70">
                      {pct !== null ? `${pct.toFixed(0)}%` : 'sin tareas'}
                    </div>
                  </div>
                </button>
                {idx < phases.length - 1 && (
                  <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Selected phase content */}
        <div className="flex-1 overflow-y-auto border-t pt-4 space-y-4">
          {!selectedPhase ? (
            <div className="text-center text-muted-foreground py-10">Selecciona una fase.</div>
          ) : selectedPhase.status === 'bloqueada' ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <h4 className="font-semibold text-sm">Fase bloqueada</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Esta fase estará disponible cuando se complete la fase anterior.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedPhase.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedPhase.status === 'completada'
                      ? `Completada${selectedPhase.actual_end ? ' el ' + new Date(selectedPhase.actual_end).toLocaleDateString() : ''} — solo lectura`
                      : 'Fase activa — puedes agregar y actualizar tareas'}
                  </p>
                </div>
              </div>

              {canEditPhase(selectedPhase) && (
                <div className="grid grid-cols-12 gap-2 items-end bg-muted/30 p-3 rounded-lg border">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Nueva tarea</Label>
                    <Input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="Descripción..." />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Peso</Label>
                    <Input type="number" min={1} value={newTaskWeight} onChange={e => setNewTaskWeight(Number(e.target.value))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Inicio</Label>
                    <Input type="date" value={newTaskStart} onChange={e => setNewTaskStart(e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Fin</Label>
                    <Input type="date" value={newTaskEnd} onChange={e => setNewTaskEnd(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={addTask} disabled={!newTaskName.trim()} className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Agregar
                    </Button>
                  </div>
                </div>
              )}

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Tarea</TableHead>
                      <TableHead className="w-[100px]">Inicio</TableHead>
                      <TableHead className="w-[100px]">Fin</TableHead>
                      <TableHead className="w-[70px] text-center">Peso</TableHead>
                      <TableHead className="w-[120px]">Avance</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-4">Cargando...</TableCell></TableRow>
                    ) : selectedPhaseTasks.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">Sin tareas en esta fase.</TableCell></TableRow>
                    ) : selectedPhaseTasks.map(task => (
                      <TableRow key={task.id}>
                        <TableCell>
                          {task.progress_percent === 100
                            ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            : <Circle className="h-5 w-5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className={task.progress_percent === 100 ? 'line-through text-muted-foreground' : ''}>
                          {task.name}
                        </TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap">{task.start_date || '-'}</TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap">{task.end_date || '-'}</TableCell>
                        <TableCell className="text-center">{task.weight}</TableCell>
                        <TableCell>
                          <Select
                            value={String(task.progress_percent ?? 0)}
                            onValueChange={v => updateTaskProgress(task, Number(v))}
                            disabled={!canEditPhase(selectedPhase)}
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PROGRESS_OPTIONS.map(p => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {canEditPhase(selectedPhase) && (
                            <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
