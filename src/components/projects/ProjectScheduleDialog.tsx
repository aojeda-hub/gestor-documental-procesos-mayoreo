import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Camera, RefreshCcw, CalendarRange, ShieldAlert, Flag, GitBranch, Zap } from 'lucide-react';
import type { ProjectTask, TaskDependency, ProyectoRiesgo, ProjectMilestone } from '@/types/database';
import { calculateCriticalPath } from '@/lib/criticalPathUtils';
import { calculateProjectScheduleVariance, VARIANCE_STATUS_META } from '@/lib/baselineUtils';
import { ModernGantt } from './ModernGantt';

interface ProjectScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  tasks: ProjectTask[];
  dependencies?: TaskDependency[];
  risks?: ProyectoRiesgo[];
  milestones?: ProjectMilestone[];
  baselineCapturedAt?: string | null;
  onDataChange?: () => void;
  onOpenRisks?: () => void;
  onOpenMilestones?: () => void;
  onOpenDependencies?: () => void;
}

export function ProjectScheduleDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  tasks,
  dependencies = [],
  risks = [],
  milestones = [],
  baselineCapturedAt,
  onDataChange,
  onOpenRisks,
  onOpenMilestones,
  onOpenDependencies,
}: ProjectScheduleDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const criticalPath = useMemo(() => calculateCriticalPath(tasks, dependencies), [tasks, dependencies]);
  const criticalTaskIds = useMemo(
    () => new Set(Object.values(criticalPath.tasks).filter(t => t.isCritical).map(t => t.taskId)),
    [criticalPath]
  );
  const summary = useMemo(() => calculateProjectScheduleVariance(tasks), [tasks]);

  const schedulableTasks = tasks.filter(t => t.start_date && t.end_date);
  const activeRisksCount = risks.filter(r => r.estado === 'Activo').length;
  const pendingMilestonesCount = milestones.filter(m => !m.completado).length;

  const saveBaseline = async () => {
    const confirmMsg = baselineCapturedAt
      ? '¿Reemplazar la línea base actual con las fechas de hoy? Perderás la comparación de desvío que tienes hasta ahora.'
      : '¿Guardar la línea base del cronograma? Esto congela las fechas planeadas actuales de todas las tareas para poder medir desvíos a futuro.';
    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    try {
      await Promise.all(
        schedulableTasks.map(t =>
          supabase
            .from('project_tasks')
            .update({ baseline_start_date: t.start_date, baseline_end_date: t.end_date })
            .eq('id', t.id)
        )
      );
      const { error } = await supabase
        .from('projects')
        .update({ baseline_captured_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw error;

      toast({ title: 'Línea base guardada', description: `${schedulableTasks.length} tarea(s) congeladas como referencia.` });
      onDataChange?.();
    } catch (err: any) {
      toast({ title: 'Error al guardar línea base', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1300px] max-h-[92vh] flex flex-col">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarRange className="h-5 w-5 text-indigo-600" />
            <span>📅 Cronograma del Proyecto: {projectName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gantt, ruta crítica, hitos y desvío de cronograma en un solo lugar.
            {baselineCapturedAt && <span> · Línea base capturada el {new Date(baselineCapturedAt).toLocaleDateString()}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Summary Bar */}
          {summary ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Fin Planeado (base)</div>
                  <div className="text-sm font-bold mt-1">{new Date(summary.baselineEnd).toLocaleDateString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Fin Proyectado</div>
                  <div className="text-sm font-bold mt-1">{new Date(summary.currentEnd).toLocaleDateString()}</div>
                </CardContent>
              </Card>
              <Card className={VARIANCE_STATUS_META[summary.status].badgeCls}>
                <CardContent className="p-3 text-center">
                  <div className="text-xs opacity-80">Variación</div>
                  <div className="text-sm font-bold mt-1">
                    {summary.varianceDays > 0 ? '+' : ''}{summary.varianceDays} día(s)
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Estado</div>
                  <div className={`text-sm font-bold mt-1 ${VARIANCE_STATUS_META[summary.status].cls}`}>
                    {VARIANCE_STATUS_META[summary.status].icon} {VARIANCE_STATUS_META[summary.status].label}
                  </div>
                </CardContent>
              </Card>
              <Card className={criticalTaskIds.size > 0 ? 'border-red-300 bg-red-500/10' : ''}>
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3" /> Ruta Crítica
                  </div>
                  <div className="text-sm font-bold mt-1">{criticalTaskIds.size} tarea(s)</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashed bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Todavía no hay línea base. Guárdala para poder medir a futuro qué tanto se desvía el cronograma real de lo planeado.
              </div>
              <Button size="sm" onClick={saveBaseline} disabled={saving || schedulableTasks.length === 0} className="gap-1.5 shrink-0">
                <Camera className="h-3.5 w-3.5" />
                {saving ? 'Guardando...' : 'Guardar Línea Base'}
              </Button>
            </div>
          )}

          {/* Quick access to Risks / Milestones / Dependencies management */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenRisks && (
              <Button size="sm" variant="outline" onClick={onOpenRisks} className="gap-1.5 text-xs border-red-300 bg-red-500/10 text-red-900 dark:text-red-300">
                <ShieldAlert className="h-3.5 w-3.5 text-red-600" /> Riesgos
                {activeRisksCount > 0 && <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 h-4">{activeRisksCount}</Badge>}
              </Button>
            )}
            {onOpenMilestones && (
              <Button size="sm" variant="outline" onClick={onOpenMilestones} className="gap-1.5 text-xs border-blue-300 bg-blue-500/10 text-blue-900 dark:text-blue-300">
                <Flag className="h-3.5 w-3.5 text-blue-600" /> Hitos
                {pendingMilestonesCount > 0 && <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 h-4">{pendingMilestonesCount}</Badge>}
              </Button>
            )}
            {onOpenDependencies && (
              <Button size="sm" variant="outline" onClick={onOpenDependencies} className="gap-1.5 text-xs border-purple-300 bg-purple-500/10 text-purple-900 dark:text-purple-300">
                <GitBranch className="h-3.5 w-3.5 text-purple-600" /> Dependencias
                {dependencies.length > 0 && <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0 h-4">{dependencies.length}</Badge>}
              </Button>
            )}
            {summary && (
              <Button size="sm" variant="outline" onClick={saveBaseline} disabled={saving} className="gap-1.5 text-xs ml-auto">
                <RefreshCcw className="h-3.5 w-3.5" />
                {saving ? 'Guardando...' : 'Actualizar Línea Base'}
              </Button>
            )}
          </div>

          {/* Gantt */}
          {schedulableTasks.length > 0 ? (
            <ModernGantt tasks={tasks} risks={risks} criticalTaskIds={criticalTaskIds} milestones={milestones} />
          ) : (
            <div className="text-center py-20 text-muted-foreground border rounded-lg bg-slate-50">
              No hay tareas con fechas definidas para mostrar en el Gantt.
            </div>
          )}
        </div>

        <div className="pt-3 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
