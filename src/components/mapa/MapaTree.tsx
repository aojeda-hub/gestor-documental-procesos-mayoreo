import { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, Lock, Plus, AlertTriangle, ExternalLink, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SILO_LABELS } from '@/types/database';
import type { SiloType } from '@/types/database';
import { useUpdateMapaDocs } from '@/hooks/useMapaProcesos';
import type { MapaDoc, MapaDocPatch } from '@/hooks/useMapaProcesos';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { EstatusProgress, EstatusSelect } from './EstatusWidgets';
import { TIPO_LABEL, countEstatus, fmtFecha, isRevisionVencida, joinCodigo, naturalCompare } from './mapaUtils';
import type { EstatusCounts } from './mapaUtils';

type Level = 'silo' | 'macro' | 'proceso' | 'subproceso';
const LEVELS: Level[] = ['silo', 'macro', 'proceso', 'subproceso'];
const LEVEL_LABEL: Record<Level, string> = { silo: 'Silo', macro: 'Macroproceso', proceso: 'Proceso', subproceso: 'Subproceso' };

interface Node {
  key: string;
  level: Level;
  label: string;
  sortKey: string;
  counts: EstatusCounts;
  children: Node[];
  docs: MapaDoc[];
  /** Ubicación que heredaría un documento nuevo creado en este nodo. */
  location: Partial<MapaDoc>;
}

function groupKey(level: Level, d: MapaDoc): { id: string; label: string; sort: string; loc: Partial<MapaDoc> } {
  switch (level) {
    case 'silo':
      return { id: d.silo, label: SILO_LABELS[d.silo], sort: SILO_LABELS[d.silo], loc: { silo: d.silo } };
    case 'macro':
      return {
        id: `${d.macroproceso_codigo ?? ''}|${(d.macroproceso ?? '').trim().toLowerCase()}`,
        label: joinCodigo(d.macroproceso_codigo, d.macroproceso, 'Sin macroproceso'),
        sort: `${d.macroproceso_codigo ?? '~'} ${d.macroproceso ?? ''}`,
        loc: { macroproceso_codigo: d.macroproceso_codigo, macroproceso: d.macroproceso, subarea: d.subarea },
      };
    case 'proceso':
      return {
        id: `${d.proceso_codigo ?? ''}|${(d.proceso ?? '').trim().toLowerCase()}`,
        label: joinCodigo(d.proceso_codigo, d.proceso, 'Sin proceso'),
        sort: `${d.proceso_codigo ?? '~'} ${d.proceso ?? ''}`,
        loc: { proceso_codigo: d.proceso_codigo, proceso: d.proceso },
      };
    case 'subproceso':
      return {
        id: `${d.subproceso_codigo ?? ''}|${(d.subproceso ?? '').trim().toLowerCase()}`,
        label: joinCodigo(d.subproceso_codigo, d.subproceso, 'Sin subproceso'),
        sort: `${d.subproceso_codigo ?? '~'} ${d.subproceso ?? ''}`,
        loc: { subproceso_codigo: d.subproceso_codigo, subproceso: d.subproceso },
      };
  }
}

function build(docs: MapaDoc[], depth: number, parentKey: string, parentLoc: Partial<MapaDoc>, ordenMap: Map<string, number>): Node[] {
  const level = LEVELS[depth];
  const groups = new Map<string, { label: string; sort: string; loc: Partial<MapaDoc>; docs: MapaDoc[] }>();
  for (const d of docs) {
    const g = groupKey(level, d);
    const cur = groups.get(g.id) ?? { label: g.label, sort: g.sort, loc: g.loc, docs: [] };
    cur.docs.push(d);
    groups.set(g.id, cur);
  }
  return [...groups.entries()]
    .map(([id, g]) => {
      const key = `${parentKey}/${id}`;
      const location = { ...parentLoc, ...g.loc };
      const isLeaf = depth === LEVELS.length - 1;
      return {
        key, level, label: g.label, sortKey: g.sort, counts: countEstatus(g.docs), location,
        children: isLeaf ? [] : build(g.docs, depth + 1, key, location, ordenMap),
        docs: isLeaf ? [...g.docs].sort((a, b) => naturalCompare(a.documento_codigo, b.documento_codigo) || naturalCompare(a.title, b.title)) : [],
      };
    })
    .sort((a, b) => {
      const oa = ordenMap.get(a.key);
      const ob = ordenMap.get(b.key);
      if (oa != null && ob != null) return oa - ob;
      if (oa != null) return -1;
      if (ob != null) return 1;
      return naturalCompare(a.sortKey, b.sortKey);
    });
}

