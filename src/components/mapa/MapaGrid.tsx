import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Lock, Pencil, CalendarCheck, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SILO_LABELS } from '@/types/database';
import type { DocumentEstatus } from '@/types/database';
import { useUpdateMapaDocs } from '@/hooks/useMapaProcesos';
import type { MapaDoc, MapaDocPatch } from '@/hooks/useMapaProcesos';
import { EstatusBadge, EstatusSelect } from './EstatusWidgets';
import { ESTATUS_FLOW, TIPO_LABEL, fmtFecha, isRevisionVencida, joinCodigo, naturalCompare } from './mapaUtils';

type SortKey = 'codigo' | 'silo' | 'macroproceso' | 'proceso' | 'subproceso' | 'tipo' | 'title' | 'estatus' | 'fecha';

const SORTERS: Record<SortKey, (a: MapaDoc, b: MapaDoc) => number> = {
  codigo: (a, b) => naturalCompare(a.codigo, b.codigo) || naturalCompare(a.title, b.title),
  silo: (a, b) => naturalCompare(SILO_LABELS[a.silo], SILO_LABELS[b.silo]),
  macroproceso: (a, b) => naturalCompare(a.macroproceso_codigo, b.macroproceso_codigo) || naturalCompare(a.macroproceso, b.macroproceso),
  proceso: (a, b) => naturalCompare(a.proceso_codigo, b.proceso_codigo) || naturalCompare(a.proceso, b.proceso),
  subproceso: (a, b) => naturalCompare(a.subproceso_codigo, b.subproceso_codigo) || naturalCompare(a.subproceso, b.subproceso),
  tipo: (a, b) => naturalCompare(TIPO_LABEL[a.doc_type], TIPO_LABEL[b.doc_type]),
  title: (a, b) => naturalCompare(a.title, b.title),
  estatus: (a, b) => ESTATUS_FLOW.indexOf(a.estatus) - ESTATUS_FLOW.indexOf(b.estatus),
  fecha: (a, b) => naturalCompare(a.fecha_actualizacion, b.fecha_actualizacion),
};

const PAGE_SIZE = 100;

interface Props {
  docs: MapaDoc[];
  canEdit: boolean;
  onOpenDoc: (d: MapaDoc) => void;
}

