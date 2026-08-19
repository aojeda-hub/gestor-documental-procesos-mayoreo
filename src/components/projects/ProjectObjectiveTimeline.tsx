import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Settings2, Workflow, Users, Target, Search, CheckCircle2, Archive } from 'lucide-react';
import type { Project, ObjetivoEstrategico } from '@/types/database';
import { OBJETIVO_COLOR_CLASSES } from '@/types/database';

interface ProjectObjectiveTimelineProps {
  projects: (Project & { actual_progress: number | null })[];
  objetivos: ObjetivoEstrategico[];
}

const PILAR_ICONS: Record<string, typeof TrendingUp> = {
  ingresos: TrendingUp,
  eficiencia: Settings2,
  procesos: Workflow,
  talento: Users,
};

const MAX_MONTH_COLUMNS = 8;

function monthIndex(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() * 12 + d.getMonth();
}

function monthLabel(idx: number): string {
  const d = new Date(Math.floor(idx / 12), idx % 12, 1);
  return d.toLocaleDateString('es', { month: 'long' }).toUpperCase();
}

function shortMonthLabel(idx: number): string {
  const d = new Date(Math.floor(idx / 12), idx % 12, 1);
  return d.toLocaleDateString('es', { month: 'short' }).replace('.', '');
}

function progressOf(p: { end_date?: string | null; actual_progress: number | null }, isCulminado: boolean): number {
  if (isCulminado) return 100;
  return Math.round(p.actual_progress ?? 0);
}