function allKeys(nodes: Node[], out: string[] = []): string[] {
  for (const n of nodes) { out.push(n.key); allKeys(n.children, out); }
  return out;
}

/** IDs de todos los documentos que caen bajo este nodo (recursivo). */
function collectDocIds(n: Node): string[] {
  if (n.docs.length) return n.docs.map(d => d.id);
  return n.children.flatMap(collectDocIds);
}

type RenamableLevel = 'macro' | 'proceso' | 'subproceso';
const CODIGO_FIELD: Record<RenamableLevel, keyof MapaDoc> = {
  macro: 'macroproceso_codigo', proceso: 'proceso_codigo', subproceso: 'subproceso_codigo',
};
const NOMBRE_FIELD: Record<RenamableLevel, keyof MapaDoc> = {
  macro: 'macroproceso', proceso: 'proceso', subproceso: 'subproceso',
};

interface Props {
  docs: MapaDoc[];
  canEdit: boolean;
  onOpenDoc: (d: MapaDoc) => void;
  onCreateAt: (loc: Partial<MapaDoc> & { silo: SiloType }) => void;
}

export default function MapaTree({ docs, canEdit, onOpenDoc, onCreateAt }: Props) {
  const { user } = useAuth();
  const [ordenMap, setOrdenMap] = useState<Map<string, number>>(new Map());
  const tree = useMemo(() => build(docs, 0, '', {}, ordenMap), [docs, ordenMap]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<Node | null>(null);
  const [rCodigo, setRCodigo] = useState('');
  const [rNombre, setRNombre] = useState('');
  const update = useUpdateMapaDocs();
  const { toast } = useToast();

  useEffect(() => {
    supabase.from('mapa_orden').select('node_key, orden').then(({ data }) => {
      setOrdenMap(new Map((data || []).map(r => [r.node_key, r.orden])));
    });
  }, []);

  const toggle = (k: string) => setOpen(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const expandTo = (depth: number) => {
    const keys: string[] = [];
    const walk = (ns: Node[], d: number) => ns.forEach(n => { if (d < depth) { keys.push(n.key); walk(n.children, d + 1); } });
    walk(tree, 0);
    setOpen(new Set(keys));
  };

  const setEstatus = (d: MapaDoc, estatus: MapaDoc['estatus']) =>
    update.mutate({ ids: [d.id], patch: { estatus } }, {
      onError: e => toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' }),
    });

  const moveNode = useCallback(async (siblings: Node[], index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[j]] = [reordered[j], reordered[index]];
    const rows = reordered.map((s, idx) => ({ node_key: s.key, orden: idx * 10, updated_by: user?.id || null }));
    setOrdenMap(prev => {
      const next = new Map(prev);
      rows.forEach(r => next.set(r.node_key, r.orden));
      return next;
    });
    const { error } = await supabase.from('mapa_orden').upsert(rows, { onConflict: 'node_key' });
    if (error) toast({ title: 'No se pudo guardar el orden', description: error.message, variant: 'destructive' });
  }, [user, toast]);

  const startRename = (n: Node) => {
    const level = n.level as RenamableLevel;
    setRCodigo((n.location[CODIGO_FIELD[level]] as string | null) ?? '');
    setRNombre((n.location[NOMBRE_FIELD[level]] as string | null) ?? '');
    setRenaming(n);
  };

  const saveRename = () => {
    if (!renaming) return;
    const level = renaming.level as RenamableLevel;
    const ids = collectDocIds(renaming);
    const patch: MapaDocPatch = {
      [CODIGO_FIELD[level]]: rCodigo.trim() || null,
      [NOMBRE_FIELD[level]]: rNombre.trim() || null,
    };
    update.mutate({ ids, patch }, {
      onSuccess: () => { toast({ title: `${LEVEL_LABEL[level]} actualizado en ${ids.length} documento(s)` }); setRenaming(null); },
      onError: e => toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' }),
    });
  };

  const renderNode = (n: Node, depth: number, siblings: Node[], index: number) => {
    const isOpen = open.has(n.key);
    return (
      <div key={n.key}>
        <div
          className={cn(
            'group grid cursor-pointer grid-cols-[1fr_minmax(140px,260px)] items-center gap-4 border-b px-3 py-2 hover:bg-accent/50',
            depth === 0 && 'bg-muted/40 font-semibold',
          )}
          style={{ paddingLeft: 12 + depth * 20 }}
          onClick={() => toggle(n.key)}
        >
          <div className="flex min-w-0 items-center gap-2">
            <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{LEVEL_LABEL[n.level]}</span>
            <span className={cn('truncate', depth > 0 && 'text-sm')}>{n.label}</span>
            {n.location.subarea && n.level === 'macro' && (
              <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{n.location.subarea}</span>
            )}
            {canEdit && (
              <span className="flex items-center opacity-0 group-hover:opacity-100">
                <Button
                  variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === 0}
                  onClick={e => { e.stopPropagation(); moveNode(siblings, index, -1); }}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === siblings.length - 1}
                  onClick={e => { e.stopPropagation(); moveNode(siblings, index, 1); }}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </span>
            )}
            {canEdit && n.level !== 'silo' && (
              <Button
                variant="ghost" size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={e => { e.stopPropagation(); startRename(n); }}
                title={`Editar ${LEVEL_LABEL[n.level].toLowerCase()}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {canEdit && n.level === 'subproceso' && (
              <Button
                variant="ghost" size="sm"
                className="ml-1 h-6 px-2 text-xs opacity-0 group-hover:opacity-100"
                onClick={e => { e.stopPropagation(); onCreateAt(n.location as Partial<MapaDoc> & { silo: SiloType }); }}
              >
                <Plus className="mr-1 h-3 w-3" /> Documento
              </Button>
            )}
          </div>
          <EstatusProgress counts={n.counts} />
        </div>
        {isOpen && (
          <>
            {n.children.map((c, i) => renderNode(c, depth + 1, n.children, i))}
            {n.docs.map(d => (
              <div
                key={d.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b bg-background px-3 py-1.5 text-sm hover:bg-accent/30"
                style={{ paddingLeft: 12 + (depth + 1) * 20 + 22 }}
              >
                <button className="flex min-w-0 items-center gap-2 text-left" onClick={() => onOpenDoc(d)}>
                  <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{d.documento_codigo ?? '—'}</span>
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">{TIPO_LABEL[d.doc_type]}</span>
                  {d.confidential && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  <span className="truncate hover:text-primary hover:underline">{d.title}</span>
                </button>
                <div className="flex items-center gap-2">
                  {d.drive_link && (
                    <a
                      href={d.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded bg-green-500/5 px-1.5 py-0.5 text-[10px] font-medium text-green-600 hover:bg-green-500/10 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Drive
                    </a>
                  )}
                  {isRevisionVencida(d) && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" aria-label="Requiere revisión" />}
                  <span className="w-20 text-right text-xs text-muted-foreground tabular-nums">{fmtFecha(d.fecha_actualizacion)}</span>
                  <EstatusSelect value={d.estatus} disabled={!canEdit} onChange={v => setEstatus(d, v)} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Expandir hasta:</span>
        {LEVELS.map((l, i) => (
          <Button key={l} variant="outline" size="sm" className="h-7 text-xs" onClick={() => expandTo(i + 1)}>{LEVEL_LABEL[l]}</Button>
        ))}
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(new Set(allKeys(tree)))}>
          <ChevronsUpDown className="mr-1 h-3.5 w-3.5" /> Todo
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(new Set())}>
          <ChevronsDownUp className="mr-1 h-3.5 w-3.5" /> Contraer
        </Button>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">Barra · % aprobado · documentos</span>
      </div>
      <div className="overflow-hidden rounded-lg border">
        {tree.length === 0
          ? <p className="py-10 text-center text-sm text-muted-foreground">No hay documentos con estos filtros.</p>
          : tree.map((n, i) => renderNode(n, 0, tree, i))}
      </div>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar {renaming ? LEVEL_LABEL[renaming.level].toLowerCase() : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input className="font-mono" value={rCodigo} onChange={e => setRCodigo(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={rNombre} onChange={e => setRNombre(e.target.value)} />
            </div>
            {renaming && (
              <p className="text-xs text-muted-foreground">
                Se actualizará en {collectDocIds(renaming).length} documento(s) que comparten este {LEVEL_LABEL[renaming.level].toLowerCase()}.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>Cancelar</Button>
            <Button onClick={saveRename} disabled={update.isPending}>{update.isPending ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
