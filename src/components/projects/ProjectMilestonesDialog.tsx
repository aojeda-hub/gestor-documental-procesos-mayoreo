import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Flag, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { ProjectMilestone, ProjectPhase } from '@/types/database';
import { ensureProjectMilestones, getMilestoneStatus, MILESTONE_STATUS_META } from '@/lib/milestoneDefaults';

const PHASES = ['Alineación', 'Diseño', 'Construcción', 'Implementación', 'Adopción'];

interface ProjectMilestonesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  phases: ProjectPhase[];
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  onMilestonesChange?: () => void;
}

const emptyForm = {
  nombre: '',
  descripcion: '',
  fecha_planeada: new Date().toISOString().split('T')[0],
  fase_asociada: 'ninguna',
};

export function ProjectMilestonesDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  phases,
  projectStartDate,
  projectEndDate,
  onMilestonesChange,
}: ProjectMilestonesDialogProps) {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      const data = await ensureProjectMilestones(projectId, {
        start_date: projectStartDate,
        end_date: projectEndDate,
      });
      setMilestones(data.slice().sort((a, b) => a.orden - b.orden));
    } catch (err: any) {
      toast({ title: 'Error al cargar hitos', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) fetchMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const setField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (m: ProjectMilestone) => {
    setEditingId(m.id);
    setForm({
      nombre: m.nombre,
      descripcion: m.descripcion || '',
      fecha_planeada: m.fecha_planeada,
      fase_asociada: m.fase_asociada || 'ninguna',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.fecha_planeada) {
      toast({ title: 'Campos requeridos', description: 'Nombre y fecha planeada son obligatorios.', variant: 'destructive' });
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      fecha_planeada: form.fecha_planeada,
      fase_asociada: form.fase_asociada === 'ninguna' ? null : form.fase_asociada,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('hitos').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Hito actualizado' });
      } else {
        const maxOrden = milestones.reduce((max, m) => Math.max(max, m.orden), 0);
        const { error } = await supabase.from('hitos').insert({ ...payload, proyecto_id: projectId, orden: maxOrden + 1 });
        if (error) throw error;
        toast({ title: 'Hito agregado' });
      }
      closeForm();
      fetchMilestones();
      onMilestonesChange?.();
    } catch (err: any) {
      toast({ title: 'Error al guardar hito', description: err.message, variant: 'destructive' });
    }
  };

  const toggleCompletado = async (m: ProjectMilestone) => {
    const nuevoCompletado = !m.completado;
    try {
      const { error } = await supabase
        .from('hitos')
        .update({ completado: nuevoCompletado, fecha_real: nuevoCompletado ? new Date().toISOString().split('T')[0] : null })
        .eq('id', m.id);
      if (error) throw error;
      fetchMilestones();
      onMilestonesChange?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteMilestone = async (id: string) => {
    if (!window.confirm('¿Eliminar este hito?')) return;
    try {
      const { error } = await supabase.from('hitos').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Hito eliminado' });
      fetchMilestones();
      onMilestonesChange?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Flag className="h-5 w-5 text-blue-600" />
            <span>📌 Hitos del proyecto</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Proyecto: <span className="font-semibold">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-3">
          {loading ? (
            <div className="text-center py-6 text-sm text-muted-foreground">Cargando hitos...</div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">Sin hitos registrados.</div>
          ) : (
            milestones.map(m => {
              const status = getMilestoneStatus(m, phases);
              const meta = MILESTONE_STATUS_META[status];
              return (
                <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <Checkbox checked={m.completado} onCheckedChange={() => toggleCompletado(m)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${m.completado ? 'line-through text-muted-foreground' : ''}`}>
                        {m.nombre}
                      </span>
                      <span className={`text-xs font-semibold ${meta.cls}`}>{meta.icon} {meta.label}</span>
                      {m.fase_asociada && <Badge variant="outline" className="text-[10px] py-0">{m.fase_asociada}</Badge>}
                    </div>
                    {m.descripcion && <p className="text-xs text-muted-foreground mt-0.5">{m.descripcion}</p>}
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3">
                      <span>Planeada: {new Date(m.fecha_planeada).toLocaleDateString()}</span>
                      {m.fecha_real && <span>Real: {new Date(m.fecha_real).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEditForm(m)} title="Editar hito">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMilestone(m.id)} title="Eliminar hito">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {showForm && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-primary">◆ {editingId ? 'EDITAR HITO' : 'NUEVO HITO'}</h4>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={closeForm}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre</Label>
                <Input value={form.nombre} onChange={e => setField('nombre', e.target.value)} placeholder="Ej: Diseño completado" className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Textarea value={form.descripcion} onChange={e => setField('descripcion', e.target.value)} placeholder="Ej: Arquitectura y prototipos aprobados" className="text-xs min-h-[50px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fecha Planeada</Label>
                  <Input type="date" value={form.fecha_planeada} onChange={e => setField('fecha_planeada', e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fase Asociada</Label>
                  <Select value={form.fase_asociada} onValueChange={v => setField('fase_asociada', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguna">General (sin fase)</SelectItem>
                      {PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={closeForm}>Cancelar</Button>
                <Button size="sm" onClick={handleSave}>Guardar Hito</Button>
              </div>
            </div>
          )}
        </div>

        {!showForm && (
          <div className="pt-3 border-t">
            <Button variant="outline" size="sm" onClick={openAddForm} className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" /> Agregar Hito
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
