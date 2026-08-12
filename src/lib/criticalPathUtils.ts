import { differenceInDays } from 'date-fns';
import type { ProjectTask, TaskDependency } from '@/types/database';

export interface CriticalPathTaskInfo {
  taskId: string;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  isCritical: boolean;
  hasConflict: boolean;
  conflictDays: number;
}

export interface CriticalPathResult {
  tasks: Record<string, CriticalPathTaskInfo>;
  projectEndOffset: number;
  excludedTaskIds: string[];
}

const EMPTY_RESULT: CriticalPathResult = { tasks: {}, projectEndOffset: 0, excludedTaskIds: [] };

function taskDuration(t: ProjectTask): number {
  if (!t.start_date || !t.end_date) return 1;
  return Math.max(1, differenceInDays(new Date(t.end_date), new Date(t.start_date)) + 1);
}

/**
 * Computes the Critical Path (CPM/PDM with lag support for FS/SS/FF/SF links)
 * over the tasks that have both start_date and end_date, using the active
 * task dependencies. Tasks without both dates are excluded (can't be placed
 * on a timeline) and reported in `excludedTaskIds`.
 *
 * Root tasks (no incoming active dependency) anchor their earliest-start (ES)
 * to their currently assigned start_date. Downstream tasks' ES is derived
 * purely from the dependency network, which lets us flag `hasConflict` when
 * a task's assigned start_date is earlier than what its dependencies allow.
 */
export function calculateCriticalPath(tasks: ProjectTask[], dependencies: TaskDependency[]): CriticalPathResult {
  const scheduled = tasks.filter(t => t.start_date && t.end_date);
  const scheduledIds = new Set(scheduled.map(t => t.id));
  const excludedTaskIds = tasks.filter(t => !scheduledIds.has(t.id)).map(t => t.id);

  if (scheduled.length === 0) {
    return { ...EMPTY_RESULT, excludedTaskIds };
  }

  const epoch = scheduled.reduce((min, t) => {
    const d = new Date(t.start_date!);
    return d < min ? d : min;
  }, new Date(scheduled[0].start_date!));

  const duration: Record<string, number> = {};
  const assignedES: Record<string, number> = {};
  scheduled.forEach(t => {
    duration[t.id] = taskDuration(t);
    assignedES[t.id] = differenceInDays(new Date(t.start_date!), epoch);
  });

  const edges = dependencies.filter(
    d => d.activa && scheduledIds.has(d.tarea_origen) && scheduledIds.has(d.tarea_destino)
  );

  const incoming: Record<string, TaskDependency[]> = {};
  const outgoing: Record<string, TaskDependency[]> = {};
  scheduled.forEach(t => { incoming[t.id] = []; outgoing[t.id] = []; });
  edges.forEach(d => {
    incoming[d.tarea_destino].push(d);
    outgoing[d.tarea_origen].push(d);
  });

  // Topological sort (Kahn's algorithm)
  const inDegree: Record<string, number> = {};
  scheduled.forEach(t => { inDegree[t.id] = incoming[t.id].length; });
  const queue = scheduled.filter(t => inDegree[t.id] === 0).map(t => t.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    outgoing[id].forEach(d => {
      inDegree[d.tarea_destino] -= 1;
      if (inDegree[d.tarea_destino] === 0) queue.push(d.tarea_destino);
    });
  }
  // Defensive fallback: a stray cycle (shouldn't happen, cycles are blocked at
  // creation time) just gets appended as if it had no remaining dependencies.
  if (order.length < scheduled.length) {
    scheduled.forEach(t => { if (!order.includes(t.id)) order.push(t.id); });
  }

  const es: Record<string, number> = {};
  const ef: Record<string, number> = {};

  order.forEach(id => {
    const preds = incoming[id];
    if (preds.length === 0) {
      es[id] = assignedES[id];
    } else {
      let maxConstraint = -Infinity;
      preds.forEach(d => {
        const p = d.tarea_origen;
        const lag = d.retraso_dias || 0;
        let constraint: number;
        switch (d.tipo) {
          case 'SS': constraint = es[p] + lag; break;
          case 'FF': constraint = ef[p] + lag - duration[id] + 1; break;
          case 'SF': constraint = es[p] + lag - duration[id] + 1; break;
          case 'FS':
          default: constraint = ef[p] + lag + 1; break;
        }
        if (constraint > maxConstraint) maxConstraint = constraint;
      });
      es[id] = maxConstraint;
    }
    ef[id] = es[id] + duration[id] - 1;
  });

  const projectEndOffset = Math.max(...scheduled.map(t => ef[t.id]));

  const ls: Record<string, number> = {};
  const lf: Record<string, number> = {};

  [...order].reverse().forEach(id => {
    const succs = outgoing[id];
    if (succs.length === 0) {
      lf[id] = projectEndOffset;
    } else {
      let minConstraint = Infinity;
      succs.forEach(d => {
        const s = d.tarea_destino;
        const lag = d.retraso_dias || 0;
        let constraint: number;
        switch (d.tipo) {
          case 'SS': constraint = ls[s] - lag + duration[id] - 1; break;
          case 'FF': constraint = lf[s] - lag; break;
          case 'SF': constraint = lf[s] - lag + duration[id] - 1; break;
          case 'FS':
          default: constraint = ls[s] - lag - 1; break;
        }
        if (constraint < minConstraint) minConstraint = constraint;
      });
      lf[id] = minConstraint;
    }
    ls[id] = lf[id] - duration[id] + 1;
  });

  const result: Record<string, CriticalPathTaskInfo> = {};
  scheduled.forEach(t => {
    const slack = ls[t.id] - es[t.id];
    const conflictDays = Math.max(0, es[t.id] - assignedES[t.id]);
    result[t.id] = {
      taskId: t.id,
      es: es[t.id],
      ef: ef[t.id],
      ls: ls[t.id],
      lf: lf[t.id],
      slack,
      isCritical: slack <= 0,
      hasConflict: conflictDays > 0,
      conflictDays,
    };
  });

  return { tasks: result, projectEndOffset, excludedTaskIds };
}
