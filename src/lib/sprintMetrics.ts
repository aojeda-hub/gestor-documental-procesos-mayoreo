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

export function computeCumplimiento(tasks: Seguimiento[], finalColumnId: string | null) {
  const total = tasks.length;
  const enFinal = finalColumnId ? tasks.filter(t => t.column_id === finalColumnId).length : 0;
  const pct = total === 0 ? null : Math.round((enFinal / total) * 100);
  return { total, enFinal, pct };
}

// Aproximacion: no se guarda un historial de cambios de columna, solo el
// estado actual. La velocidad de semanas pasadas se calcula con la columna
// en la que cada tarea esta AHORA, no con la que tenia esa semana.
export function computeVelocidad(
  tasks: Seguimiento[],
  columns: SeguimientoColumn[],
  weeksBack: number,
  reference: Date,
): number {
  const finalColumn = getFinalColumn(columns);
  if (!finalColumn) return 0;
  let totalCompletadas = 0;
  for (let i = 1; i <= weeksBack; i++) {
    const range = getWeekRange(reference, -i);
    const weekTasks = filterTasksInRange(tasks, range);
    totalCompletadas += weekTasks.filter(t => t.column_id === finalColumn.id).length;
  }
  return weeksBack === 0 ? 0 : Math.round((totalCompletadas / weeksBack) * 10) / 10;
}

export function detectBloqueadas(
  tasks: Seguimiento[],
  finalColumnId: string | null,
  thresholdDays: number,
  reference: Date,
): Array<Seguimiento & { diasEnColumna: number }> {
  return tasks
    .filter(t => t.column_id && t.column_id !== finalColumnId && t.column_entered_at)
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
  finalColumnId: string | null,
  membersByTask: Record<string, string[]>,
  directory: UserDirectoryEntry[],
  monthRange: DateRange,
): ResponsableRanking[] {
  const monthTasks = filterTasksInRange(tasks, monthRange);
  const byUser = new Map<string, { total: number; completadas: number }>();
  monthTasks.forEach(task => {
    const memberIds = membersByTask[task.id] || [];
    memberIds.forEach(userId => {
      const entry = byUser.get(userId) || { total: 0, completadas: 0 };
      entry.total += 1;
      if (finalColumnId && task.column_id === finalColumnId) entry.completadas += 1;
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
