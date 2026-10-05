import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import { SILO_LABELS } from '@/types/database';
import type { DocType, DocumentEstatus, SiloType } from '@/types/database';
import { useCreateMapaDoc, useEstatusHistorial, useUpdateMapaDocs } from '@/hooks/useMapaProcesos';
import type { MapaDoc, MapaDocPatch } from '@/hooks/useMapaProcesos';
import { EstatusBadge, EstatusSelect } from './EstatusWidgets';
import { TIPO_LABEL, TIPOS_MAPA } from './mapaUtils';

const SILOS_MAPA: SiloType[] = ['logistica', 'personal', 'compras', 'ventas', 'mercadeo', 'control', 'sistemas', 'procesos', 'datos_maestros'];

type Form = {
  title: string; doc_type: DocType; silo: SiloType; estatus: DocumentEstatus;
  subarea: string; macroproceso_codigo: string; macroproceso: string; mapeo_sistemico: string;
  proceso_codigo: string; proceso: string; subproceso_codigo: string; subproceso: string;
  documento_codigo: string; fecha_actualizacion: string; observaciones: string; drive_link: string;
};

const TEXT_FIELDS = ['subarea', 'macroproceso_codigo', 'macroproceso', 'mapeo_sistemico', 'proceso_codigo', 'proceso',
  'subproceso_codigo', 'subproceso', 'documento_codigo', 'fecha_actualizacion', 'observaciones', 'drive_link'] as const;

function toForm(d: Partial<MapaDoc> | null, silo: SiloType): Form {
  return {
    title: d?.title ?? '', doc_type: d?.doc_type ?? 'procedimiento', silo: d?.silo ?? silo,
    estatus: d?.estatus ?? 'por_iniciar',
    ...Object.fromEntries(TEXT_FIELDS.map(k => [k, (d?.[k] as string | null | undefined) ?? ''])),
  } as Form;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Documento a editar; null = nuevo. `initial` precarga la ubicación al crear desde el árbol. */
  doc: MapaDoc | null;
  initial?: Partial<MapaDoc>;
  defaultSilo: SiloType;
  allDocs: MapaDoc[];
  canEdit: boolean;
}

