import { differenceInDays } from 'date-fns';
import type { ProjectTask } from '@/types/database';

export type ScheduleVarianceStatus = 'adelantado' | 'a_tiempo' | 'atrasado';

const ON_TIME_THRESHOLD_DAYS = 1;

export interface TaskVariance {
  taskId: string;
  varianceDays: number; // positive = terminó/terminará más tarde que la línea base
  status: ScheduleVarianceStatus;
}

export const VARIANCE_STATUS_META: Record<ScheduleVarianceStatus, { icon: string; label: string; cls: string; badgeCls: string }> = {
  adelantado: {
    icon: '🟢',
    label: 'Adelantado',
    cls: 'text-emerald-700 dark:text-emerald-400',
    badgeCls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300',
  },
  a_tiempo: {
    icon: '🔵',
    label: 'A tiempo',
    cls: 'text-blue-700 dark:text-blue-400',
    badgeCls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300',
  },
  atrasado: {
    icon: '🔴',
    label: 'Atrasado',
    cls: 'text-red-700 dark:text-red-400',
    badgeCls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-300',
  },
};

function statusFromVariance(varianceDays: number): ScheduleVarianceStatus {
  if (varianceDays > ON_TIME_THRESHOLD_DAYS) return 'atrasado';
  if (varianceDays < -ON_TIME_THRESHOLD_DAYS) return 'adelantado';
  return 'a_tiempo';
}

export function calculateTaskVariance(task: ProjectTask): TaskVariance | null {
  if (!task.baseline_end_date || !task.end_date) return null;
  const varianceDays = differenceInDays(new Date(task.end_date), new Date(task.baseline_end_date));
  return { taskId: task.id, varianceDays, status: statusFromVariance(varianceDays) };
}

export interface ProjectScheduleVarianceSummary {
  baselineEnd: string;
  currentEnd: string;
  varianceDays: number;
  status: ScheduleVarianceStatus;
  tasksAdelantadas: number;
  tasksATiempo: number;
  tasksAtrasadas: number;
  tasksSinBaseline: number;
}

/**
 * Compares the currently assigned schedule (start_date/end_date) against the
 * frozen baseline (baseline_start_date/baseline_end_date) captured earlier.
 * Returns null if no baseline has been captured yet.
 */
export function calculateProjectScheduleVariance(tasks: ProjectTask[]): ProjectScheduleVarianceSummary | null {
  const withBaseline = tasks.filter(t => t.baseline_end_date && t.end_date);
  if (withBaseline.length === 0) return null;

  const baselineEnd = withBaseline.reduce(
    (max, t) => (new Date(t.baseline_end_date!) > new Date(max) ? t.baseline_end_date! : max),
    withBaseline[0].baseline_end_date!
  );
  const currentEnd = withBaseline.reduce(
    (max, t) => (new Date(t.end_date!) > new Date(max) ? t.end_date! : max),
    withBaseline[0].end_date!
  );

  const varianceDays = differenceInDays(new Date(currentEnd), new Date(baselineEnd));
  const variances = withBaseline.map(calculateTaskVariance).filter((v): v is TaskVariance => !!v);

  return {
    baselineEnd,
    currentEnd,
    varianceDays,
    status: statusFromVariance(varianceDays),
    tasksAdelantadas: variances.filter(v => v.status === 'adelantado').length,
    tasksATiempo: variances.filter(v => v.status === 'a_tiempo').length,
    tasksAtrasadas: variances.filter(v => v.status === 'atrasado').length,
    tasksSinBaseline: tasks.length - withBaseline.length,
  };
}
