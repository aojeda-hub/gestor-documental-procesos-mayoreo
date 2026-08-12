import type { TaskDependency, TipoDependencia, ProjectTask } from '@/types/database';

export const TIPO_DEPENDENCIA_OPTIONS: TipoDependencia[] = ['FS', 'SS', 'FF', 'SF'];

export const TIPO_DEPENDENCIA_LABELS: Record<TipoDependencia, string> = {
  FS: 'Finish to Start (FS)',
  SS: 'Start to Start (SS)',
  FF: 'Finish to Finish (FF)',
  SF: 'Start to Finish (SF)',
};

/**
 * Checks whether adding an edge tarea_origen -> tarea_destino would create a
 * circular dependency, i.e. whether tarea_origen is already reachable from
 * tarea_destino through the existing active dependency graph.
 */
export function wouldCreateCycle(
  existingDeps: TaskDependency[],
  tareaOrigen: string,
  tareaDestino: string
): boolean {
  if (tareaOrigen === tareaDestino) return true;

  const visited = new Set<string>();
  const stack = [tareaDestino];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === tareaOrigen) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    existingDeps
      .filter(d => d.activa && d.tarea_origen === current)
      .forEach(d => stack.push(d.tarea_destino));
  }

  return false;
}

export interface BlockingDependency {
  dependencia: TaskDependency;
  tareaOrigen: ProjectTask;
}

/**
 * Returns the active dependencies that block a task from being marked as
 * complete: those where this task is the destination and the origin task
 * is not yet at 100% progress.
 */
export function getBlockingDependencies(
  taskId: string,
  deps: TaskDependency[],
  tasksById: Record<string, ProjectTask>
): BlockingDependency[] {
  return deps
    .filter(d => d.activa && d.tarea_destino === taskId)
    .map(d => ({ dependencia: d, tareaOrigen: tasksById[d.tarea_origen] }))
    .filter((b): b is BlockingDependency => !!b.tareaOrigen && (b.tareaOrigen.progress_percent ?? 0) < 100);
}
