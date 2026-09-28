import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, FileSpreadsheet, FileText, ListFilter, Loader2, Network, Plus, Search, Table2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { SILO_LABELS } from '@/types/database';
import type { DocType, DocumentEstatus, SiloType } from '@/types/database';
import { useMapaDocs } from '@/hooks/useMapaProcesos';
import type { MapaDoc } from '@/hooks/useMapaProcesos';
import MapaGrid from '@/components/mapa/MapaGrid';
import MapaTree from '@/components/mapa/MapaTree';
import MapaDocDialog from '@/components/mapa/MapaDocDialog';
import { EstatusBadge, EstatusLegend, EstatusProgress } from '@/components/mapa/EstatusWidgets';
import {
  ESTATUS_FLOW, TIPO_LABEL, TIPOS_MAPA, countEstatus, exportMapaExcel, isEnMapa, isRevisionVencida, joinCodigo, naturalCompare, pctAprobado,
} from '@/components/mapa/mapaUtils';

const ALL = '__all__';

function Kpi({ icon: Icon, label, value, hint, tone, onClick, active }: {
  icon: typeof FileText; label: string; value: string | number; hint?: string;
  tone: string; onClick?: () => void; active?: boolean;
}) {
  return (
    <Card
      className={cn('transition-colors', onClick && 'cursor-pointer hover:border-primary/50', active && 'border-primary ring-1 ring-primary')}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', tone)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none tabular-nums">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
          {hint && <p className="truncate text-[11px] text-muted-foreground/80">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MapaProcesos() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin') || hasRole('editor') || hasRole('responsable_metodos');
  const { data: allDocs = [], isLoading, error } = useMapaDocs();

  const [search, setSearch] = useState('');
  const [silo, setSilo] = useState<string>(ALL);
  const [macro, setMacro] = useState<string>(ALL);
  const [tipo, setTipo] = useState<string>(ALL);
  const [estatus, setEstatus] = useState<Set<DocumentEstatus>>(new Set());
  const [soloVencidos, setSoloVencidos] = useState(false);
  const [incluirSinUbicar, setIncluirSinUbicar] = useState(false);
  const [tab, setTab] = useState('tabla');

  const [dialog, setDialog] = useState<{ open: boolean; doc: MapaDoc | null; initial?: Partial<MapaDoc> }>({ open: false, doc: null });

  const enMapa = useMemo(() => allDocs.filter(isEnMapa), [allDocs]);
  const base = incluirSinUbicar ? allDocs : enMapa;
  const sinUbicar = allDocs.length - enMapa.length;

  const macrosDelSilo = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of enMapa) {
      if (silo !== ALL && d.silo !== silo) continue;
      if (!d.macroproceso) continue;
      const k = `${d.macroproceso_codigo ?? ''}|${d.macroproceso}`;
      m.set(k, joinCodigo(d.macroproceso_codigo, d.macroproceso));
    }
    return [...m.entries()].sort((a, b) => naturalCompare(a[1], b[1]));
  }, [enMapa, silo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter(d => {
      if (silo !== ALL && d.silo !== silo) return false;
      if (macro !== ALL && `${d.macroproceso_codigo ?? ''}|${d.macroproceso}` !== macro) return false;
      if (tipo !== ALL && d.doc_type !== tipo) return false;
      if (estatus.size && !estatus.has(d.estatus)) return false;
      if (soloVencidos && !isRevisionVencida(d)) return false;
      if (q) {
        const hay = [d.title, d.codigo, d.macroproceso, d.proceso, d.subproceso, d.observaciones, d.subarea]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [base, silo, macro, tipo, estatus, soloVencidos, search]);

  // KPIs sobre el alcance del silo elegido (no sobre los demás filtros, para que sirvan de atajo)
  const scope = useMemo(() => (silo === ALL ? enMapa : enMapa.filter(d => d.silo === silo)), [enMapa, silo]);
  const scopeCounts = useMemo(() => countEstatus(scope), [scope]);
  const vencidos = useMemo(() => scope.filter(d => isRevisionVencida(d)).length, [scope]);
  const enCurso = scopeCounts.en_construccion + scopeCounts.revision + scopeCounts.por_aprobar;

  const siloResumen = useMemo(() => {
    const by = new Map<SiloType, MapaDoc[]>();
    for (const d of enMapa) by.set(d.silo, [...(by.get(d.silo) ?? []), d]);
    return [...by.entries()]
      .map(([s, docs]) => ({ silo: s, counts: countEstatus(docs), vencidos: docs.filter(d => isRevisionVencida(d)).length }))
      .sort((a, b) => naturalCompare(SILO_LABELS[a.silo], SILO_LABELS[b.silo]));
  }, [enMapa]);

  const toggleEstatus = (s: DocumentEstatus) => setEstatus(prev => {
    const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n;
  });
  const setEstatusOnly = (list: DocumentEstatus[]) => {
    setSoloVencidos(false);
    setEstatus(prev => (list.length === prev.size && list.every(s => prev.has(s)) ? new Set() : new Set(list)));
  };
  const pickSilo = (s: string) => { setSilo(s); setMacro(ALL); };

  const hayFiltros = search || silo !== ALL || macro !== ALL || tipo !== ALL || estatus.size > 0 || soloVencidos;
  const limpiar = () => { setSearch(''); pickSilo(ALL); setTipo(ALL); setEstatus(new Set()); setSoloVencidos(false); };

  const openNew = (initial?: Partial<MapaDoc>) => setDialog({ open: true, doc: null, initial });
  const defaultSilo = (silo !== ALL ? silo : 'logistica') as SiloType;

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando mapa de procesos…</div>;
  }
  if (error) {
    return <p className="text-destructive">No se pudo cargar el mapa: {(error as Error).message}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mapa de Procesos</h1>
          <p className="text-sm text-muted-foreground">
            Estado de la documentación por silo, macroproceso, proceso y subproceso. {enMapa.length} documentos en el mapa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportMapaExcel(filtered, silo !== ALL ? `Mapa_${SILO_LABELS[silo as SiloType]}` : 'Mapa_de_procesos_Mayoreo')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
          {canEdit && (
            <Button onClick={() => openNew(silo !== ALL ? { silo: silo as SiloType } : undefined)}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo documento
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={FileText} label={silo === ALL ? 'Documentos en el mapa' : `Documentos · ${SILO_LABELS[silo as SiloType]}`} value={scope.length}
          tone="bg-primary/10 text-primary" onClick={() => { setEstatus(new Set()); setSoloVencidos(false); }} />
        <Kpi icon={CheckCircle2} label="Aprobados" value={`${pctAprobado(scopeCounts)}%`} hint={`${scopeCounts.aprobado} documentos`}
          tone="bg-emerald-500/15 text-emerald-600" onClick={() => setEstatusOnly(['aprobado'])} active={estatus.size === 1 && estatus.has('aprobado')} />
        <Kpi icon={Clock} label="En curso" value={enCurso} hint="Construcción · revisión · por aprobar"
          tone="bg-amber-500/15 text-amber-600" onClick={() => setEstatusOnly(['en_construccion', 'revision', 'por_aprobar'])}
          active={estatus.size === 3 && estatus.has('revision')} />
        <Kpi icon={FileText} label="Por iniciar" value={scopeCounts.por_iniciar}
          tone="bg-slate-500/15 text-slate-600" onClick={() => setEstatusOnly(['por_iniciar'])} active={estatus.size === 1 && estatus.has('por_iniciar')} />
        <Kpi icon={AlertTriangle} label="Desactualizados" value={scopeCounts.desactualizado}
          tone="bg-orange-500/15 text-orange-600" onClick={() => setEstatusOnly(['desactualizado'])} active={estatus.size === 1 && estatus.has('desactualizado')} />
        <Kpi icon={AlertTriangle} label="Revisión vencida" value={vencidos} hint="Aprobados hace más de 1 año"
          tone="bg-red-500/15 text-red-600" onClick={() => { setEstatus(new Set()); setSoloVencidos(v => !v); }} active={soloVencidos} />
      </div>

      {/* Avance por silo */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Avance por silo</h2>
            <EstatusLegend />
          </div>
          <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
            {siloResumen.map(r => (
              <button
                key={r.silo}
                onClick={() => pickSilo(silo === r.silo ? ALL : r.silo)}
                className={cn('grid grid-cols-[110px_1fr] items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-accent',
                  silo === r.silo && 'bg-accent ring-1 ring-primary/40')}
              >
                <span className="truncate text-sm font-medium">
                  {SILO_LABELS[r.silo]}
                  {r.vencidos > 0 && <span className="ml-1 text-[10px] text-red-600">({r.vencidos} venc.)</span>}
                </span>
                <EstatusProgress counts={r.counts} />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nombre, código, proceso u observación…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={silo} onValueChange={pickSilo}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los silos</SelectItem>
            {siloResumen.map(r => <SelectItem key={r.silo} value={r.silo}>{SILO_LABELS[r.silo]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={macro} onValueChange={setMacro}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Macroproceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los macroprocesos</SelectItem>
            {macrosDelSilo.map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los tipos</SelectItem>
            {TIPOS_MAPA.map(t => <SelectItem key={t} value={t}>{TIPO_LABEL[t as DocType]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <ListFilter className="mr-1.5 h-4 w-4" /> Estatus
              {estatus.size > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{estatus.size}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 p-2">
            {ESTATUS_FLOW.map(s => (
              <label key={s} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent">
                <Checkbox checked={estatus.has(s)} onCheckedChange={() => toggleEstatus(s)} />
                <EstatusBadge estatus={s} />
                <span className="ml-auto font-mono text-xs text-muted-foreground">{scopeCounts[s]}</span>
              </label>
            ))}
          </PopoverContent>
        </Popover>
        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiar}><X className="mr-1 h-4 w-4" /> Limpiar</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="tabla"><Table2 className="mr-1.5 h-4 w-4" /> Tabla</TabsTrigger>
            <TabsTrigger value="arbol"><Network className="mr-1.5 h-4 w-4" /> Árbol de procesos</TabsTrigger>
          </TabsList>
          {sinUbicar > 0 && (
            <div className="flex items-center gap-2">
              <Switch id="sin-ubicar" checked={incluirSinUbicar} onCheckedChange={setIncluirSinUbicar} />
              <Label htmlFor="sin-ubicar" className="text-sm font-normal text-muted-foreground">
                Incluir documentos sin ubicar en el mapa
              </Label>
            </div>
          )}
        </div>
        <TabsContent value="tabla" className="mt-4">
          <MapaGrid docs={filtered} canEdit={canEdit} onOpenDoc={d => setDialog({ open: true, doc: d })} />
        </TabsContent>
        <TabsContent value="arbol" className="mt-4">
          <MapaTree docs={filtered} canEdit={canEdit} onOpenDoc={d => setDialog({ open: true, doc: d })} onCreateAt={loc => openNew(loc)} />
        </TabsContent>
      </Tabs>

      <MapaDocDialog
        open={dialog.open}
        onOpenChange={o => setDialog(s => ({ ...s, open: o }))}
        doc={dialog.doc}
        initial={dialog.initial}
        defaultSilo={defaultSilo}
        allDocs={allDocs}
        canEdit={canEdit}
      />
    </div>
  );
}
