import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  Plus, Trash2, CheckCircle2, Circle, Lock, PlayCircle, ChevronRight, Pencil, UserPlus, User as UserIcon, Check, ClipboardCheck, AlertTriangle, ShieldAlert, Flag, GitBranch, Zap, CalendarRange,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { ProjectTask, ProjectPhase, PhaseStatus, PhaseGateItem, ProyectoRiesgo, ProjectMilestone, TaskDependency } from '@/types/database';
import { ensureProjectChecklist } from '@/lib/phaseGateDefaults';
import { calcularNivelRiesgo, NIVEL_META } from '@/lib/riskUtils';
import { ensureProjectMilestones } from '@/lib/milestoneDefaults';
import { getBlockingDependencies } from '@/lib/dependencyUtils';
import { calculateCriticalPath } from '@/lib/criticalPathUtils';
import { PhaseGateModal } from './PhaseGateModal';
import { ProjectRisksDialog } from './ProjectRisksDialog';
import { ProjectMilestonesDialog } from './ProjectMilestonesDialog';
import { ProjectDependenciesDialog } from './ProjectDependenciesDialog';
import { ProjectScheduleDialog } from './ProjectScheduleDialog';

type ProfileLite = { user_id: string; full_name: string | null; email: string | null };
type TaskWithAssignee = ProjectTask & { assignee_id?: string | null };
type AssigneeMap = Record<string, string[]>; // taskId -> userId[]

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  projectPhase?: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  baselineCapturedAt?: string | null;
  onTasksChange: () => void;
}

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100];
const DEFAULT_PHASES = ['Alineación', 'Diseño', 'Construcción', 'Implementación', 'Adopción'];

