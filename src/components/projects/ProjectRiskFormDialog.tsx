import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Paperclip, ExternalLink, Trash2, AlertTriangle, Shield } from 'lucide-react';
import type { ProyectoRiesgo, ProjectTask, ProbabilidadType, ImpactoType, CategoriaRiesgo, RiesgoEstado } from '@/types/database';
import {
  calcularNivelRiesgo,
  PROBABILIDAD_OPTIONS,
  IMPACTO_OPTIONS,
  CATEGORIA_OPTIONS,
  ESTADO_OPTIONS,
  NIVEL_META,
} from '@/lib/riskUtils';

const PHASES = ['Todas', 'Alineación', 'Diseño', 'Construcción', 'Implementación', 'Adopción'];

interface ProjectRiskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  riskToEdit?: ProyectoRiesgo | null;
  tasks?: ProjectTask[];
  onSave: () => void;
}

export function ProjectRiskFormDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  riskToEdit,
  tasks = [],
  onSave,
}: ProjectRiskFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    descripcion: '',
    categoria: 'Técnico' as CategoriaRiesgo,
    probabilidad: 'Media' as ProbabilidadType,
    impacto: 'Medio' as ImpactoType,
    fase_afectada: 'Construcción',
    tarea_afectada: '' as string,
    plan_mitigacion: '',
    responsable_mitigacion: '',
    fecha_identificacion: new Date().toISOString().split('T')[0],
    estado: 'Activo' as RiesgoEstado,
    evidencia_url: '' as string,
  });

  useEffect(() => {
    if (riskToEdit) {
      setForm({
        descripcion: riskToEdit.descripcion || '',
        categoria: riskToEdit.categoria || 'Técnico',
        probabilidad: riskToEdit.probabilidad || 'Media',
        impacto: riskToEdit.impacto || 'Medio',
        fase_afectada: riskToEdit.fase_afectada || 'Todas',
        tarea_afectada: riskToEdit.tarea_afectada || '',
        plan_mitigacion: riskToEdit.plan_mitigacion || '',
        responsable_mitigacion: riskToEdit.responsable_mitigacion || '',
        fecha_identificacion: riskToEdit.fecha_identificacion || new Date().toISOString().split('T')[0],
        estado: riskToEdit.estado || 'Activo',
        evidencia_url: riskToEdit.evidencia_url || '',
      });
    } else {
      setForm({
        descripcion: '',
        categoria: 'Técnico',
        probabilidad: 'Media',
        impacto: 'Medio',
        fase_afectada: 'Construcción',
        tarea_afectada: '',
        plan_mitigacion: '',
        responsable_mitigacion: '',
        fecha_identificacion: new Date().toISOString().split('T')[0],
        estado: 'Activo',
        evidencia_url: '',
      });
    }
  }, [riskToEdit, open]);

  const nivelCalculado = calcularNivelRiesgo(form.probabilidad, form.impacto);
  const nivelMeta = NIVEL_META[nivelCalculado];

  const setField = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  // Filter tasks by phase if specified
  const filteredTasks = tasks.filter(t => {
    if (!form.fase_afectada || form.fase_afectada === 'Todas') return true;
    return t.phase === form.fase_afectada;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `risk-evidence/${projectId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('project-documents')
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(path);

      setField('evidencia_url', urlData.publicUrl);
      toast({ title: 'Evidencia adjuntada' });
    } catch (err: any) {
      toast({ title: 'Error al subir archivo', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.descripcion.trim()) {
      toast({ title: 'Campo requerido', description: 'Por favor describe el riesgo.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        proyecto_id: projectId,
        descripcion: form.descripcion.trim(),
        categoria: form.categoria,
        probabilidad: form.probabilidad,
        impacto: form.impacto,
        fase_afectada: form.fase_afectada || null,
        tarea_afectada: form.tarea_afectada ? form.tarea_afectada : null,
        plan_mitigacion: form.plan_mitigacion.trim() || null,
        responsable_mitigacion: form.responsable_mitigacion.trim() || null,
        fecha_identificacion: form.fecha_identificacion,
        estado: form.estado,
        fecha_cierre: form.estado === 'Cerrado' ? new Date().toISOString().split('T')[0] : null,
        evidencia_url: form.evidencia_url || null,
      };

      if (riskToEdit) {
        const { error } = await supabase
          .from('riesgos')
          .update(payload)
          .eq('id', riskToEdit.id);
        if (error) throw error;
        toast({ title: 'Riesgo actualizado' });
      } else {
        const { error } = await supabase
          .from('riesgos')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Riesgo identificado y registrado' });
      }

      onSave();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error al guardar riesgo', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>{riskToEdit ? 'Editar Riesgo' : '⚠️ Identificar Nuevo Riesgo'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Proyecto: <span className="font-semibold">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />

        <div className="grid gap-4 py-4 px-6 overflow-y-auto flex-1 min-h-0 text-xs">
          {/* Section 1: Information */}
          <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
            <h4 className="font-bold text-xs flex items-center gap-1.5 text-primary">
              ◆ INFORMACIÓN DEL RIESGO
            </h4>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descripción del Riesgo *</Label>
              <Textarea
                value={form.descripcion}
                onChange={e => setField('descripcion', e.target.value)}
                placeholder="Ej: Caída del sistema origen durante migración..."
                className="text-xs min-h-[60px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Categoría</Label>
              <Select value={form.categoria} onValueChange={v => setField('categoria', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIA_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Evaluation */}
          <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs flex items-center gap-1.5 text-primary">
                ◆ EVALUACIÓN DE PROBABILIDAD E IMPACTO
              </h4>
              <Badge className={`px-2.5 py-0.5 text-xs ${nivelMeta.badgeCls}`}>
                Nivel Calculado: {nivelMeta.icon} {nivelMeta.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Probabilidad</Label>
                <Select value={form.probabilidad} onValueChange={v => setField('probabilidad', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROBABILIDAD_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Impacto</Label>
                <Select value={form.impacto} onValueChange={v => setField('impacto', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPACTO_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 3: Scope / Task Link */}
          <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
            <h4 className="font-bold text-xs flex items-center gap-1.5 text-primary">
              ◆ AFECTACIÓN
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fase Afectada</Label>
                <Select value={form.fase_afectada} onValueChange={v => setField('fase_afectada', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tarea Afectada (opcional)</Label>
                <Select value={form.tarea_afectada || 'none'} onValueChange={v => setField('tarea_afectada', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="General / Ninguna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Afecta a toda la fase / General</SelectItem>
                    {filteredTasks.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.phase}: {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 4: Mitigation */}
          <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
            <h4 className="font-bold text-xs flex items-center gap-1.5 text-primary">
              ◆ PLAN DE MITIGACIÓN
            </h4>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Plan / Acción Preventiva</Label>
              <Textarea
                value={form.plan_mitigacion}
                onChange={e => setField('plan_mitigacion', e.target.value)}
                placeholder="Ej: Hacer backup completo y probar en ambiente espejo..."
                className="text-xs min-h-[60px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Responsable de Mitigación</Label>
              <Input
                value={form.responsable_mitigacion}
                onChange={e => setField('responsable_mitigacion', e.target.value)}
                placeholder="Ej: Carlos (Infraestructura)"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Section 5: Status & Attachment */}
          <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg border">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Estado</Label>
              <Select value={form.estado} onValueChange={v => setField('estado', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADO_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Fecha Identificación</Label>
              <Input
                type="date"
                value={form.fecha_identificacion}
                onChange={e => setField('fecha_identificacion', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Attachment button & preview */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs h-8 gap-1.5"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span>{uploading ? 'Subiendo...' : form.evidencia_url ? 'Cambiar evidencia' : '📎 Adjuntar evidencia'}</span>
            </Button>

            {form.evidencia_url && (
              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                <a
                  href={form.evidencia_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Ver evidencia <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={() => setField('evidencia_url', '')}
                  className="text-muted-foreground hover:text-red-500 ml-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t bg-background flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="font-medium">
            {loading ? 'Guardando...' : 'Guardar Riesgo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
