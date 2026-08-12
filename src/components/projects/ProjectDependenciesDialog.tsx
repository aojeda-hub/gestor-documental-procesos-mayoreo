import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { GitBranch, Plus, Trash2, X, ArrowRight } from 'lucide-react';
import type { ProjectTask, TaskDependency, TipoDependencia } from '@/types/database';
import { TIPO_DEPENDENCIA_OPTIONS, TIPO_DEPENDENCIA_LABELS, wouldCreateCycle } from '@/lib/dependencyUtils';

interface ProjectDependenciesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  tasks: ProjectTask[];
  onDependenciesChange?: () => void;
}

const emptyForm = {
  tarea_origen: '',
  tarea_destino: '',
  tipo: 'FS' as TipoDependencia,
  retraso_dias: 0,
};

export function ProjectDependenciesDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  tasks,
  onDependenciesChange,
}: ProjectDependenciesDialogProps) {
  const { toast } = useToast();
  const [deps, setDeps] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchDeps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dependencias')
        .select('*')
        .eq('proyecto_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDeps((data || []) as TaskDependency[]);
    } catch (err: any) {
      toast({ title: 'Error al cargar dependencias', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) fetchDeps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const taskMap = useMemo(() => {
    const map: Record<string, ProjectTask> = {};
    tasks.forEach(t => { map[t.id] = t; });
    return map;
  }, [tasks]);

  const taskLabel = (id: string) => {
    const t = taskMap[id];
    return t ? `${t.phase}: ${t.name}` : 'Tarea eliminada';
  };

  const setField = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const openAddForm = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const { tarea_origen, tarea_destino, tipo, retraso_dias } = form;
    if (!tarea_origen || !tarea_destino) {
      toast({ title: 'Campos requeridos', description: 'Selecciona la tarea origen y la tarea destino.', variant: 'destructive' });
      return;
    }
    if (tarea_origen === tarea_destino) {
      toast({ title: 'Dependencia inválida', description: 'Una tarea no puede depender de sí misma.', variant: 'destructive' });
      return;
    }
    const activeDeps = deps.filter(d => d.activa);
    if (activeDeps.some(d => d.tarea_origen === tarea_origen && d.tarea_destino === tarea_destino)) {
      toast({ title: 'Dependencia duplicada', description: 'Ya existe una dependencia activa entre estas dos tareas.', variant: 'destructive' });
      return;
    }
    if (wouldCreateCycle(activeDeps, tarea_origen, tarea_destino)) {
      toast({
        title: '❌ Dependencia circular',
        description: 'Esta dependencia crearía un ciclo (ej. A → B → A). No se puede guardar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('dependencias').insert({
        proyecto_id: projectId,
        tarea_origen,
        tarea_destino,
        tipo,
        retraso_dias: Number(retraso_dias) || 0,
        activa: true,
      });
      if (error) throw error;
      toast({ title: 'Dependencia creada' });
      closeForm();
      fetchDeps();
      onDependenciesChange?.();
    } catch (err: any) {
      toast({ title: 'Error al guardar dependencia', description: err.message, variant: 'destructive' });
    }
  };

  const toggleActiva = async (dep: TaskDependency) => {
    try {
      const { error } = await supabase.from('dependencias').update({ activa: !dep.activa }).eq('id', dep.id);
      if (error) throw error;
      fetchDeps();
      onDependenciesChange?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteDep = async (id: string) => {
    if (!window.confirm('¿Eliminar esta dependencia?')) return;
    try {
      const { error } = await supabase.from('dependencias').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Dependencia eliminada' });
      fetchDeps();
      onDependenciesChange?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5 text-purple-600" />
            <span>🔗 Dependencias entre tareas</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Proyecto: <span className="font-semibold">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Tarea Origen</TableHead>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Tarea Destino</TableHead>
                  <TableHead className="w-[140px]">Tipo</TableHead>
                  <TableHead className="w-[90px] text-center">Retraso</TableHead>
                  <TableHead className="w-[70px] text-center">Activa</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-4 text-xs">Cargando...</TableCell></TableRow>
                ) : deps.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">Sin dependencias registradas.</TableCell></TableRow>
                ) : deps.map(d => (
                  <TableRow key={d.id} className={`text-xs ${!d.activa ? 'opacity-50' : ''}`}>
                    <TableCell className="max-w-[180px] truncate" title={taskLabel(d.tarea_origen)}>{taskLabel(d.tarea_origen)}</TableCell>
                    <TableCell><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                    <TableCell className="max-w-[180px] truncate" title={taskLabel(d.tarea_destino)}>{taskLabel(d.tarea_destino)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{TIPO_DEPENDENCIA_LABELS[d.tipo]}</Badge></TableCell>
                    <TableCell className="text-center">{d.retraso_dias}d</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={d.activa} onCheckedChange={() => toggleActiva(d)} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => deleteDep(d.id)} title="Eliminar dependencia">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {showForm && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-primary">◆ NUEVA DEPENDENCIA</h4>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={closeForm}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tarea Origen (debe completarse primero)</Label>
                <Select value={form.tarea_origen} onValueChange={v => setField('tarea_origen', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecciona una tarea..." /></SelectTrigger>
                  <SelectContent>
                    {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.phase}: {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tarea Destino (depende de la anterior)</Label>
                <Select value={form.tarea_destino} onValueChange={v => setField('tarea_destino', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecciona una tarea..." /></SelectTrigger>
                  <SelectContent>
                    {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.phase}: {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setField('tipo', v as TipoDependencia)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_DEPENDENCIA_OPTIONS.map(t => <SelectItem key={t} value={t}>{TIPO_DEPENDENCIA_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Retraso (días)</Label>
                  <Input type="number" min={0} value={form.retraso_dias} onChange={e => setField('retraso_dias', Number(e.target.value))} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={closeForm}>Cancelar</Button>
                <Button size="sm" onClick={handleSave}>Guardar Dependencia</Button>
              </div>
            </div>
          )}
        </div>

        {!showForm && (
          <div className="pt-3 border-t">
            <Button variant="outline" size="sm" onClick={openAddForm} className="gap-1.5 text-xs" disabled={tasks.length < 2}>
              <Plus className="h-4 w-4" /> Nueva Dependencia
            </Button>
            {tasks.length < 2 && (
              <span className="text-xs text-muted-foreground ml-2">Se necesitan al menos 2 tareas para crear una dependencia.</span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