const STATUS_META: Record<PhaseStatus, { label: string; cls: string; icon: any }> = {
  completada: { label: 'Completada', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  activa:     { label: 'Activa',     cls: 'bg-blue-500/15 text-blue-700 border-blue-300',          icon: PlayCircle },
  bloqueada:  { label: 'Bloqueada',  cls: 'bg-muted text-muted-foreground border-border',          icon: Lock },
};

export function ProjectPhasesPanel({ open, onOpenChange, projectId, projectName, projectPhase, projectStartDate, projectEndDate, baselineCapturedAt, onTasksChange }: Props) {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const isViewer = false; // viewer ahora tiene permisos completos sobre proyectos
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [checklistItems, setChecklistItems] = useState<PhaseGateItem[]>([]);
  const [riesgosList, setRiesgosList] = useState<ProyectoRiesgo[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [assigneesByTask, setAssigneesByTask] = useState<AssigneeMap>({});
  const [loading, setLoading] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskWeight, setNewTaskWeight] = useState(1);
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskEnd, setNewTaskEnd] = useState('');
  const [editTask, setEditTask] = useState<TaskWithAssignee | null>(null);
  const [editForm, setEditForm] = useState({ name: '', weight: 1, start_date: '', end_date: '' });

  // Modals State
  const [phaseGateModalOpen, setPhaseGateModalOpen] = useState(false);
  const [phaseGateTargetPhase, setPhaseGateTargetPhase] = useState<string>('Alineación');
  const [risksDialogOpen, setRisksDialogOpen] = useState(false);
  const [milestonesDialogOpen, setMilestonesDialogOpen] = useState(false);
  const [dependenciesDialogOpen, setDependenciesDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

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
      setTasks((tk || []) as TaskWithAssignee[]);
      const active = (ph || []).find((p: any) => p.status === 'activa');
      setSelectedPhaseId(prev => prev ?? active?.id ?? (ph?.[0]?.id ?? null));

      const { data: pr } = await supabase.from('profiles').select('user_id, full_name, email');
      setProfiles((pr || []) as ProfileLite[]);

      const taskIds = (tk || []).map((t: any) => t.id);
      if (taskIds.length > 0) {
        const { data: aRows } = await (supabase as any)
          .from('project_task_assignees')
          .select('task_id, user_id')
          .in('task_id', taskIds);
        const map: AssigneeMap = {};
        (aRows || []).forEach((r: any) => {
          (map[r.task_id] = map[r.task_id] || []).push(r.user_id);
        });
        setAssigneesByTask(map);
      } else {
        setAssigneesByTask({});
      }

      // Fetch or seed Phase Gate checklist items
      const chk = await ensureProjectChecklist(projectId);
      setChecklistItems(chk);

      // Fetch Riesgos
      const { data: rData } = await supabase
        .from('riesgos')
        .select('*')
        .eq('proyecto_id', projectId);
      setRiesgosList((rData || []) as ProyectoRiesgo[]);

      // Fetch or seed Hitos (milestones)
      const hitos = await ensureProjectMilestones(projectId, {
        start_date: projectStartDate,
        end_date: projectEndDate,
      });
      setMilestones(hitos);

      // Fetch Dependencias
      const { data: dData } = await supabase
        .from('dependencias')
        .select('*')
        .eq('proyecto_id', projectId);
      setDependencies((dData || []) as TaskDependency[]);
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

  const activeRisksCount = riesgosList.filter(r => r.estado === 'Activo').length;
  const pendingMilestonesCount = milestones.filter(m => !m.completado).length;

  const tasksById = useMemo(() => {
    const map: Record<string, ProjectTask> = {};
    tasks.forEach(t => { map[t.id] = t; });
    return map;
  }, [tasks]);

  const criticalPath = useMemo(() => calculateCriticalPath(tasks, dependencies), [tasks, dependencies]);
  const criticalTaskCount = Object.values(criticalPath.tasks).filter(t => t.isCritical).length;

  const canEditPhase = (p: ProjectPhase | null) => p?.status === 'activa' && !isViewer;

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

    if (pct === 100) {
      const blocking = getBlockingDependencies(task.id, dependencies, tasksById);
      if (blocking.length > 0) {
        toast({
          title: '❌ No puedes completar esta tarea todavía',
          description: `Depende de: ${blocking.map(b => b.tareaOrigen.name).join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
    }

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

  const toggleAssignee = async (task: TaskWithAssignee, userId: string) => {
    if (!canEditPhase(selectedPhase)) return;
    const current = assigneesByTask[task.id] || [];
    const isAssigned = current.includes(userId);
    if (isAssigned) {
      const { error } = await (supabase as any)
        .from('project_task_assignees')
        .delete()
        .eq('task_id', task.id)
        .eq('user_id', userId);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    } else {
      const actor = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await (supabase as any)
        .from('project_task_assignees')
        .insert({ task_id: task.id, user_id: userId, assigned_by: actor });
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    }
    fetchData();
  };

  const clearAssignees = async (task: TaskWithAssignee) => {
    if (!canEditPhase(selectedPhase)) return;
    const { error } = await (supabase as any)
      .from('project_task_assignees')
      .delete()
      .eq('task_id', task.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    fetchData();
  };

  const openEdit = (task: TaskWithAssignee) => {
    setEditTask(task);
    setEditForm({
      name: task.name,
      weight: Number(task.weight) || 1,
      start_date: task.start_date || '',
      end_date: task.end_date || '',
    });
  };

  const saveEdit = async () => {
    if (!editTask) return;
    const { error } = await supabase.from('project_tasks').update({
      name: editForm.name.trim(),
      weight: editForm.weight,
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null,
    }).eq('id', editTask.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setEditTask(null);
    fetchData();
    onTasksChange();
  };

  const profileLabel = (id?: string | null) => {
    if (!id) return null;
    const p = profiles.find(x => x.user_id === id);
    return p?.full_name || p?.email || 'Usuario';
  };

  // ============================================================
  // PHASE GATE LOGIC
  // ============================================================
  const verificarPhaseGate = (faseNombre: string): { ok: boolean; pendingItems: PhaseGateItem[]; total: number } => {
    const phaseChecklist = checklistItems.filter(item => item.fase === faseNombre);
    const pendingItems = phaseChecklist.filter(item => !item.completado);
    return {
      ok: phaseChecklist.length > 0 && pendingItems.length === 0,
      pendingItems,
      total: phaseChecklist.length,
    };
  };

  const abrirModalChecklist = (faseNombre: string) => {
    setPhaseGateTargetPhase(faseNombre);
    setPhaseGateModalOpen(true);
  };

  const cerrarFase = async (faseNombre: string) => {
    const targetPhaseObj = phases.find(p => p.name === faseNombre);
    if (!targetPhaseObj) return;

    // 1. Verify tasks in the phase are 100%
    const phaseTasksList = tasks.filter(t => t.phase_id === targetPhaseObj.id);
    const pendingTasks = phaseTasksList.filter(t => (t.progress_percent ?? 0) < 100);

    if (pendingTasks.length > 0) {
      toast({
        title: '❌ Tareas pendientes',
        description: `Hay ${pendingTasks.length} tarea(s) sin completar al 100% en la fase "${faseNombre}".`,
        variant: 'destructive',
      });
      return;
    }

    // 2. Verify Phase Gate checklist
    const { ok: isGateOk } = verificarPhaseGate(faseNombre);
    if (!isGateOk) {
      abrirModalChecklist(faseNombre);
      return;
    }

    // 3. Mark current phase as completed and unlock next phase
    try {
      const nowIso = new Date().toISOString();
      const currentIdx = targetPhaseObj.order_index;
      const nextPhaseObj = phases.find(p => p.order_index === currentIdx + 1);

      // Update current phase
      const { error: eCurrent } = await supabase
        .from('project_phases')
        .update({ status: 'completada', actual_end: nowIso })
        .eq('id', targetPhaseObj.id);

      if (eCurrent) throw eCurrent;

      // Auto-complete the milestone tied to this phase, if any
      const relatedMilestone = milestones.find(m => m.fase_asociada === faseNombre && !m.completado);
      if (relatedMilestone) {
        await supabase
          .from('hitos')
          .update({ completado: true, fecha_real: nowIso.split('T')[0] })
          .eq('id', relatedMilestone.id);
      }

      // Update next phase & project active phase
      if (nextPhaseObj) {
        const { error: eNext } = await supabase
          .from('project_phases')
          .update({ status: 'activa', actual_start: nowIso })
          .eq('id', nextPhaseObj.id);

        if (eNext) throw eNext;

        const { error: eProject } = await supabase
          .from('projects')
          .update({ phase: nextPhaseObj.name })
          .eq('id', projectId);

        if (eProject) throw eProject;

        toast({
          title: `✅ Fase "${faseNombre}" completada`,
          description: `La fase "${nextPhaseObj.name}" ha sido desbloqueada y activada.`,
        });
      } else {
        // Last phase completed
        toast({
          title: `🎉 Proyecto completado`,
          description: `Todas las fases han sido completadas con éxito.`,
        });
      }

      setPhaseGateModalOpen(false);
      await fetchData();
      onTasksChange();
    } catch (err: any) {
      toast({ title: 'Error al cerrar fase', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Fases del proyecto: {projectName}</span>
            <div className="ml-auto flex items-center gap-2">
              {criticalTaskCount > 0 && (
                <Badge variant="outline" className="border-red-300 bg-red-500/10 text-red-700 dark:text-red-300 gap-1">
                  <Zap className="h-3 w-3" /> Ruta crítica: {criticalTaskCount} tarea(s)
                </Badge>
              )}
              {projectProgress !== null && (
                <Badge variant="secondary">
                  Avance global: {projectProgress.toFixed(1)}%
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto py-3 px-1">
          {phases.map((p, idx) => {
            const meta = STATUS_META[p.status];
            const Icon = meta.icon;
            const isSel = p.id === selectedPhaseId;
            const pct = calcPhaseProgress(p.id);

            // Phase Gate Status
            const phaseChecklist = checklistItems.filter(i => i.fase === p.name);
            const chkCompleted = phaseChecklist.filter(i => i.completado).length;
            const isGateComplete = phaseChecklist.length > 0 && chkCompleted === phaseChecklist.length;

            return (
              <div key={p.id} className="flex items-center">
                <button
                  onClick={() => setSelectedPhaseId(p.id)}
                  className={`group flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition min-w-[170px] ${meta.cls} ${
                    isSel ? 'ring-2 ring-primary/60 shadow-sm' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{idx + 1}. {p.name}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-wide opacity-70">{meta.label}</div>
                  
                  {/* Task Progress */}
                  <div className="w-full">
                    <Progress value={pct ?? 0} className="h-1" />
                    <div className="text-[10px] mt-0.5 opacity-70">
                      {pct !== null ? `${pct.toFixed(0)}% avance` : 'sin tareas'}
                    </div>
                  </div>

                  {/* Phase Gate Badge */}
                  <div className="w-full border-t pt-1 mt-0.5">
                    {isGateComplete ? (
                      <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        📋 Checklist: ✅ OK (5/5)
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                        📋 Checklist: ⚠️ {chkCompleted}/5
                      </span>
                    )}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <span>{selectedPhase.name}</span>
                    <Badge variant={selectedPhase.status === 'completada' ? 'secondary' : 'default'}>
                      {selectedPhase.status}
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedPhase.status === 'completada'
                      ? `Completada${selectedPhase.actual_end ? ' el ' + new Date(selectedPhase.actual_end).toLocaleDateString() : ''} — solo lectura`
                      : 'Fase activa — requiere completar checklist para avanzar'}
                  </p>
                </div>

                {/* Phase Gate, Risks, Milestones, Dependencies & Advance Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRisksDialogOpen(true)}
                    className="gap-1.5 text-xs border-red-300 bg-red-500/10 text-red-900 dark:text-red-300 hover:bg-red-500/20"
                  >
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                    <span>Riesgos</span>
                    {activeRisksCount > 0 && (
                      <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 h-4">
                        {activeRisksCount}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMilestonesDialogOpen(true)}
                    className="gap-1.5 text-xs border-blue-300 bg-blue-500/10 text-blue-900 dark:text-blue-300 hover:bg-blue-500/20"
                  >
                    <Flag className="h-4 w-4 text-blue-600" />
                    <span>Hitos</span>
                    {pendingMilestonesCount > 0 && (
                      <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 h-4">
                        {pendingMilestonesCount}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDependenciesDialogOpen(true)}
                    className="gap-1.5 text-xs border-purple-300 bg-purple-500/10 text-purple-900 dark:text-purple-300 hover:bg-purple-500/20"
                  >
                    <GitBranch className="h-4 w-4 text-purple-600" />
                    <span>Dependencias</span>
                    {dependencies.length > 0 && (
                      <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0 h-4">
                        {dependencies.length}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setScheduleDialogOpen(true)}
                    className="gap-1.5 text-xs border-indigo-300 bg-indigo-500/10 text-indigo-900 dark:text-indigo-300 hover:bg-indigo-500/20"
                  >
                    <CalendarRange className="h-4 w-4 text-indigo-600" />
                    <span>Cronograma</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirModalChecklist(selectedPhase.name)}
                    className="gap-1.5 text-xs border-amber-300 bg-amber-500/10 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20"
                  >
                    <ClipboardCheck className="h-4 w-4 text-amber-600" />
                    <span>Ver Checklist Phase Gate</span>
                  </Button>

                  {canEditPhase(selectedPhase) && (
                    <Button
                      size="sm"
                      onClick={() => cerrarFase(selectedPhase.name)}
                      className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Cerrar Fase</span>
                    </Button>
                  )}
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
                      <TableHead className="w-[160px]">Responsable</TableHead>
                      <TableHead className="w-[100px]">Inicio</TableHead>
                      <TableHead className="w-[100px]">Fin</TableHead>
                      <TableHead className="w-[70px] text-center">Peso</TableHead>
                      <TableHead className="w-[120px]">Avance</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-4">Cargando...</TableCell></TableRow>
                    ) : selectedPhaseTasks.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">Sin tareas en esta fase.</TableCell></TableRow>
                    ) : selectedPhaseTasks.map(task => {
                      const assigneeIds = assigneesByTask[task.id] || [];
                      const assigneeNames = assigneeIds.map(id => profileLabel(id)).filter(Boolean) as string[];
                      const triggerLabel =
                        assigneeNames.length === 0 ? 'Asignar'
                        : assigneeNames.length === 1 ? assigneeNames[0]
                        : `${assigneeNames[0]} +${assigneeNames.length - 1}`;

                      // Task risks
                      const taskRisks = riesgosList.filter(r => r.tarea_afectada === task.id);

                      // Task dependencies
                      const dependsOn = dependencies.filter(d => d.activa && d.tarea_destino === task.id);
                      const blocksOthers = dependencies.filter(d => d.activa && d.tarea_origen === task.id);

                      // Critical path
                      const cpInfo = criticalPath.tasks[task.id];

                      return (
                      <TableRow key={task.id}>
                        <TableCell>
                          {task.progress_percent === 100
                            ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            : <Circle className="h-5 w-5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className={task.progress_percent === 100 ? 'line-through text-muted-foreground' : ''}>
                          <div className="flex items-center gap-2">
                            <span>{task.name}</span>

                            {/* Critical Path Indicator */}
                            {cpInfo?.isCritical && (
                              <Badge
                                variant="outline"
                                className="border-red-400 bg-red-500/20 text-red-800 dark:text-red-300 text-[10px] px-1.5 py-0 flex items-center gap-1"
                                title="Esta tarea es parte de la ruta crítica: cualquier atraso aquí atrasa la fecha fin del proyecto."
                              >
                                <Zap className="h-3 w-3" /> Crítica
                              </Badge>
                            )}
                            {cpInfo?.hasConflict && (
                              <Badge
                                variant="outline"
                                className="border-orange-400 bg-orange-500/20 text-orange-800 dark:text-orange-300 text-[10px] px-1.5 py-0"
                                title={`Las fechas asignadas no respetan sus dependencias: debería iniciar ${cpInfo.conflictDays} día(s) más tarde.`}
                              >
                                ⚠️ Conflicto de fechas
                              </Badge>
                            )}

                            {/* Task Risk Indicator */}
                            {taskRisks.length > 0 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="cursor-pointer border-amber-300 bg-amber-500/20 text-amber-900 dark:text-amber-300 text-[10px] px-1.5 py-0 flex items-center gap-1 hover:bg-amber-500/30"
                                  >
                                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                                    <span>⚠️ {taskRisks.map((_, i) => `R${i + 1}`).join(', ')}</span>
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-3" align="start">
                                  <div className="space-y-2">
                                    <div className="font-bold text-xs flex items-center justify-between border-b pb-1">
                                      <span>⚠️ Riesgo(s) Asociado(s)</span>
                                      <Badge variant="outline" className="text-[10px]">
                                        {taskRisks.length} riesgo(s)
                                      </Badge>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {taskRisks.map((r, i) => {
                                        const lvl = calcularNivelRiesgo(r.probabilidad, r.impacto);
                                        const nMeta = NIVEL_META[lvl];
                                        return (
                                          <div key={r.id} className="p-2 rounded border bg-muted/30 text-xs space-y-1">
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-primary">R{i + 1}: {r.descripcion}</span>
                                              <Badge className={`text-[9px] px-1 py-0 ${nMeta.badgeCls}`}>
                                                {nMeta.label}
                                              </Badge>
                                            </div>
                                            {r.plan_mitigacion && (
                                              <div className="text-[11px] text-muted-foreground italic">
                                                Mitigación: {r.plan_mitigacion}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setRisksDialogOpen(true)}
                                      className="w-full text-xs h-7"
                                    >
                                      Ver Matriz de Riesgos
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}

                            {/* Task Dependency Indicator */}
                            {(dependsOn.length > 0 || blocksOthers.length > 0) && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="cursor-pointer border-purple-300 bg-purple-500/20 text-purple-900 dark:text-purple-300 text-[10px] px-1.5 py-0 flex items-center gap-1 hover:bg-purple-500/30"
                                  >
                                    <GitBranch className="h-3 w-3 text-purple-600" />
                                    <span>{dependsOn.length + blocksOthers.length}</span>
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-3" align="start">
                                  <div className="space-y-2 text-xs">
                                    <div className="font-bold flex items-center justify-between border-b pb-1">
                                      <span>🔗 Dependencias</span>
                                    </div>
                                    {dependsOn.length > 0 && (
                                      <div>
                                        <div className="text-muted-foreground font-medium">Depende de:</div>
                                        {dependsOn.map(d => (
                                          <div key={d.id} className={tasksById[d.tarea_origen]?.progress_percent === 100 ? 'text-emerald-600' : 'text-red-600 font-medium'}>
                                            • {tasksById[d.tarea_origen]?.name || 'Tarea eliminada'}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {blocksOthers.length > 0 && (
                                      <div>
                                        <div className="text-muted-foreground font-medium">Bloquea a:</div>
                                        {blocksOthers.map(d => (
                                          <div key={d.id}>• {tasksById[d.tarea_destino]?.name || 'Tarea eliminada'}</div>
                                        ))}
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setDependenciesDialogOpen(true)}
                                      className="w-full text-xs h-7"
                                    >
                                      Ver Dependencias
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant={assigneeIds.length > 0 ? 'secondary' : 'outline'}
                                disabled={!canEditPhase(selectedPhase)}
                                className="h-7 px-2 text-xs gap-1.5 max-w-full"
                                title={assigneeNames.join(', ')}
                              >
                                {assigneeIds.length > 0 ? <UserIcon className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                                <span className="truncate">{triggerLabel}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-64" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar usuario..." />
                                <CommandList>
                                  <CommandEmpty>Sin resultados.</CommandEmpty>
                                  <CommandGroup>
                                    {assigneeIds.length > 0 && (
                                      <CommandItem onSelect={() => clearAssignees(task)} className="text-muted-foreground">
                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Quitar todos
                                      </CommandItem>
                                    )}
                                    {profiles.map(p => {
                                      const checked = assigneeIds.includes(p.user_id);
                                      return (
                                        <CommandItem
                                          key={p.user_id}
                                          value={`${p.full_name || ''} ${p.email || ''}`}
                                          onSelect={() => toggleAssignee(task, p.user_id)}
                                        >
                                          <UserIcon className="h-3.5 w-3.5 mr-2" />
                                          <span className="truncate">{p.full_name || p.email}</span>
                                          {checked && <Check className="h-3.5 w-3.5 ml-auto" />}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
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
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(task)} title="Editar tarea">
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)} title="Eliminar tarea">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
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

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Peso</Label>
                <Input type="number" min={1} value={editForm.weight} onChange={e => setEditForm(f => ({ ...f, weight: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Inicio</Label>
                <Input type="date" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fin</Label>
                <Input type="date" value={editForm.end_date} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setEditTask(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={!editForm.name.trim()}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phase Gate Modal */}
      <PhaseGateModal
        open={phaseGateModalOpen}
        onOpenChange={setPhaseGateModalOpen}
        projectId={projectId}
        projectName={projectName}
        fase={phaseGateTargetPhase}
        items={checklistItems}
        allTasksCompleted={
          (() => {
            const ph = phases.find(p => p.name === phaseGateTargetPhase);
            if (!ph) return false;
            const phTasks = tasks.filter(t => t.phase_id === ph.id);
            return phTasks.length > 0 && phTasks.every(t => (t.progress_percent ?? 0) === 100);
          })()
        }
        onItemUpdated={fetchData}
        onConfirmClosePhase={() => cerrarFase(phaseGateTargetPhase)}
      />

      {/* Project Risks Dialog */}
      <ProjectRisksDialog
        open={risksDialogOpen}
        onOpenChange={setRisksDialogOpen}
        projectId={projectId}
        projectName={projectName}
        tasks={tasks}
        onRisksChange={fetchData}
      />

      {/* Project Milestones Dialog */}
      <ProjectMilestonesDialog
        open={milestonesDialogOpen}
        onOpenChange={setMilestonesDialogOpen}
        projectId={projectId}
        projectName={projectName}
        phases={phases}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        onMilestonesChange={fetchData}
      />

      {/* Project Dependencies Dialog */}
      <ProjectDependenciesDialog
        open={dependenciesDialogOpen}
        onOpenChange={setDependenciesDialogOpen}
        projectId={projectId}
        projectName={projectName}
        tasks={tasks}
        onDependenciesChange={fetchData}
      />

      {/* Unified Schedule (Cronograma) Dialog */}
      <ProjectScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        projectId={projectId}
        projectName={projectName}
        tasks={tasks}
        dependencies={dependencies}
        risks={riesgosList}
        milestones={milestones}
        baselineCapturedAt={baselineCapturedAt}
        onDataChange={fetchData}
        onOpenRisks={() => setRisksDialogOpen(true)}
        onOpenMilestones={() => setMilestonesDialogOpen(true)}
        onOpenDependencies={() => setDependenciesDialogOpen(true)}
      />
    </Dialog>
  );
}