export default function MapaDocDialog({ open, onOpenChange, doc, initial, defaultSilo, allDocs, canEdit }: Props) {
  const [f, setF] = useState<Form>(() => toForm(doc ?? initial ?? null, defaultSilo));
  const { toast } = useToast();
  const { user } = useAuth();
  const update = useUpdateMapaDocs();
  const create = useCreateMapaDoc();
  const historial = useEstatusHistorial(open && doc ? doc.id : null);
  const users = useUserDirectory();

  useEffect(() => {
    if (open) setF(toForm(doc ?? initial ?? null, defaultSilo));
  }, [open, doc, initial, defaultSilo]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(prev => ({ ...prev, [k]: v }));

  // Sugerencias a partir de lo que ya existe en el silo
  const sugerencias = useMemo(() => {
    const siloDocs = allDocs.filter(d => d.silo === f.silo);
    const macros = new Map<string, string>();
    const procesos = new Map<string, string>();
    const subprocesos = new Map<string, string>();
    for (const d of siloDocs) {
      if (d.macroproceso_codigo && d.macroproceso) macros.set(d.macroproceso_codigo, d.macroproceso);
      if (d.macroproceso_codigo === f.macroproceso_codigo && d.proceso_codigo && d.proceso) procesos.set(d.proceso_codigo, d.proceso);
      if (d.macroproceso_codigo === f.macroproceso_codigo && d.proceso_codigo === f.proceso_codigo && d.subproceso_codigo && d.subproceso)
        subprocesos.set(d.subproceso_codigo, d.subproceso);
    }
    return { macros, procesos, subprocesos };
  }, [allDocs, f.silo, f.macroproceso_codigo, f.proceso_codigo]);

  // Al elegir un código conocido, completa su nombre
  const setCodigo = (codeKey: 'macroproceso_codigo' | 'proceso_codigo' | 'subproceso_codigo', nameKey: 'macroproceso' | 'proceso' | 'subproceso', map: Map<string, string>, v: string) => {
    setF(prev => ({ ...prev, [codeKey]: v, [nameKey]: map.get(v) ?? prev[nameKey] }));
  };

  const codigoPreview = f.macroproceso_codigo
    ? [f.macroproceso_codigo, f.proceso_codigo, f.subproceso_codigo, f.documento_codigo].filter(Boolean).join('-')
    : '';

  const save = async () => {
    if (!f.title.trim()) {
      toast({ title: 'El nombre del documento es obligatorio', variant: 'destructive' });
      return;
    }
    const patch: MapaDocPatch = {
      title: f.title.trim(), doc_type: f.doc_type, silo: f.silo, estatus: f.estatus,
      ...Object.fromEntries(TEXT_FIELDS.map(k => [k, f[k].trim() || null])),
    };
    try {
      if (doc) await update.mutateAsync({ ids: [doc.id], patch });
      else await create.mutateAsync({ ...patch, title: f.title.trim(), doc_type: f.doc_type, silo: f.silo, created_by: user?.id });
      toast({ title: doc ? 'Documento actualizado' : 'Documento creado' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const userName = (id: string | null) => (id && users.find(u => u.user_id === id)?.full_name) || 'Sistema / importación';
  const busy = update.isPending || create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
          <div>
            <DialogTitle>{doc ? 'Documento del mapa de procesos' : 'Nuevo documento en el mapa'}</DialogTitle>
            {codigoPreview && <p className="font-mono text-sm text-muted-foreground">{codigoPreview}</p>}
          </div>
          {f.drive_link && (
            <Button variant="default" size="sm" asChild>
              <a href={f.drive_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir en Drive
              </a>
            </Button>
          )}
        </DialogHeader>

        <fieldset disabled={!canEdit} className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Nombre del documento</Label>
              <Input value={f.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={f.doc_type} onValueChange={v => set('doc_type', v as DocType)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_MAPA.map(t => <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Silo</Label>
              <Select value={f.silo} onValueChange={v => set('silo', v as SiloType)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SILOS_MAPA.map(s => <SelectItem key={s} value={s}>{SILO_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subárea</Label>
              <Input value={f.subarea} onChange={e => set('subarea', e.target.value)} placeholder="Ej. CEDI - OLO" />
            </div>
            <div className="space-y-1.5">
              <Label>Estatus</Label>
              <div className="flex h-10 items-center rounded-md border px-2">
                <EstatusSelect value={f.estatus} onChange={v => set('estatus', v)} disabled={!canEdit} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Última actualización</Label>
              <Input type="date" value={f.fecha_actualizacion} onChange={e => set('fecha_actualizacion', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Enlace Google Drive</Label>
            <Input
              placeholder="https://docs.google.com/document/d/..."
              value={f.drive_link}
              onChange={e => set('drive_link', e.target.value)}
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ubicación en el mapa</p>
            <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
              <Label className="self-center text-xs">Macroproceso</Label>
              <div className="flex gap-2">
                <Input className="w-28 font-mono" list="dl-macro" placeholder="CVP06" value={f.macroproceso_codigo}
                  onChange={e => setCodigo('macroproceso_codigo', 'macroproceso', sugerencias.macros, e.target.value)} />
                <Input value={f.macroproceso} onChange={e => set('macroproceso', e.target.value)} placeholder="Nombre del macroproceso" />
              </div>
              <Label className="self-center text-xs">Proceso</Label>
              <div className="flex gap-2">
                <Input className="w-28 font-mono" list="dl-proc" placeholder="A1" value={f.proceso_codigo}
                  onChange={e => setCodigo('proceso_codigo', 'proceso', sugerencias.procesos, e.target.value)} />
                <Input value={f.proceso} onChange={e => set('proceso', e.target.value)} placeholder="Nombre del proceso" />
              </div>
              <Label className="self-center text-xs">Subproceso</Label>
              <div className="flex gap-2">
                <Input className="w-28 font-mono" list="dl-sub" placeholder="T1" value={f.subproceso_codigo}
                  onChange={e => setCodigo('subproceso_codigo', 'subproceso', sugerencias.subprocesos, e.target.value)} />
                <Input value={f.subproceso} onChange={e => set('subproceso', e.target.value)} placeholder="Nombre del subproceso" />
              </div>
              <Label className="self-center text-xs">Nro. documento</Label>
              <div className="flex gap-2">
                <Input className="w-28 font-mono" placeholder="PR01" value={f.documento_codigo} onChange={e => set('documento_codigo', e.target.value.toUpperCase())} />
                <Input value={f.mapeo_sistemico} onChange={e => set('mapeo_sistemico', e.target.value)} placeholder="Mapeo sistémico (p. ej. Diagrama)" />
              </div>
            </div>
            <datalist id="dl-macro">{[...sugerencias.macros].map(([c, n]) => <option key={c} value={c}>{n}</option>)}</datalist>
            <datalist id="dl-proc">{[...sugerencias.procesos].map(([c, n]) => <option key={c} value={c}>{n}</option>)}</datalist>
            <datalist id="dl-sub">{[...sugerencias.subprocesos].map(([c, n]) => <option key={c} value={c}>{n}</option>)}</datalist>
          </div>

          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea rows={3} value={f.observaciones} onChange={e => set('observaciones', e.target.value)} />
          </div>
        </fieldset>

        {doc && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historial de estatus</p>
            {historial.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : !historial.data?.length ? (
              <p className="text-sm text-muted-foreground">Sin cambios registrados todavía.</p>
            ) : (
              <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm">
                {historial.data.map(h => (
                  <li key={h.id} className="flex flex-wrap items-center gap-2">
                    <span className="w-32 shrink-0 text-xs text-muted-foreground">
                      {format(parseISO(h.changed_at), "dd MMM yyyy HH:mm", { locale: es })}
                    </span>
                    {h.estatus_anterior ? <EstatusBadge estatus={h.estatus_anterior} /> : <span className="text-xs text-muted-foreground">Alta</span>}
                    <span className="text-muted-foreground">→</span>
                    <EstatusBadge estatus={h.estatus_nuevo} />
                    <span className="text-xs text-muted-foreground">{userName(h.changed_by)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{canEdit ? 'Cancelar' : 'Cerrar'}</Button>
          {canEdit && <Button onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
