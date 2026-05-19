import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Percent, 
  Target, 
  FileText, 
  User, 
  AlertCircle 
} from 'lucide-react';
import type { Project, ProjectPhase } from '@/types/database';
import { SILO_LABELS } from '@/types/database';

interface ProjectSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: (Project & { 
    actual_progress: number | null; 
    planned_progress: number | null; 
    phases: ProjectPhase[] 
  }) | null;
}

export function ProjectSummaryDialog({ open, onOpenChange, project }: ProjectSummaryDialogProps) {
  if (!project) return null;

  const planned = project.planned_progress;
  const actual = project.actual_progress;
  const hasBoth = planned !== null && actual !== null;
  const deviation = hasBoth ? (actual! - planned!) : null;

  let devClass = 'text-muted-foreground';
  let DevIcon = AlertCircle;
  if (deviation !== null) {
    if (deviation >= 0) {
      devClass = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
      DevIcon = TrendingUp;
    } else if (deviation >= -15) {
      devClass = 'text-amber-600 bg-amber-50 dark:bg-amber-950/20';
      DevIcon = TrendingDown;
    } else {
      devClass = 'text-rose-600 bg-rose-50 dark:bg-rose-950/20';
      DevIcon = TrendingDown;
    }
  }

  const ND = (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-sm font-normal">
      <AlertCircle className="h-4 w-4 text-amber-500" /> N/D
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-lg">
        <DialogHeader className="space-y-2 border-b pb-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <Badge variant="outline" className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-slate-50 dark:bg-slate-900">
              Silo: {SILO_LABELS[project.silo]}
            </Badge>
            {project.priority && (
              <Badge 
                variant={project.priority === 'Alta' ? 'destructive' : project.priority === 'Media' ? 'secondary' : 'outline'}
                className="px-2 py-0.5 text-[10px] font-bold"
              >
                Prioridad: {project.priority}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {project.name}
          </DialogTitle>
          {project.responsible && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <User className="h-4 w-4 text-slate-400" />
              <span>Responsable: <strong className="font-semibold text-slate-700 dark:text-slate-350">{project.responsible}</strong></span>
            </div>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Main content: Description & Objectives */}
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Descripción del Proyecto
              </h4>
              <p className="text-slate-650 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                {project.description || 'Sin descripción detallada.'}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Target className="h-4 w-4" /> Objetivos
              </h4>
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase">Objetivo General</h5>
                  <p className="text-slate-700 dark:text-slate-200 text-sm font-medium mt-1">
                    {project.goal || 'Sin objetivo general definido.'}
                  </p>
                </div>

                {project.specific_goals && project.specific_goals.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Objetivos Específicos</h5>
                    <ul className="space-y-2 text-sm text-slate-650 dark:text-slate-300">
                      {project.specific_goals.map((goal, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className="leading-snug mt-0.5">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar / Quick Stats */}
          <div className="space-y-5">
            {/* Phase Status */}
            <Card className="overflow-hidden border border-slate-150 shadow-sm dark:border-slate-800">
              <CardContent className="p-4 space-y-3.5">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fase Actual</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {project.phase}
                    </span>
                  </div>
                </div>

                {/* Progress bars for phases */}
                <div className="flex gap-1.5 pt-1">
                  {project.phases && project.phases.map((ph) => {
                    const statusColor = ph.status === 'completada' ? 'bg-emerald-500'
                      : ph.status === 'activa' ? 'bg-blue-500'
                      : 'bg-slate-200 dark:bg-slate-800';
                    return (
                      <div 
                        key={ph.id} 
                        className={`h-2 flex-1 rounded-full ${statusColor}`}
                        title={`${ph.order_index}. ${ph.name} (${ph.status})`}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Dates Card */}
            <Card className="border border-slate-150 shadow-sm dark:border-slate-800">
              <CardContent className="p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Cronograma</span>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span>Inicio</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {project.start_date || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span>Cierre</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {project.end_date || '-'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics */}
            <Card className="border border-slate-150 shadow-sm dark:border-slate-800">
              <CardContent className="p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Indicadores de Avance</span>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Planificado</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {planned !== null ? `${planned.toFixed(1)}%` : ND}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Real</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {actual !== null ? `${actual.toFixed(1)}%` : ND}
                    </span>
                  </div>

                  <div className="border-t pt-2 mt-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-650 dark:text-slate-350">Desviación</span>
                    {deviation !== null ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold ${devClass}`}>
                        <DevIcon className="h-4 w-4" />
                        {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                      </span>
                    ) : ND}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
