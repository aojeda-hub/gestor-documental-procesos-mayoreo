import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, Plus, Search, Filter, Grid, List, Edit2, Trash2, CheckCircle2, ShieldAlert, ExternalLink, Link2, ChevronRight,
} from 'lucide-react';
import type { ProyectoRiesgo, ProjectTask, ProbabilidadType, ImpactoType, RiesgoEstado } from '@/types/database';
import {
  calcularNivelRiesgo,
  PROBABILIDAD_OPTIONS,
  IMPACTO_OPTIONS,
  ESTADO_OPTIONS,
  NIVEL_META,
  ESTADO_META,
} from '@/lib/riskUtils';
import { ProjectRiskFormDialog } from './ProjectRiskFormDialog';

interface ProjectRisksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  tasks?: ProjectTask[];
  onRisksChange?: () => void;
}

export function ProjectRisksDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  tasks = [],
  onRisksChange,
}: ProjectRisksDialogProps) {
  const { toast } = useToast();
  const [riesgos, setRiesgos] = useState<ProyectoRiesgo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'matrix'>('table');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedRiskToEdit, setSelectedRiskToEdit] = useState<ProyectoRiesgo | null>(null);

  const fetchRiesgos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('riesgos')
        .select('*')
        .eq('proyecto_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRiesgos((data || []) as ProyectoRiesgo[]);
    } catch (err: any) {
      toast({ title: 'Error al cargar riesgos', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      fetchRiesgos();
    }
  }, [open, projectId]);

  const updateEstadoRiesgo = async (riesgoId: string, nuevoEstado: RiesgoEstado) => {
    try {
      const patch: any = { estado: nuevoEstado };
      if (nuevoEstado === 'Cerrado') {
        patch.fecha_cierre = new Date().toISOString().split('T')[0];
      } else {
        patch.fecha_cierre = null;
      }

      const { error } = await supabase
        .from('riesgos')
        .update(patch)
        .eq('id', riesgoId);

      if (error) throw error;
      toast({ title: `Riesgo marcado como ${nuevoEstado}` });
      fetchRiesgos();
      onRisksChange?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteRiesgo = async (riesgoId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este riesgo?')) return;
    try {
      const { error } = await supabase
        .from('riesgos')
        .delete()
        .eq('id', riesgoId);

      if (error) throw error;
      toast({ title: 'Riesgo eliminado' });
      fetchRiesgos();
      onRisksChange?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filteredRiesgos = useMemo(() => {
    return riesgos.filter(r => {
      if (filterEstado !== 'all' && r.estado !== filterEstado) return false;
      if (search && !r.descripcion.toLowerCase().includes(search.toLowerCase()) && !r.categoria.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [riesgos, filterEstado, search]);

  // Metrics
  const totalCount = riesgos.length;
  const activosCount = riesgos.filter(r => r.estado === 'Activo').length;
  const mitigadosCount = riesgos.filter(r => r.estado === 'Mitigado').length;
  const cerradosCount = riesgos.filter(r => r.estado === 'Cerrado').length;

  const taskMap = useMemo(() => {
    const map: Record<string, ProjectTask> = {};
    tasks.forEach(t => { map[t.id] = t; });
    return map;
  }, [tasks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <span>⚠️ REGISTRO DE RIESGOS - {projectName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Monitoreo, evaluación de impacto vs probabilidad y planes de mitigación.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-6 space-y-4">
          {/* Header Stats */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="bg-card">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold">{totalCount}</div>
                <div className="text-[11px] text-muted-foreground uppercase font-semibold">Total Riesgos</div>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-200">
              <CardContent className="p-3 text-center text-red-700 dark:text-red-300">
                <div className="text-xl font-bold">{activosCount}</div>
                <div className="text-[11px] uppercase font-semibold">Activos</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-200">
              <CardContent className="p-3 text-center text-blue-700 dark:text-blue-300">
                <div className="text-xl font-bold">{mitigadosCount}</div>
                <div className="text-[11px] uppercase font-semibold">Mitigados</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-500/10 border-slate-200">
              <CardContent className="p-3 text-center text-slate-700 dark:text-slate-300">
                <div className="text-xl font-bold">{cerradosCount}</div>
                <div className="text-[11px] uppercase font-semibold">Cerrados</div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setSelectedRiskToEdit(null);
                  setFormDialogOpen(true);
                }}
                className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Identificar Riesgo</span>
              </Button>

              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar riesgo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs w-[180px]"
                />
              </div>

              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ESTADO_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border p-1 bg-muted/40">
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                onClick={() => setViewMode('table')}
                className="h-7 text-xs px-2.5 gap-1"
              >
                <List className="h-3.5 w-3.5" />
                <span>Tabla</span>
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
                onClick={() => setViewMode('matrix')}
                className="h-7 text-xs px-2.5 gap-1"
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Matriz de Riesgos</span>
              </Button>
            </div>
          </div>

          {/* View Mode: Table */}
          {viewMode === 'table' && (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[50px]">Código</TableHead>
                    <TableHead>Descripción del Riesgo</TableHead>
                    <TableHead className="w-[80px] text-center">Prob.</TableHead>
                    <TableHead className="w-[80px] text-center">Impacto</TableHead>
                    <TableHead className="w-[100px] text-center">Nivel</TableHead>
                    <TableHead className="w-[120px]">Afectación</TableHead>
                    <TableHead className="w-[200px]">Plan de Mitigación</TableHead>
                    <TableHead className="w-[90px] text-center">Estado</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-6">Cargando riesgos...</TableCell></TableRow>
                  ) : filteredRiesgos.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">No hay riesgos registrados que coincidan con los filtros.</TableCell></TableRow>
                  ) : filteredRiesgos.map((r, idx) => {
                    const nivel = calcularNivelRiesgo(r.probabilidad, r.impacto);
                    const nMeta = NIVEL_META[nivel];
                    const eMeta = ESTADO_META[r.estado || 'Activo'];
                    const linkedTask = r.tarea_afectada ? taskMap[r.tarea_afectada] : null;

                    return (
                      <TableRow key={r.id} className="text-xs">
                        <TableCell className="font-bold text-muted-foreground">
                          R{idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>{r.descripcion}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] py-0 px-1">{r.categoria}</Badge>
                            {r.responsable_mitigacion && <span>Resp: {r.responsable_mitigacion}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{r.probabilidad}</TableCell>
                        <TableCell className="text-center">{r.impacto}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-[10px] px-2 ${nMeta.badgeCls}`}>
                            {nMeta.icon} {nMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-[11px]">{r.fase_afectada || 'General'}</div>
                          {linkedTask && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 truncate max-w-[120px]" title={linkedTask.name}>
                              <Link2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{linkedTask.name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] max-w-[200px] truncate" title={r.plan_mitigacion || ''}>
                          {r.plan_mitigacion || <span className="text-muted-foreground italic">Sin plan cargado</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Select
                            value={r.estado}
                            onValueChange={(v: RiesgoEstado) => updateEstadoRiesgo(r.id, v)}
                          >
                            <SelectTrigger className="h-6 text-[10px] px-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ESTADO_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRiskToEdit(r);
                                setFormDialogOpen(true);
                              }}
                              title="Editar riesgo"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteRiesgo(r.id)}
                              title="Eliminar riesgo"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* View Mode: Matrix (Probabilidad vs Impacto) */}
          {viewMode === 'matrix' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <span>📊 MATRIZ DE RIESGOS (Probabilidad vs Impacto)</span>
              </div>

              <div className="border rounded-lg overflow-x-auto bg-card p-4">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 border bg-muted/60 text-left font-semibold w-[120px]">
                        Probabilidad ↓ / Impacto →
                      </th>
                      {IMPACTO_OPTIONS.map(imp => (
                        <th key={imp} className="p-2 border bg-muted/60 text-center font-bold">
                          {imp}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PROBABILIDAD_OPTIONS.map(prob => (
                      <tr key={prob}>
                        <td className="p-2 border bg-muted/40 font-bold text-center">
                          {prob}
                        </td>
                        {IMPACTO_OPTIONS.map(imp => {
                          const level = calcularNivelRiesgo(prob, imp);
                          const nMeta = NIVEL_META[level];
                          const cellRiesgos = riesgos.filter(r => r.probabilidad === prob && r.impacto === imp);

                          let cellBg = 'bg-background';
                          if (level === 'CRITICO') cellBg = 'bg-red-500/10 hover:bg-red-500/20';
                          else if (level === 'ALTO') cellBg = 'bg-orange-500/10 hover:bg-orange-500/20';
                          else if (level === 'MEDIO') cellBg = 'bg-amber-500/10 hover:bg-amber-500/20';
                          else cellBg = 'bg-emerald-500/10 hover:bg-emerald-500/20';

                          return (
                            <td key={imp} className={`p-2 border vertical-top h-[100px] w-[22%] transition-all ${cellBg}`}>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold mb-1">
                                <span>{nMeta.icon} {level}</span>
                                <span>({cellRiesgos.length})</span>
                              </div>

                              <div className="space-y-1 overflow-y-auto max-h-[80px]">
                                {cellRiesgos.map((r, idx) => (
                                  <div
                                    key={r.id}
                                    onClick={() => {
                                      setSelectedRiskToEdit(r);
                                      setFormDialogOpen(true);
                                    }}
                                    className="p-1.5 rounded border bg-background/90 hover:bg-background cursor-pointer text-[11px] shadow-sm flex items-start justify-between gap-1 group"
                                    title={`${r.descripcion}\nEstado: ${r.estado}\nPlan: ${r.plan_mitigacion || 'N/A'}`}
                                  >
                                    <div className="truncate">
                                      <span className="font-bold text-primary mr-1">R{idx + 1}</span>
                                      <span className="truncate">{r.descripcion}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] py-0 px-1 shrink-0">
                                      {r.estado}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t bg-background flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>

      <ProjectRiskFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        projectId={projectId}
        projectName={projectName}
        riskToEdit={selectedRiskToEdit}
        tasks={tasks}
        onSave={() => {
          fetchRiesgos();
          onRisksChange?.();
        }}
      />
    </Dialog>
  );
}