export default function MapaGrid({ docs, canEdit, onOpenDoc }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'codigo', asc: true });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const update = useUpdateMapaDocs();
  const { toast } = useToast();

  const sorted = useMemo(() => {
    const s = [...docs].sort(SORTERS[sort.key]);
    return sort.asc ? s : s.reverse();
  }, [docs, sort]);

  // Si cambian los filtros, volver a la primera página y limpiar selección de filas que ya no se ven
  useEffect(() => { setPage(0); }, [docs.length]);
  useEffect(() => {
    const visible = new Set(docs.map(d => d.id));
    setSelected(prev => new Set([...prev].filter(id => visible.has(id))));
  }, [docs]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const rows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allPageSelected = rows.length > 0 && rows.every(r => selected.has(r.id));

  const save = (ids: string[], patch: MapaDocPatch, msg?: string) =>
    update.mutate({ ids, patch }, {
      onSuccess: () => msg && toast({ title: msg }),
      onError: e => toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' }),
    });

  const toggleSort = (key: SortKey) => setSort(s => ({ key, asc: s.key === key ? !s.asc : true }));
  const toggleRow = (id: string) => setSelected(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });
  const togglePage = () => setSelected(prev => {
    const n = new Set(prev); rows.forEach(r => (allPageSelected ? n.delete(r.id) : n.add(r.id))); return n;
  });

  const bulkEstatus = (estatus: DocumentEstatus) => {
    const ids = [...selected];
    save(ids, { estatus }, `${ids.length} documento(s) actualizados`);
  };
  const bulkHoy = () => {
    const ids = [...selected];
    save(ids, { fecha_actualizacion: format(new Date(), 'yyyy-MM-dd') }, `Fecha actualizada en ${ids.length} documento(s)`);
  };

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn('cursor-pointer select-none whitespace-nowrap', className)} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sort.key === k && (sort.asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-3">
      {canEdit && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} seleccionado(s)</span>
          <Select onValueChange={v => bulkEstatus(v as DocumentEstatus)}>
            <SelectTrigger className="h-8 w-[190px] bg-background"><SelectValue placeholder="Cambiar estatus a…" /></SelectTrigger>
            <SelectContent>
              {ESTATUS_FLOW.map(s => <SelectItem key={s} value={s}><EstatusBadge estatus={s} /></SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 bg-background" onClick={bulkHoy}>
            <CalendarCheck className="mr-1.5 h-4 w-4" /> Fecha de actualización: hoy
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto h-8" onClick={() => setSelected(new Set())}>
            <X className="mr-1 h-4 w-4" /> Limpiar
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="bg-muted/40">
              {canEdit && (
                <TableHead className="w-8"><Checkbox checked={allPageSelected} onCheckedChange={togglePage} aria-label="Seleccionar página" /></TableHead>
              )}
              <Th k="codigo">Código</Th>
              <Th k="silo">Silo</Th>
              <Th k="macroproceso">Macroproceso</Th>
              <Th k="proceso">Proceso</Th>
              <Th k="subproceso">Subproceso</Th>
              <Th k="tipo">Tipo</Th>
              <Th k="title" className="min-w-[220px]">Documento</Th>
              <Th k="estatus">Estatus</Th>
              <Th k="fecha">Últ. actualización</Th>
              <TableHead className="min-w-[200px]">Observaciones</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={12} className="py-10 text-center text-muted-foreground">No hay documentos con estos filtros.</TableCell></TableRow>
            )}
            {rows.map(d => (
              <TableRow key={d.id} data-state={selected.has(d.id) ? 'selected' : undefined} className="align-top">
                {canEdit && (
                  <TableCell className="py-2"><Checkbox checked={selected.has(d.id)} onCheckedChange={() => toggleRow(d.id)} /></TableCell>
                )}
                <TableCell className="whitespace-nowrap py-2 font-mono text-xs">{d.codigo ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="whitespace-nowrap py-2 text-xs">
                  {SILO_LABELS[d.silo]}
                  {d.subarea && <div className="text-[11px] text-muted-foreground">{d.subarea}</div>}
                </TableCell>
                <TableCell className="max-w-[180px] py-2 text-xs">{joinCodigo(d.macroproceso_codigo, d.macroproceso, '—')}</TableCell>
                <TableCell className="max-w-[180px] py-2 text-xs">{joinCodigo(d.proceso_codigo, d.proceso, '—')}</TableCell>
                <TableCell className="max-w-[180px] py-2 text-xs">{joinCodigo(d.subproceso_codigo, d.subproceso, '—')}</TableCell>
                <TableCell className="whitespace-nowrap py-2 text-xs">{TIPO_LABEL[d.doc_type]}</TableCell>
                <TableCell className="py-2">
                  <button className="text-left font-medium hover:text-primary hover:underline" onClick={() => onOpenDoc(d)}>
                    {d.confidential && <Lock className="mr-1 inline h-3 w-3 text-muted-foreground" />}
                    {d.title}
                  </button>
                </TableCell>
                <TableCell className="py-1">
                  <EstatusSelect value={d.estatus} disabled={!canEdit} onChange={v => save([d.id], { estatus: v })} />
                </TableCell>
                <TableCell className="py-1">
                  <div className="flex items-center gap-1">
                    {canEdit ? (
                      <Input
                        type="date"
                        className="h-7 w-[132px] border-transparent bg-transparent px-1 text-xs hover:border-input"
                        defaultValue={d.fecha_actualizacion ?? ''}
                        key={`${d.id}-${d.fecha_actualizacion}`}
                        onBlur={e => {
                          const v = e.target.value || null;
                          if (v !== (d.fecha_actualizacion ?? null)) save([d.id], { fecha_actualizacion: v });
                        }}
                      />
                    ) : (
                      <span className="text-xs">{fmtFecha(d.fecha_actualizacion)}</span>
                    )}
                    {isRevisionVencida(d) && (
                      <Tooltip>
                        <TooltipTrigger><AlertTriangle className="h-3.5 w-3.5 text-orange-500" /></TooltipTrigger>
                        <TooltipContent className="text-xs">Aprobado hace más de 1 año: requiere revisión</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1">
                  {canEdit ? (
                    <Input
                      className="h-7 border-transparent bg-transparent px-1 text-xs hover:border-input"
                      defaultValue={d.observaciones ?? ''}
                      key={`${d.id}-${d.observaciones}`}
                      placeholder="—"
                      onBlur={e => {
                        const v = e.target.value.trim() || null;
                        if (v !== (d.observaciones ?? null)) save([d.id], { observaciones: v });
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">{d.observaciones}</span>
                  )}
                </TableCell>
                <TableCell className="py-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenDoc(d)} aria-label="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{sorted.length} documento(s)</span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Página {page + 1} de {pages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
