import { supabase } from '@/integrations/supabase/client';
import type { ProjectMilestone, ProjectPhase } from '@/types/database';

interface DefaultMilestoneDef {
  nombre: string;
  descripcion: string;
  fase_asociada: string | null;
  fraction: number; // 0 = fecha de inicio del proyecto, 1 = fecha de cierre
}

export const DEFAULT_MILESTONE_DEFS: DefaultMilestoneDef[] = [
  { nombre: 'Kick-off', descripcion: 'Inicio oficial del proyecto', fase_asociada: null, fraction: 0 },
  { nombre: 'Alineación completada', descripcion: 'Cierre de la fase de Alineación', fase_asociada: 'Alineación', fraction: 0.2 },
  { nombre: 'Diseño completado', descripcion: 'Cierre de la fase de Diseño', fase_asociada: 'Diseño', fraction: 0.4 },
  { nombre: 'Construcción completado', descripcion: 'Cierre de la fase de Construcción', fase_asociada: 'Construcción', fraction: 0.6 },
  { nombre: 'Implementación completado', descripcion: 'Cierre de la fase de Implementación', fase_asociada: 'Implementación', fraction: 0.8 },
  { nombre: 'Adopción completado', descripcion: 'Cierre del proyecto', fase_asociada: 'Adopción', fraction: 1 },
];

function computeMilestoneDate(fraction: number, startStr?: string | null, endStr?: string | null): string {
  const today = new Date().toISOString().split('T')[0];
  if (!startStr && !endStr) return today;

  const start = new Date(startStr || endStr!);
  const end = new Date(endStr || startStr!);
  if (start.getTime() === end.getTime()) return startStr || endStr || today;

  const targetMs = start.getTime() + (end.getTime() - start.getTime()) * fraction;
  return new Date(targetMs).toISOString().split('T')[0];
}

/**
 * Fetches the milestones for a project. If none exist, seeds the 6 default
 * milestones (Kick-off + one "completado" milestone per phase) distributed
 * across the project's start/end dates.
 */
export async function ensureProjectMilestones(
  projectId: string,
  project: { start_date?: string | null; end_date?: string | null }
): Promise<ProjectMilestone[]> {
  const { data: existing, error } = await supabase
    .from('hitos')
    .select('*')
    .eq('proyecto_id', projectId)
    .order('orden', { ascending: true });

  if (error) {
    console.error('Error fetching hitos:', error);
    return [];
  }

  if (existing && existing.length > 0) {
    return existing as ProjectMilestone[];
  }

  const today = new Date().toISOString().split('T')[0];
  const toInsert = DEFAULT_MILESTONE_DEFS.map((def, idx) => {
    const isKickoff = def.fase_asociada === null;
    return {
      proyecto_id: projectId,
      nombre: def.nombre,
      descripcion: def.descripcion,
      fecha_planeada: computeMilestoneDate(def.fraction, project.start_date, project.end_date),
      fase_asociada: def.fase_asociada,
      orden: idx + 1,
      // El kick-off ya ocurrió por definición: el proyecto existe.
      completado: isKickoff,
      fecha_real: isKickoff ? (project.start_date || today) : null,
    };
  });

  const { data: seeded, error: insertError } = await supabase
    .from('hitos')
    .insert(toInsert)
    .select();

  if (insertError) {
    console.error('Error seeding hitos:', insertError);
    return [];
  }

  return (seeded || []) as ProjectMilestone[];
}

export type MilestoneStatus = 'completado' | 'en_curso' | 'bloqueado';

export function getMilestoneStatus(hito: ProjectMilestone, phases: ProjectPhase[]): MilestoneStatus {
  if (hito.completado) return 'completado';
  if (!hito.fase_asociada) return 'en_curso';
  const phase = phases.find(p => p.name === hito.fase_asociada);
  if (!phase || phase.status !== 'bloqueada') return 'en_curso';
  return 'bloqueado';
}

export const MILESTONE_STATUS_META: Record<MilestoneStatus, { icon: string; label: string; cls: string }> = {
  completado: { icon: '✅', label: 'Completado', cls: 'text-emerald-700 dark:text-emerald-400' },
  en_curso: { icon: '⏳', label: 'En curso', cls: 'text-amber-700 dark:text-amber-400' },
  bloqueado: { icon: '🔒', label: 'Bloqueado', cls: 'text-muted-foreground' },
};
