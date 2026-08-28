import { useMemo, useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Copy, AlertTriangle, User, FolderKanban, Gauge, Zap, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Seguimiento, SeguimientoBoard, SeguimientoColumn } from '@/types/database';
import type { UserDirectoryEntry } from '@/hooks/useUserDirectory';
import { syncSeguimientoResponsables } from '@/lib/seguimientoResponsables';
import {
  getWeekRange, getMonthRange, getFinalColumn, filterTasksInRange,
  computeCumplimiento, computeVelocidad, detectBloqueadas, computeRankingPorResponsable,
} from '@/lib/sprintMetrics';

interface SprintSemanalViewProps {
  board: SeguimientoBoard;
  columns: SeguimientoColumn[];
  tasks: Seguimiento[];
  membersByTask: Record<string, string[]>;
  directory: UserDirectoryEntry[];
  onOpenTask: (id: string) => void;
  onCloned: () => void;
}

export function SprintSemanalView({ board, columns, tasks, membersByTask, directory, onOpenTask, onCloned }: SprintSemanalViewProps) {
  const { toast } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [dashMode, setDashMode] = useState<'semana' | 'mes'>('semana');
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloning, setCloning] = useState(false);
  const today = new Date();

  const finalColumn = useMemo(() => getFinalColumn(columns), [columns]);
  const weekRange = useMemo(() => getWeekRange(today, weekOffset), [weekOffset]);
  const weekTasks = useMemo(() => filterTasksInRange(tasks, weekRange), [tasks, weekRange]);
  const cumplimiento = useMemo(() => computeCumplimiento(weekTasks, finalColumn?.id ?? null), [weekTasks, finalColumn]);
  const velocidad = useMemo(() => computeVelocidad(tasks, columns, 4, today), [tasks, columns]);
  const bloqueadas = useMemo(() => detectBloqueadas(weekTasks, finalColumn?.id ?? null, 2, today), [weekTasks, finalColumn]);
  const bloqueadasInfo = useMemo(() => new Map(bloqueadas.map(b => [b.id, b.diasEnColumna])), [bloqueadas]);

  const groupedWeek = useMemo(() => {
    const g: Record<string, Seguimiento[]> = {};
    columns.forEach(c => { g[c.id] = []; });
    weekTasks.forEach(t => { if (t.column_id && g[t.column_id]) g[t.column_id].push(t); });
    return g;
  }, [columns, weekTasks]);

  const pendientes = useMemo(
    () => weekTasks.filter(t => t.column_id !== (finalColumn?.id ?? null)),
    [weekTasks, finalColumn],
  );

  const monthlyTrend = useMemo(() => {
    const weeks: { label: string; pct: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const range = getWeekRange(today, -i);
      const wTasks = filterTasksInRange(tasks, range);
      const { pct } = computeCumplimiento(wTasks, finalColumn?.id ?? null);
      weeks.push({ label: format(range.start, 'd MMM', { locale: es }), pct: pct ?? 0, total: wTasks.length });
    }
    return weeks;
  }, [tasks, finalColumn]);

  const ranking = useMemo(
    () => computeRankingPorResponsable(tasks, finalColumn?.id ?? null, membersByTask, directory, getMonthRange(today)),
    [tasks, finalColumn, membersByTask, directory],
  );

  const responsableLabel = (task: Seguimiento): string | null => {
    const ids = membersByTask[task.id];
    if (ids && ids.length > 0) {
      const names = ids.map(id => directory.find(u => u.user_id === id)?.full_name).filter(Boolean) as string[];
      if (names.length > 0) return names.join(', ');
    }
    return task.responsable || null;
  };

  const openCloneDialog = () => {
    if (!finalColumn) {
      toast({ title: 'Crea al menos una lista', description: 'Se necesita al menos una columna para saber cuál es la final.', variant: 'destructive' });
      return;
    }
    if (pendientes.length === 0) {
      toast({ title: 'No hay tareas pendientes en esta semana para clonar' });
      return;
    }
    setCloneDialogOpen(true);
  };

  const confirmClone = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCloning(true);

    const columnCounts: Record<string, number> = {};
    columns.forEach(c => { columnCounts[c.id] = tasks.filter(t => t.column_id === c.id).length; });

    let clonadas = 0;
    let hadError = false;
    for (const task of pendientes) {
      const colId = task.column_id!;
      const orden = columnCounts[colId] ?? 0;
      columnCounts[colId] = orden + 1;
      const nuevaFecha = task.fecha_limite ? format(addDays(parseISO(task.fecha_limite), 7), 'yyyy-MM-dd') : null;

      const { data, error } = await supabase.from('seguimientos').insert({
        titulo: task.titulo,
        descripcion: task.descripcion,
        estado: 'pendiente',
        prioridad: task.prioridad,
        proyecto: task.proyecto,
        fecha_limite: nuevaFecha,
        user_id: user.id,
        board_id: board.id,
        column_id: colId,
        orden,
      } as any).select('id').single();

      if (error || !data) { hadError = true; continue; }
      const memberIds = membersByTask[task.id] || [];
      if (memberIds.length > 0) {
        try { await syncSeguimientoResponsables((data as any).id, [], memberIds); } catch { /* no bloquea el clonado */ }
      }
      clonadas++;
    }

    setCloning(false);
    setCloneDialogOpen(false);
    if (hadError) {
      toast({ title: 'Algunas tareas no se pudieron clonar', variant: 'destructive' });
    } else {
      toast({ title: `${clonadas} tarea(s) clonada(s) a la siguiente semana` });
    }
    if (clonadas > 0) onCloned();
  };

  const pctColor = (pct: number | null) => {
    if (pct === null) return 'text-slate-400';
    if (pct >= 75) return 'text-emerald-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold text-slate-700 min-w-[190px] text-center">
            Semana del {format(weekRange.start, 'd MMM', { locale: es })} al {format(weekRange.end, 'd MMM yyyy', { locale: es })}
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => setWeekOffset(0)}>
              Semana actual
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <Button size="sm" variant={dashMode === 'semana' ? 'default' : 'ghost'} className="h-7 px-3" onClick={() => setDashMode('semana')}>Semana</Button>
            <Button size="sm" variant={dashMode === 'mes' ? 'default' : 'ghost'} className="h-7 px-3" onClick={() => setDashMode('mes')}>Mes</Button>
          </div>
          <Button onClick={openCloneDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Copy className="h-4 w-4 mr-2" /> Clonar Semana
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> Total sprint</div>
          <div className="text-2xl font-bold text-slate-900">{cumplimiento.total}</div>
        </Card>
        <Card className="p-4 border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> % Cumplimiento</div>
          <div className={cn('text-2xl font-bold', pctColor(cumplimiento.pct))}>{cumplimiento.pct === null ? '—' : `${cumplimiento.pct}%`}</div>
          {finalColumn && <div className="text-[11px] text-slate-400 mt-0.5">en "{finalColumn.nombre}"</div>}
        </Card>
        <Card className="p-4 border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Velocidad (4 sem.)</div>
          <div className="text-2xl font-bold text-indigo-600">{velocidad}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">tareas/semana</div>
        </Card>
        <Card className="p-4 border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Bloqueadas</div>
          <div className={cn('text-2xl font-bold', bloqueadas.length > 0 ? 'text-rose-600' : 'text-slate-900')}>{bloqueadas.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">&gt;2 días sin avanzar</div>
        </Card>
      </div>

      {dashMode === 'semana' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => (
            <div key={col.id} className="w-72 shrink-0 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 p-3">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color || '#64748b' }} />
                <h4 className="font-bold text-slate-700 text-sm">{col.nombre}</h4>
                <Badge variant="secondary" className="ml-auto bg-slate-200 text-slate-600 text-[10px]">{groupedWeek[col.id]?.length || 0}</Badge>
                {finalColumn?.id === col.id && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Final</Badge>}
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[480px] pr-1">
                {groupedWeek[col.id]?.map(task => {
                  const dias = bloqueadasInfo.get(task.id);
                  return (
                    <Card
                      key={task.id}
                      className="p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border-slate-200/80"
                      onClick={() => onOpenTask(task.id)}
                    >
                      {task.proyecto && (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-indigo-500 mb-0.5">
                          <FolderKanban className="h-3 w-3 shrink-0" />
                          <span className="truncate">{task.proyecto}</span>
                        </div>
                      )}
                      <h5 className="font-semibold text-slate-800 text-sm leading-snug">{task.titulo}</h5>
                      <div className="flex items-center justify-between mt-2">
                        {responsableLabel(task) && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 min-w-0">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[110px]">{responsableLabel(task)}</span>
                          </div>
                        )}
                        {dias !== undefined && (
                          <Badge className="bg-rose-100 text-rose-700 text-[9px] gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> {dias}d
                          </Badge>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {groupedWeek[col.id]?.length === 0 && (
                  <div className="text-center text-xs py-6 border border-dashed rounded-xl border-slate-200 text-slate-400">
                    Sin tareas esta semana
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-4 border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-700 text-sm mb-4">Tendencia de cumplimiento (últimas 6 semanas)</h4>
            <div className="space-y-3">
              {monthlyTrend.map(w => (
                <div key={w.label}>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>{w.label}</span>
                    <span className="font-semibold text-slate-700">{w.total === 0 ? '—' : `${w.pct}%`}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${w.total === 0 ? 0 : w.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4 border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-700 text-sm mb-4">Ranking por responsable (mes actual)</h4>
            {ranking.length === 0 ? (
              <div className="text-center text-xs py-6 text-slate-400">Sin tareas asignadas este mes</div>
            ) : (
              <div className="space-y-2">
                {ranking.map(r => (
                  <div key={r.userId} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
                    <span className="text-slate-700 font-medium truncate">{r.nombre}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{r.completadas}/{r.total}</span>
                      <span className={cn('font-bold', pctColor(r.pct))}>{r.pct === null ? '—' : `${r.pct}%`}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clonar tareas pendientes a la siguiente semana</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Se crearán {pendientes.length} tarea(s) nueva(s) con fecha límite +7 días. Las tareas actuales no se modifican ni se eliminan.
          </p>
          <div className="max-h-60 overflow-y-auto space-y-1 border border-slate-100 rounded-lg p-2">
            {pendientes.map(t => (
              <div key={t.id} className="text-sm text-slate-700 px-2 py-1 rounded hover:bg-slate-50">{t.titulo}</div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)} disabled={cloning}>Cancelar</Button>
            <Button onClick={confirmClone} disabled={cloning} className="bg-indigo-600 hover:bg-indigo-700">
              {cloning ? 'Clonando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
