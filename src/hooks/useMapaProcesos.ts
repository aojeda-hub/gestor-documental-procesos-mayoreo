import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Document, DocType, DocumentEstatus, SiloType } from '@/types/database';

export type MapaDoc = Pick<
  Document,
  | 'id' | 'title' | 'doc_type' | 'silo' | 'estatus' | 'confidential' | 'drive_link' | 'updated_at'
  | 'subarea' | 'macroproceso_codigo' | 'macroproceso' | 'mapeo_sistemico'
  | 'proceso_codigo' | 'proceso' | 'subproceso_codigo' | 'subproceso'
  | 'documento_codigo' | 'codigo' | 'fecha_actualizacion' | 'observaciones'
>;

export type MapaDocPatch = Partial<Omit<MapaDoc, 'id' | 'codigo' | 'updated_at'>>;

export interface EstatusHistorial {
  id: string;
  estatus_anterior: DocumentEstatus | null;
  estatus_nuevo: DocumentEstatus;
  changed_by: string | null;
  changed_at: string;
}

const COLS =
  'id, title, doc_type, silo, estatus, confidential, drive_link, updated_at, subarea, macroproceso_codigo, macroproceso, ' +
  'mapeo_sistemico, proceso_codigo, proceso, subproceso_codigo, subproceso, documento_codigo, codigo, fecha_actualizacion, observaciones';

const KEY = ['mapa-docs'];
const PAGE = 1000;

async function fetchMapaDocs(): Promise<MapaDoc[]> {
  // PostgREST devuelve máximo 1000 filas por petición: paginamos
  const out: MapaDoc[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('documents')
      .select(COLS)
      .eq('empresa', 'mayoreo')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as MapaDoc[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export function useMapaDocs() {
  return useQuery({ queryKey: KEY, queryFn: fetchMapaDocs, staleTime: 60_000 });
}

/** Actualiza uno o varios documentos con el mismo cambio (optimista). */
export function useUpdateMapaDocs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: MapaDocPatch }) => {
      const { error } = await supabase.from('documents').update(patch as never).in('id', ids);
      if (error) throw error;
    },
    onMutate: async ({ ids, patch }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<MapaDoc[]>(KEY);
      const set = new Set(ids);
      qc.setQueryData<MapaDoc[]>(KEY, old => old?.map(d => (set.has(d.id) ? { ...d, ...patch } : d)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: (_d, _e, { ids }) => {
      // El código completo lo calcula la base de datos
      qc.invalidateQueries({ queryKey: KEY });
      ids.forEach(id => qc.invalidateQueries({ queryKey: ['mapa-historial', id] }));
    },
  });
}

export function useCreateMapaDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: MapaDocPatch & { title: string; doc_type: DocType; silo: SiloType; created_by?: string }) => {
      const { error } = await supabase.from('documents').insert({ ...doc, empresa: 'mayoreo' } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useEstatusHistorial(documentId: string | null) {
  return useQuery({
    queryKey: ['mapa-historial', documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documento_estatus_historial' as never)
        .select('id, estatus_anterior, estatus_nuevo, changed_by, changed_at')
        .eq('document_id', documentId as string)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EstatusHistorial[];
    },
  });
}
