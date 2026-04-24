import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SILO_LABELS } from '@/types/database';
import type { Project, SiloType } from '@/types/database';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSave: () => void;
}

const PHASES = ['Alineación', 'Diseño', 'Construcción', 'Implementación', 'Adopción'];

const PHASE_DESCRIPTIONS: Record<string, string> = {
  'Alineación': 'Se define el alcance, objetivos y requisitos del proyecto. Se alinean expectativas con los stakeholders, se asignan recursos y se aprueba el plan inicial.',
  'Diseño': 'Se crean los planos, arquitectura, flujos de trabajo y prototipos. Se definen especificaciones técnicas y funcionales antes de empezar a construir.',
  'Construcción': 'Se desarrollan los componentes, se escribe código, se ensamblan piezas o se generan los entregables concretos del proyecto.',
  'Implementación': 'Se despliega lo construido en el entorno real (producción). Se realizan pruebas finales, migraciones de datos y se pone en operación.',
  'Adopción': 'Los usuarios finales comienzan a usar el entregable. Se da capacitación, soporte inicial, se recoge feedback y se asegura el uso continuo.',
};

const emptyForm = {
  name: '',
  silo: 'procesos' as SiloType,
  phase: 'Alineación',
  start_date: '',
  end_date: '',
  description: '',
  goal: '',
  specific_goals: [] as string[],
  responsible: '',
  priority: 'Media',
};

export function ProjectFormDialog({ open, onOpenChange, project, onSave }: ProjectFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        silo: project.silo,
        phase: project.phase,
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        description: project.description || '',
        goal: project.goal || '',
        specific_goals: project.specific_goals || [],
        responsible: project.responsible || '',
        priority: project.priority || 'Media',
      });
    } else {
      setForm(emptyForm);
    }
  }, [project, open]);

  const setField = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { ...form };
      let error;

      if (project) {
        ({ error } = await supabase.from('projects').update(payload).eq('id', project.id));
      } else {
        ({ error } = await supabase.from('projects').insert(payload));
      }

      if (error) throw error;

      toast({ title: project ? 'Proyecto actualizado' : 'Proyecto creado' });
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Proyecto</Label>
            <Input 
              id="name" 
              value={form.name} 
              onChange={e => setField('name', e.target.value)} 
              placeholder="Ej: Migración de Base de Datos"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Silo</Label>
              <Select value={form.silo} onValueChange={v => setField('silo', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SILO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fase Actual</Label>
              <Select value={form.phase} onValueChange={v => setField('phase', v)} disabled={!!project}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PHASES.map(p => (
                    <SelectItem key={p} value={p}>
                      <div title={PHASE_DESCRIPTIONS[p]}>{p}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input 
                id="start_date" 
                type="date" 
                value={form.start_date} 
                onChange={e => setField('start_date', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha de Cierre</Label>
              <Input 
                id="end_date" 
                type="date" 
                value={form.end_date} 
                onChange={e => setField('end_date', e.target.value)} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsable</Label>
              <Input 
                id="responsible" 
                value={form.responsible} 
                onChange={e => setField('responsible', e.target.value)} 
                placeholder="Nombre del responsable"
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={form.priority} onValueChange={v => setField('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baja">Baja</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Objetivo General (Frase corta)</Label>
            <Input 
              id="goal" 
              value={form.goal} 
              onChange={e => setField('goal', e.target.value)} 
              placeholder="Ej: Optimizar el proceso de despacho en un 20%"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción General</Label>
            <Textarea 
              id="description" 
              value={form.description} 
              onChange={e => setField('description', e.target.value)} 
              placeholder="Detalles adicionales del proyecto..."
              className="h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specific_goals">Objetivos Específicos (Uno por línea)</Label>
            <Textarea 
              id="specific_goals" 
              value={form.specific_goals.join('\n')} 
              onChange={e => setField('specific_goals', e.target.value.split('\n').filter(line => line.trim() !== ''))} 
              placeholder="1. Objetivo A&#10;2. Objetivo B"
              className="h-24"
            />
          </div>

          <Button onClick={handleSave} disabled={loading || !form.name} className="w-full">
            {loading ? 'Guardando...' : 'Guardar Proyecto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