export function ProjectObjectiveTimeline({ projects, objetivos }: ProjectObjectiveTimelineProps) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const today = new Date();
  const todayIdx = today.getFullYear() * 12 + today.getMonth();

  const classified = useMemo(() => {
    return projects.map(p => {
      const isCulminado = (p.actual_progress ?? 0) >= 100;
      const endDate = p.end_date ? new Date(p.end_date + 'T00:00:00') : null;
      const isAtrasado = !isCulminado && !!endDate && endDate < today;
      const startDate = p.start_date ? new Date(p.start_date + 'T00:00:00') : null;
      const isEnCurso = !isCulminado && !isAtrasado && !!startDate && startDate <= today;
      return { ...p, isCulminado, isAtrasado, isEnCurso };
    });
  }, [projects]);

  const avanceGlobal = useMemo(() => {
    if (classified.length === 0) return 0;
    const sum = classified.reduce((acc, p) => acc + progressOf(p, p.isCulminado), 0);
    return Math.round(sum / classified.length);
  }, [classified]);

  const activos = classified.filter(p => !p.isCulminado).length;
  const enCurso = classified.filter(p => p.isEnCurso).length;
  const atrasados = classified.filter(p => p.isAtrasado).length;
  const culminados = classified.filter(p => p.isCulminado).length;

  const pilarStats = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    classified.forEach(p => {
      if (!p.objetivo_estrategico_id) return;
      const entry = map.get(p.objetivo_estrategico_id) || { sum: 0, count: 0 };
      entry.sum += progressOf(p, p.isCulminado);
      entry.count += 1;
      map.set(p.objetivo_estrategico_id, entry);
    });
    return map;
  }, [classified]);

  const filteredBySearch = useMemo(() => {
    if (!search.trim()) return classified;
    const q = search.toLowerCase();
    return classified.filter(p => p.name.toLowerCase().includes(q));
  }, [classified, search]);

  const activeProjects = filteredBySearch.filter(p => !p.isCulminado && p.objetivo_estrategico_id);
  const culminadoProjects = classified
    .filter(p => p.isCulminado)
    .sort((a, b) => (b.end_date || '').localeCompare(a.end_date || ''));

  const visibleObjetivos = activeFilter === 'all' ? objetivos : objetivos.filter(o => o.id === activeFilter);

  const months = useMemo(() => {
    let min = todayIdx;
    let max = todayIdx;
    activeProjects.forEach(p => {
      if (p.start_date) min = Math.min(min, monthIndex(p.start_date));
      const effectiveEnd = p.isAtrasado ? todayIdx : (p.end_date ? monthIndex(p.end_date) : todayIdx);
      max = Math.max(max, effectiveEnd);
    });
    if (max - min + 1 > MAX_MONTH_COLUMNS) max = min + MAX_MONTH_COLUMNS - 1;
    const list: number[] = [];
    for (let i = min; i <= max; i++) list.push(i);
    return list;
  }, [activeProjects, todayIdx]);

  const currentMonthFrac = months.length > 0
    ? (todayIdx - months[0] + (today.getDate() / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())) / months.length
    : 0;

  const SIDEBAR_WIDTH = 190;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Avance Global" value={`${avanceGlobal}%`} valueClass="text-blue-600" />
        <SummaryCard label="Activos" value={activos} valueClass="text-orange-500" />
        <SummaryCard label="En Curso" value={enCurso} valueClass="text-orange-500" />
        <SummaryCard label="Atrasados" value={atrasados} valueClass="text-red-600" hint="En programa" />
        <SummaryCard label="Culminados" value={culminados} valueClass="text-emerald-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar proyecto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-background hover:bg-muted'}`}
          >
            Todas
          </button>
          {objetivos.map(o => {
            const colors = OBJETIVO_COLOR_CLASSES[o.color];
            const isActive = activeFilter === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setActiveFilter(o.id)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${isActive ? colors?.chipActive : 'bg-background hover:bg-muted'}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : colors?.dot}`} />
                {o.pilar}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <div style={{ minWidth: SIDEBAR_WIDTH + months.length * 90 }}>
          <div className="relative">
            <div className="flex border-b bg-muted/40 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              <div style={{ width: SIDEBAR_WIDTH }} className="shrink-0 px-3 py-2">Línea / Pilar</div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${months.length || 1}, 1fr)` }}>
                {months.map(m => (
                  <div key={m} className={`px-2 py-2 border-l ${m === todayIdx ? 'text-red-500 font-semibold' : ''}`}>
                    {monthLabel(m)}{m === todayIdx && <span className="ml-1">●</span>}
                  </div>
                ))}
              </div>
            </div>

            {months.length > 0 && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-400 z-10 pointer-events-none"
                style={{ left: `calc(${SIDEBAR_WIDTH}px + (100% - ${SIDEBAR_WIDTH}px) * ${Math.min(Math.max(currentMonthFrac, 0), 1)})` }}
              />
            )}

            {visibleObjetivos.map(objetivo => {
              const colors = OBJETIVO_COLOR_CLASSES[objetivo.color];
              const Icon = PILAR_ICONS[objetivo.pilar.toLowerCase()] || Target;
              const stats = pilarStats.get(objetivo.id);
              const avg = stats && stats.count > 0 ? Math.round(stats.sum / stats.count) : 0;
              const pilarProjects = activeProjects.filter(p => p.objetivo_estrategico_id === objetivo.id);

              return (
                <div key={objetivo.id} className="flex border-b last:border-b-0">
                  <div style={{ width: SIDEBAR_WIDTH }} className="shrink-0 px-3 py-3 flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${colors?.iconBg}`}>
                      <Icon className={`h-4 w-4 ${colors?.iconText}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{objetivo.pilar}</p>
                      <p className="text-[10px] text-muted-foreground truncate" title={objetivo.nombre}>{objetivo.nombre}</p>
                    </div>
                    <div className={`ml-auto shrink-0 h-9 w-9 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold ${colors?.text}`} style={{ borderColor: 'currentColor' }}>
                      {avg}%
                    </div>
                  </div>

                  <div className="flex-1 py-2 px-1 space-y-1.5 min-h-[3.5rem]">
                    {pilarProjects.length === 0 ? (
                      <div className="h-full flex items-center px-2 text-sm text-muted-foreground italic">
                        Sin proyectos activos en la ventana.
                      </div>
                    ) : (
                      pilarProjects.map(p => {
                        const startIdx = p.start_date ? monthIndex(p.start_date) : months[0];
                        const endIdx = p.isAtrasado ? todayIdx : (p.end_date ? monthIndex(p.end_date) : startIdx);
                        const colStart = Math.max(1, startIdx - months[0] + 1);
                        const colEnd = Math.min(months.length, Math.max(colStart, endIdx - months[0] + 1)) + 1;
                        const pct = progressOf(p, false);
                        const barColorClass = p.isAtrasado ? 'bg-red-500' : colors?.bar;
                        const barBgClass = p.isAtrasado ? 'bg-red-100 border-red-300' : `${colors?.barBg} border-current`;

                        return (
                          <div key={p.id} className="grid h-7" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
                            <div
                              style={{ gridColumn: `${colStart} / ${colEnd}` }}
                              className={`relative h-7 rounded-full border ${barBgClass} ${p.isAtrasado ? 'text-red-600' : colors?.text} overflow-hidden flex items-center`}
                              title={p.name}
                            >
                              <div className={`absolute inset-y-0 left-0 rounded-full ${barColorClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              <span className="relative z-[1] px-2.5 text-xs font-medium text-foreground truncate max-w-[70%]">{p.name}</span>
                              <span className="relative z-[1] ml-auto mr-2 text-[11px] font-semibold text-foreground shrink-0">{pct}%</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Cada barra es un proyecto y se extiende desde su mes de inicio hasta su mes de fin; las barras se apilan en carriles para no traslaparse.
        La línea roja punteada marca el mes actual. Si un proyecto pasa su fin sin culminar, su barra se vuelve roja y se estira hasta hoy, sumando su % de tiempo extra.
        Al llegar a la etapa de Cierre, el proyecto sale del lienzo y pasa al histórico.
      </p>

      <div className="rounded-lg border">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Histórico de proyectos culminados</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Consulta permanente · Solo lectura</p>
          </div>
          <Badge variant="secondary" className="ml-auto">{culminadoProjects.length} proyectos</Badge>
        </div>
        <div className="divide-y">
          {culminadoProjects.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">Aún no hay proyectos culminados.</p>
          ) : (
            culminadoProjects.map(p => {
              const objetivo = p.objetivo_estrategico_id ? objetivos.find(o => o.id === p.objetivo_estrategico_id) : undefined;
              const periodo = p.start_date && p.end_date
                ? `${shortMonthLabel(monthIndex(p.start_date))}–${shortMonthLabel(monthIndex(p.end_date))}`
                : '-';
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {objetivo?.pilar || 'Sin objetivo'}{p.responsible ? ` · ${p.responsible}` : ''}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">Período</p>
                      <p className="text-xs">{periodo}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Culminado</Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, valueClass, hint }: { label: string; value: string | number; valueClass: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
