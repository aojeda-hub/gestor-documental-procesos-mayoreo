export type Estado = 'pendiente' | 'en_revision' | 'en_progreso' | 'completado' | 'cancelado';
export type Prioridad = 'baja' | 'media' | 'alta' | 'critica';

export const COLUMNS: { key: Estado; label: string; color: string }[] = [
  { key: 'pendiente', label: 'Pendiente', color: 'bg-slate-500' },
  { key: 'en_revision', label: 'En Revisión', color: 'bg-amber-500' },
  { key: 'en_progreso', label: 'En Progreso', color: 'bg-blue-500' },
  { key: 'completado', label: 'Completado', color: 'bg-emerald-500' },
  { key: 'cancelado', label: 'Cancelado', color: 'bg-rose-500' },
];

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
};

export const PRIORIDAD_COLOR: Record<Prioridad, string> = {
  baja: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  media: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  alta: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  critica: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

// Sentinel id used in place of a real board UUID to select the cross-board
// "Asignado a mí" view instead of a specific SeguimientoBoard.
export const ASSIGNED_TO_ME_ID = '__assigned__';
