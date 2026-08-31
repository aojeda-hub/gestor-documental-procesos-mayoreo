import {
  startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth,
  isWithinInterval, differenceInCalendarDays, parseISO,
} from 'date-fns';
import type { Seguimiento, SeguimientoColumn } from '@/types/database';
import type { UserDirectoryEntry } from '@/hooks/useUserDirectory';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getWeekRange(reference: Date, weekOffset: number): DateRange {
  const base = addWeeks(reference, weekOffset);
  return {
    start: startOfWeek(base, { weekStartsOn: 1 }),
    end: endOfWeek(base, { weekStartsOn: 1 }),
  };
}

export function getFinalColumn(columns: SeguimientoColumn[]): SeguimientoColumn | null {
  if (columns.length === 0) return null;
  return columns.reduce((max, col) => (col.orden > max.orden ? col : max), columns[0]);
}

export function filterTasksInRange(tasks: Seguimiento[], range: DateRange): Seguimiento[] {
  return tasks.filter(t => {
    if (!t.fecha_limite) return false;
    const date = parseISO(t.fecha_limite);
    return isWithinInterval(date, { start: range.start, end: range.end });
  });
}

export type IsDoneCheck = (task: Seguimiento) => boolean;

// Por defecto "completado" = la tarjeta esta en la columna de mayor `orden`
// (el flujo tipico de un kanban: Backlog -> ... -> Hecho). Algunos tableros
// (ej. Reunion Operativa, donde las columnas son categorias tematicas y no
// etapas de un proceso) necesitan definir "completado" de otra forma -> por
// eso las funciones reciben el criterio en vez de asumir siempre la columna.
export function columnIsDoneCheck(finalColumnId: string | null): IsDoneCheck {
  return (task) => !!finalColumnId && task.column_id === finalColumnId;
}

export function computeCumplimiento(tasks: Seguimiento[], isDone: IsDoneCheck) {
  const total = tasks.length;
  const enFinal = tasks.filter(isDone).length;
  const pct = total === 0 ? null : Math.round((enFinal / total) * 100);
  return { total, enFinal, pct };
}

// Aproximacion: no se guarda un historial de cambios de columna/estado, solo
// el valor actual. La velocidad de semanas pasadas se calcula con el estado
// de "completado" que cada tarea tiene AHORA, no con el que tenia esa semana.
export function computeVelocidad(
  tasks: Seguimiento[],
  weeksBack: number,
  reference: Date,
  isDone: IsDoneCheck,
): number {
  let totalCompletadas = 0;
  for (let i = 1; i <= weeksBack; i++) {
    const range = getWeekRange(reference, -i);
    const weekTasks = filterTasksInRange(tasks, range);
    totalCompletadas += weekTasks.filter(isDone).length;
  }
  return weeksBack === 0 ? 0 : Math.round((totalCompletadas / weeksBack) * 10) / 10;
}

export function detectBloqueadas(
  tasks: Seguimiento[],
  isDone: IsDoneCheck,
  thresholdDays: number,
  reference: Date,
): Array<Seguimiento & { diasEnColumna: number }> {
  return tasks
    .filter(t => t.column_id && !isDone(t) && t.column_entered_at)
    .map(t => ({ ...t, diasEnColumna: differenceInCalendarDays(reference, parseISO(t.column_entered_at!)) }))
    .filter(t => t.diasEnColumna > thresholdDays);
}

export interface ResponsableRanking {
  userId: string;
  nombre: string;
  total: number;
  completadas: number;
  pct: number | null;
}

export function computeRankingPorResponsable(
  tasks: Seguimiento[],
  isDone: IsDoneCheck,
  membersByTask: Record<string, string[]>,
  directory: UserDirectoryEntry[],
  monthRange: DateRange,
): ResponsableRanking[] {
  // A diferencia del sprint semanal (que exige fecha_limite), el ranking
  // mensual no debe descartar tareas asignadas sin fecha limite: si no la
  // tiene, se ubica en el mes por su fecha de creacion.
  const monthTasks = tasks.filter(t => {
    const dateStr = t.fecha_limite || t.created_at;
    if (!dateStr) return false;
    return isWithinInterval(parseISO(dateStr), { start: monthRange.start, end: monthRange.end });
  });
  const byUser = new Map<string, { total: number; completadas: number }>();
  monthTasks.forEach(task => {
    const memberIds = membersByTask[task.id] || [];
    memberIds.forEach(userId => {
      const entry = byUser.get(userId) || { total: 0, completadas: 0 };
      entry.total += 1;
      if (isDone(task)) entry.completadas += 1;
      byUser.set(userId, entry);
    });
  });
  const rows: ResponsableRanking[] = Array.from(byUser.entries()).map(([userId, stats]) => ({
    userId,
    nombre: directory.find(u => u.user_id === userId)?.full_name || 'Usuario',
    total: stats.total,
    completadas: stats.completadas,
    pct: stats.total === 0 ? null : Math.round((stats.completadas / stats.total) * 100),
  }));
  return rows.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
}

export function getMonthRange(reference: Date): DateRange {
  return { start: startOfMonth(reference), end: endOfMonth(reference) };
}
