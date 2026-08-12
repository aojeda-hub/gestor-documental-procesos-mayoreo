import { supabase } from '@/integrations/supabase/client';
import type { PhaseGateItem } from '@/types/database';

export const DEFAULT_PHASE_CHECKLISTS: Record<string, string[]> = {
  'Alineación': [
    'Acta de constitución del proyecto firmada por Sponsor',
    'Sponsor/Patrocinador oficialmente asignado',
    'Alcance preliminar aprobado por el Sponsor',
    'Interesados clave identificados y documentados',
    'Objetivo general validado con el negocio',
  ],
  'Diseño': [
    'Documento de arquitectura técnica aprobado',
    'Prototipos o maquetas validadas con usuarios clave',
    'Plan de pruebas (unitarias, integración, aceptación) aceptado',
    'Estimación de esfuerzo (horas/días) revisada y aprobada',
    'Cronograma detallado de construcción definido',
  ],
  'Construcción': [
    'Todas las tareas de la fase al 100% de avance (automático)',
    'Pruebas unitarias con cobertura > 80% (si aplica)',
    'Código/configuración revisado por pares',
    'Documentación técnica actualizada',
    'Entregables parciales aceptados por el Sponsor',
  ],
  'Implementación': [
    'Plan de rollout (despliegue) aprobado por Comité de Cambios',
    'Ambiente de producción preparado y validado',
    'Plan de reversión (Backout plan) definido y probado',
    'Pruebas de integración exitosas en pre-producción',
    'Usuarios clave capacitados en el nuevo sistema',
  ],
  'Adopción': [
    'Entrenamiento a todos los usuarios finales completado',
    'Documentación final del proyecto (técnica + funcional) entregada',
    'Acta de cierre de proyecto firmada por el Sponsor',
    'Lecciones aprendidas documentadas en el sistema',
    'Todos los entregables transferidos a operaciones',
  ],
};

/**
 * Checks if a project has phase gate checklist items.
 * If none exist, seeds the 25 default items (5 for each of the 5 phases).
 */
export async function ensureProjectChecklist(projectId: string): Promise<PhaseGateItem[]> {
  const { data: existing, error } = await supabase
    .from('phase_gate_checklist')
    .select('*')
    .eq('project_id', projectId)
    .order('orden', { ascending: true });

  if (error) {
    console.error('Error fetching phase_gate_checklist:', error);
    return [];
  }

  if (existing && existing.length > 0) {
    return existing as PhaseGateItem[];
  }

  // Auto-seed if empty
  const toInsert: any[] = [];
  Object.entries(DEFAULT_PHASE_CHECKLISTS).forEach(([fase, items]) => {
    items.forEach((itemText, idx) => {
      toInsert.push({
        project_id: projectId,
        fase,
        item: itemText,
        completado: false,
        orden: idx + 1,
      });
    });
  });

  const { data: seeded, error: insertError } = await supabase
    .from('phase_gate_checklist')
    .insert(toInsert)
    .select();

  if (insertError) {
    console.error('Error seeding phase_gate_checklist:', insertError);
    return [];
  }

  return (seeded || []) as PhaseGateItem[];
}
