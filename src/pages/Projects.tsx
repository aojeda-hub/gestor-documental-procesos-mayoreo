import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, ListChecks, ArrowUpDown, CalendarRange, Rocket, FileCheck2, Paperclip, AlertCircle } from 'lucide-react';
import { CertificaERPDialog } from '@/components/certifica-erp/CertificaERPDialog';
import type { Project, ProjectTask, ProjectPhase, SiloType, TaskDependency, ProyectoRiesgo, ProjectMilestone, ObjetivoEstrategico } from '@/types/database';
import { calculateProjectScheduleVariance, VARIANCE_STATUS_META } from '@/lib/baselineUtils';
import { ensureProjectMilestones } from '@/lib/milestoneDefaults';
import { SILO_LABELS, OBJETIVO_COLOR_CLASSES } from '@/types/database';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectObjectiveTimeline } from '@/components/projects/ProjectObjectiveTimeline';
import { ProjectPhasesPanel } from '@/components/projects/ProjectPhasesPanel';
import { ProjectKickoffDialog } from '@/components/projects/ProjectKickoffDialog';
import { ProjectDocumentsDialog } from '@/components/projects/ProjectDocumentsDialog';
import { ProjectSummaryDialog } from '@/components/projects/ProjectSummaryDialog';
import { ProjectScheduleDialog } from '@/components/projects/ProjectScheduleDialog';
import { ExportPDFDialog } from '@/components/ExportPDFDialog';
import { exportProjectsPDF } from '@/lib/pdfExport';

const PHASE_DESCRIPTIONS: Record<string, string> = {
  'Alineación': 'Se define el alcance, objetivos y requisitos del proyecto. Se alinean expectativas con los stakeholders, se asignan recursos y se aprueba el plan inicial.',
  'Diseño': 'Se crean los planos, arquitectura, flujos de trabajo y prototipos. Se definen especificaciones técnicas y funcionales antes de empezar a construir.',
  'Construcción': 'Se desarrollan los componentes, se escribe código, se ensamblan piezas o se generan los entregables concretos del proyecto.',
  'Implementación': 'Se despliega lo construido en el entorno real (producción). Se realizan pruebas finales, migraciones de datos y se pone en operación.',
  'Adopción': 'Los usuarios finales comienzan a usar el entregable. Se da capacitación, soporte inicial, se recoge feedback y se asegura el uso continuo.',
};

