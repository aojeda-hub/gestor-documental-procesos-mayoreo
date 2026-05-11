import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, ListChecks, ArrowUpDown, CalendarRange, Rocket, FileCheck2, Paperclip } from 'lucide-react';
import { CertificaERPDialog } from '@/components/certifica-erp/CertificaERPDialog';
import type { Project, ProjectTask, SiloType } from '@/types/database';
import { SILO_LABELS } from '@/types/database';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectTasksDialog } from '@/components/projects/ProjectTasksDialog';
import { ProjectKickoffDialog } from '@/components/projects/ProjectKickoffDialog';
import { ProjectDocumentsDialog } from '@/components/projects/ProjectDocumentsDialog';
import { ModernGantt } from '@/components/projects/ModernGantt';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PHASE_DESCRIPTIONS: Record<string, string> = {
  'Alineación': 'Se define el alcance, objetivos y requisitos del proyecto. Se alinean expectativas con los stakeholders, se asignan recursos y se aprueba el plan inicial.',
  'Diseño': 'Se crean los planos, arquitectura, flujos de trabajo y prototipos. Se definen especificaciones técnicas y funcionales antes de empezar a construir.',
  'Construcción': 'Se desarrollan los componentes, se escribe código, se ensamblan piezas o se generan los entregables concretos del proyecto.',
  'Implementación': 'Se despliega lo construido en el entorno real (producción). Se realizan pruebas finales, migraciones de datos y se pone en operación.',
  'Adopción': 'Los usuarios finales comienzan a usar el entregable. Se da capacitación, soporte inicial, se recoge feedback y se asegura el uso continuo.',
};

export default function Projects() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<(Project & { actual_progress: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSilo, setFilterSilo] = useState('all');
  const [search, setSearch] = useState('');
  
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [tasksDialogOpen, setTasksDialogOpen] = useState(false);
  const [ganttDialogOpen, setGanttDialogOpen] = useState(false);
  const [kickoffDialogOpen, setKickoffDialogOpen] = useState(false);
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [certificaErpOpen, setCertificaErpOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);

  const canEdit = hasRole('admin') || hasRole('editor');

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
        .select('project_id, weight, status');

      if (tasksError) throw tasksError;

      // Calculate progress for each project
      const projectsWithProgress = (projectsData || []).map(project => {
        const projectTasks = (tasksData || []).filter(t => t.project_id === project.id);
        const totalWeight = projectTasks.reduce((sum, t) => sum + Number(t.weight), 0);
        const completedWeight = projectTasks
          .filter(t => t.status === 'Completada')
          .reduce((sum, t) => sum + Number(t.weight), 0);
        
        const actual_progress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
        
        // Calculate planned progress automatically
        let planned_progress = 0;
        if (project.start_date && project.end_date) {
          const start = new Date(project.start_date).getTime();
          const end = new Date(project.end_date).getTime();
          const now = new Date().getTime();
          
          if (now >= end) {
            planned_progress = 100;
          } else if (now > start) {
            const totalDuration = end - start;
            const elapsed = now - start;
            planned_progress = (elapsed / totalDuration) * 100;
          }
        }
        
        return { ...project, actual_progress, planned_progress };
      });

      setProjects(projectsWithProgress as any);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (id: string) => {
    const { data } = await supabase.from('project_tasks').select('*').eq('project_id', id).order('created_at');
    setProjectTasks((data || []) as ProjectTask[]);
  };

  const handleDateChange = async (task: ProjectTask, start: Date, end: Date) => {
    const { error } = await supabase
      .from('project_tasks')
      .update({ 
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd')
      })
      .eq('id', task.id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchProjectTasks(task.project_id);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

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
              {Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCertificaErpOpen(true)}>
            <FileCheck2 className="mr-2 h-4 w-4" /> CertificaERP
          </Button>
          {canEdit && (
            <Button onClick={() => { setSelectedProject(null); setFormDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Proyecto
            </Button>
          )}
        </div>
      </div>

      <CertificaERPDialog open={certificaErpOpen} onOpenChange={setCertificaErpOpen} />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Proyecto</TableHead>
                <TableHead>Silo</TableHead>
                <TableHead>Fase Actual</TableHead>
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
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron proyectos.</TableCell></TableRow>
              ) : filtered.map(project => {
                const deviation = project.actual_progress - project.planned_progress;
                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell><Badge variant="outline">{SILO_LABELS[project.silo]}</Badge></TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="cursor-help">{project.phase}</Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">{PHASE_DESCRIPTIONS[project.phase] || 'Sin descripción'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-sm">{project.start_date || '-'}</TableCell>
                    <TableCell className="text-sm">{project.end_date || '-'}</TableCell>
                    <TableCell className="text-center">{project.planned_progress.toFixed(1)}%</TableCell>
                    <TableCell className="text-center">{project.actual_progress.toFixed(1)}%</TableCell>
                    <TableCell className={`text-center font-bold ${deviation < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
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
                            fetchProjectTasks(project.id);
                            setGanttDialogOpen(true); 
                          }}
                          title="Vista Gantt"
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

      <ProjectFormDialog 
        open={formDialogOpen} 
        onOpenChange={setFormDialogOpen}
        project={selectedProject}
        onSave={fetchProjects}
      />

      {selectedProject && (
        <Dialog open={ganttDialogOpen} onOpenChange={setGanttDialogOpen}>
          <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gantt del Proyecto: {selectedProject.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {projectTasks.length > 0 ? (
                <ModernGantt tasks={projectTasks} />
              ) : (
                <div className="text-center py-20 text-muted-foreground border rounded-lg bg-slate-50">
                  No hay tareas con fechas definidas para mostrar en el Gantt.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
        <ProjectTasksDialog
          open={tasksDialogOpen}
          onOpenChange={setTasksDialogOpen}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          projectPhase={selectedProject.phase}
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
    </div>
  );
}