// Cuenta días hábiles (Lun-Vie) entre dos fechas, inclusivo.
function businessDaysBetween(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function Projects() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<(Project & { actual_progress: number | null; planned_progress: number | null; phases: ProjectPhase[]; scheduleVariance: ReturnType<typeof calculateProjectScheduleVariance> })[]>([]);
  const [objetivos, setObjetivos] = useState<ObjetivoEstrategico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSilo, setFilterSilo] = useState('all');
  const [search, setSearch] = useState('');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [tasksDialogOpen, setTasksDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [kickoffDialogOpen, setKickoffDialogOpen] = useState(false);
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [certificaErpOpen, setCertificaErpOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<(Project & { actual_progress: number | null; planned_progress: number | null; phases: ProjectPhase[]; scheduleVariance: ReturnType<typeof calculateProjectScheduleVariance> }) | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [projectDependencies, setProjectDependencies] = useState<TaskDependency[]>([]);
  const [projectRisks, setProjectRisks] = useState<ProyectoRiesgo[]>([]);
  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestone[]>([]);

  const canEdit = hasRole('admin') || hasRole('editor') || hasRole('responsable_metodos') || hasRole('viewer');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const { data: tasksData, error: tasksError } = await supabase
        .from('project_tasks')
        .select('id, project_id, weight, status, progress_percent, start_date, end_date, baseline_start_date, baseline_end_date');

      if (tasksError) throw tasksError;

      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .order('order_index');

      if (phasesError) throw phasesError;

      const projectsWithProgress = (projectsData || []).map(project => {
        const projectTasks = (tasksData || []).filter(t => t.project_id === project.id);
        const totalWeight = projectTasks.reduce((sum, t) => sum + Number(t.weight), 0);
        const weightedProgress = projectTasks.reduce((sum, t) => {
          const pct = t.status === 'Completada' ? 100 : Number((t as any).progress_percent ?? 0);
          return sum + Number(t.weight) * pct;
        }, 0);

        const actual_progress: number | null = totalWeight > 0 ? weightedProgress / totalWeight : null;

        let planned_progress: number | null = null;
        if (project.start_date && project.end_date) {
          const start = new Date(project.start_date);
          const end = new Date(project.end_date);
          const now = new Date();
          const totalBd = businessDaysBetween(start, end);
          if (totalBd > 0) {
            if (now >= end) planned_progress = 100;
            else if (now <= start) planned_progress = 0;
            else planned_progress = (businessDaysBetween(start, now) / totalBd) * 100;
          } else {
            planned_progress = 0;
          }
        }

        const phases = ((phasesData || []) as ProjectPhase[]).filter(p => p.project_id === project.id);
        const scheduleVariance = calculateProjectScheduleVariance(projectTasks as unknown as ProjectTask[]);

        return { ...project, actual_progress, planned_progress, phases, scheduleVariance };
      });

      setProjects(projectsWithProgress as any);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (id: string, projectDates?: { start_date?: string | null; end_date?: string | null }) => {
    const { data } = await supabase.from('project_tasks').select('*').eq('project_id', id).order('created_at');
    setProjectTasks((data || []) as ProjectTask[]);

    const { data: depsData } = await supabase.from('dependencias').select('*').eq('proyecto_id', id);
    setProjectDependencies((depsData || []) as TaskDependency[]);

    const { data: risksData } = await supabase.from('riesgos').select('*').eq('proyecto_id', id);
    setProjectRisks((risksData || []) as ProyectoRiesgo[]);

    const milestones = await ensureProjectMilestones(id, projectDates || {});
    setProjectMilestones(milestones);
  };

  const fetchObjetivos = async () => {
    const { data } = await supabase.from('objetivos_estrategicos').select('*').order('orden');
    setObjetivos((data || []) as ObjetivoEstrategico[]);
  };

  useEffect(() => { fetchProjects(); fetchObjetivos(); }, []);

  const objetivoById = new Map(objetivos.map(o => [o.id, o]));

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este proyecto?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Proyecto eliminado' });
    fetchProjects();
  };

  const filtered = projects.filter(p => {
    if (filterSilo !== 'all' && p.silo !== filterSilo) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Input 
            placeholder="Buscar proyectos..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="max-w-xs" 
          />
          <Select value={filterSilo} onValueChange={setFilterSilo}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos los silos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los silos</SelectItem>
              {Object.entries(SILO_LABELS).filter(([k]) => k !== 'sinsilo').map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <ExportPDFDialog
            title="Descargar Resumen de Proyectos"
            description="Selecciona el silo a incluir en el reporte PDF."
            onExport={async (silo) => {
              const list = silo === 'all' ? projects : projects.filter(p => p.silo === silo);
              await exportProjectsPDF(list, silo);
            }}
          />
          <Button variant="outline" onClick={() => setCertificaErpOpen(true)}>
            <FileCheck2 className="mr-2 h-4 w-4" /> CertificaERP
          </Button>
          <Button onClick={() => { setSelectedProject(null); setFormDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Proyecto
          </Button>
        </div>
      </div>

      <CertificaERPDialog open={certificaErpOpen} onOpenChange={setCertificaErpOpen} />

      <Tabs defaultValue="tabla" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tabla">Tabla</TabsTrigger>
          <TabsTrigger value="objetivo">Por Objetivo</TabsTrigger>
        </TabsList>

        <TabsContent value="objetivo" className="mt-0">
          <ProjectObjectiveTimeline projects={projects} objetivos={objetivos} />
        </TabsContent>

        <TabsContent value="tabla" className="mt-0">
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Proyecto</TableHead>
                <TableHead>Objetivo Estratégico</TableHead>
                <TableHead>Silo</TableHead>
                <TableHead>Fases</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead className="text-center">% Planificado</TableHead>
                <TableHead className="text-center">% Real</TableHead>
                <TableHead className="text-center">Desviación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No se encontraron proyectos.</TableCell></TableRow>
              ) : filtered.map(project => {
                const objetivo = project.objetivo_estrategico_id ? objetivoById.get(project.objetivo_estrategico_id) : undefined;
                const objetivoColors = objetivo ? OBJETIVO_COLOR_CLASSES[objetivo.color] : undefined;
                const planned = project.planned_progress as number | null;
                const actual = project.actual_progress as number | null;
                const hasBoth = planned !== null && actual !== null;
                const deviation = hasBoth ? (actual! - planned!) : null;

                let devClass = 'text-muted-foreground';
                if (deviation !== null) {
                  if (deviation >= 5) devClass = 'text-green-700';
                  else if (deviation >= 0) devClass = 'text-green-500';
                  else if (deviation >= -5) devClass = 'text-yellow-500';
                  else if (deviation >= -15) devClass = 'text-orange-500';
                  else devClass = 'text-red-600';
                }

                const ND = (
                  <span className="inline-flex items-center gap-1 text-muted-foreground" title="Faltan fechas o tareas">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> N/D
                  </span>
                );

                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <button 
                        onClick={() => { setSelectedProject(project); setSummaryDialogOpen(true); }}
                        className="hover:underline text-left font-semibold text-primary transition-all hover:text-primary/80 focus:outline-none"
                      >
                        {project.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      {objetivo ? (
                        <Badge variant="outline" className={`gap-1.5 ${objetivoColors?.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${objetivoColors?.dot}`} />
                          {objetivo.nombre}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{SILO_LABELS[project.silo]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-1 h-4">
                          {(project.phases || []).map(ph => {
                            const dot = ph.status === 'completada' ? 'bg-emerald-500'
                              : ph.status === 'activa' ? 'bg-blue-500 ring-2 ring-blue-300'
                              : 'bg-muted-foreground/30';
                            return (
                              <Tooltip key={ph.id}>
                                <TooltipTrigger asChild>
                                  <span className={`h-2.5 w-2.5 rounded-full ${dot} cursor-help`} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs font-semibold">{ph.order_index}. {ph.name}</p>
                                  <p className="text-[10px] capitalize text-muted-foreground">{ph.status}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{project.phase}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{project.start_date || '-'}</TableCell>
                    <TableCell className="text-sm">{project.end_date || '-'}</TableCell>
                    <TableCell className="text-center">{planned !== null ? `${planned.toFixed(1)}%` : ND}</TableCell>
                    <TableCell className="text-center">{actual !== null ? `${actual.toFixed(1)}%` : ND}</TableCell>
                    <TableCell className="text-center font-bold">
                      {project.scheduleVariance ? (
                        <span
                          className={VARIANCE_STATUS_META[project.scheduleVariance.status].cls}
                          title="Basado en la línea base del cronograma (días de diferencia entre fin planeado y fin proyectado)"
                        >
                          {VARIANCE_STATUS_META[project.scheduleVariance.status].icon}{' '}
                          {project.scheduleVariance.varianceDays > 0 ? '+' : ''}{project.scheduleVariance.varianceDays}d
                        </span>
                      ) : deviation !== null ? (
                        <span
                          className={devClass}
                          title="Estimado: % de avance vs. tiempo transcurrido. Guarda una línea base en Cronograma para una medición más precisa (en días)."
                        >
                          ~{deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                        </span>
                      ) : ND}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => { setSelectedProject(project); setKickoffDialogOpen(true); }}
                          title="Kickoff del Proyecto"
                        >
                          <Rocket className="h-4 w-4 text-orange-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedProject(project);
                            fetchProjectTasks(project.id, { start_date: project.start_date, end_date: project.end_date });
                            setScheduleDialogOpen(true);
                          }}
                          title="Cronograma (Gantt, ruta crítica, hitos y desvío)"
                        >
                          <CalendarRange className="h-4 w-4 text-purple-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedProject(project); setTasksDialogOpen(true); }}
                          title="Gestionar Tareas"
                        >
                          <ListChecks className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedProject(project); setDocsDialogOpen(true); }}
                          title="Documentos de soporte"
                        >
                          <Paperclip className="h-4 w-4 text-emerald-600" />
                        </Button>
                        {canEdit && (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => { setSelectedProject(project); setFormDialogOpen(true); }}
                              title="Editar Proyecto"
                            >
                              <Edit2 className="h-4 w-4 text-slate-600" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDelete(project.id)}
                              title="Eliminar Proyecto"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        open={formDialogOpen} 
        onOpenChange={setFormDialogOpen}
        project={selectedProject}
        onSave={fetchProjects}
      />

      {selectedProject && (
        <ProjectScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          tasks={projectTasks}
          dependencies={projectDependencies}
          risks={projectRisks}
          milestones={projectMilestones}
          baselineCapturedAt={selectedProject.baseline_captured_at}
          onDataChange={() => {
            fetchProjectTasks(selectedProject.id, { start_date: selectedProject.start_date, end_date: selectedProject.end_date });
            fetchProjects();
          }}
        />
      )}

      {selectedProject && (
        <ProjectKickoffDialog
          open={kickoffDialogOpen}
          onOpenChange={setKickoffDialogOpen}
          project={selectedProject}
          onSave={fetchProjects}
        />
      )}

      {selectedProject && (
        <ProjectPhasesPanel
          open={tasksDialogOpen}
          onOpenChange={setTasksDialogOpen}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          projectPhase={selectedProject.phase}
          projectStartDate={selectedProject.start_date}
          projectEndDate={selectedProject.end_date}
          baselineCapturedAt={selectedProject.baseline_captured_at}
          onTasksChange={fetchProjects}
        />
      )}

      {selectedProject && (
        <ProjectDocumentsDialog
          open={docsDialogOpen}
          onOpenChange={setDocsDialogOpen}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
        />
      )}

      <ProjectSummaryDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        project={selectedProject}
      />
    </div>
  );
}
