import { differenceInDays, format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { DOCUMENT_ESTATUS_LABELS, DOCUMENT_ESTATUS_OPTIONS, SILO_LABELS } from '@/types/database';
import type { DocType, DocumentEstatus } from '@/types/database';
import type { MapaDoc } from '@/hooks/useMapaProcesos';

/** Orden del flujo de vida de un documento (para barras y leyendas). */
export const ESTATUS_FLOW: DocumentEstatus[] = [
  'aprobado', 'por_aprobar', 'revision', 'en_construccion', 'creada_ia', 'por_iniciar', 'desactualizado', 'desincorporado',
];

export const ESTATUS_BAR_COLORS: Record<DocumentEstatus, string> = {
  aprobado: 'bg-emerald-500/60',
  por_aprobar: 'bg-violet-400/60',
  revision: 'bg-amber-400/60',
  en_construccion: 'bg-sky-400/60',
  creada_ia: 'bg-cyan-400/60',
  por_iniciar: 'bg-slate-300 dark:bg-slate-600',
  desactualizado: 'bg-orange-400/60',
  desincorporado: 'bg-slate-400/60',
};

/** Nombre singular del tipo, como en la hoja "Nomenclatura". */
export const TIPO_LABEL: Record<DocType, string> = {
  norma: 'Norma', procedimiento: 'Procedimiento', instructivo: 'Instructivo', anexo: 'Anexo', formato: 'Formato',
  manual: 'Manual', politica: 'Política', diagrama: 'Diagrama', descripcion_cargo: 'Descripción de cargo',
  libro: 'Libro', presentacion_clave: 'Presentación clave', presentacion: 'Presentación',
  gestion_beneficios: 'Gestión de beneficios', sintipo: 'Sin tipo',
};

/** Tipos que usa el mapa de procesos, en orden. */
export const TIPOS_MAPA: DocType[] = ['norma', 'procedimiento', 'instructivo', 'anexo', 'formato', 'manual', 'politica', 'diagrama'];

/** Días tras los cuales un documento aprobado debe revisarse. */
export const REVISION_DIAS = 365;

export type EstatusCounts = Record<DocumentEstatus, number>;

export function emptyCounts(): EstatusCounts {
  return Object.fromEntries(DOCUMENT_ESTATUS_OPTIONS.map(s => [s, 0])) as EstatusCounts;
}

export function countEstatus(docs: MapaDoc[]): EstatusCounts {
  const c = emptyCounts();
  for (const d of docs) c[(d.estatus || 'por_iniciar') as DocumentEstatus]++;
  return c;
}

/** % aprobado sobre los documentos vigentes (excluye desincorporados). */
export function pctAprobado(c: EstatusCounts): number {
  const base = Object.values(c).reduce((a, b) => a + b, 0) - c.desincorporado;
  return base > 0 ? Math.round((c.aprobado / base) * 100) : 0;
}

export function isRevisionVencida(d: MapaDoc, today = new Date()): boolean {
  if (d.estatus !== 'aprobado' || !d.fecha_actualizacion) return false;
  return differenceInDays(today, parseISO(d.fecha_actualizacion)) > REVISION_DIAS;
}

export function isEnMapa(d: MapaDoc): boolean {
  return !!(d.macroproceso || d.proceso || d.subproceso);
}

export function fmtFecha(f?: string | null): string {
  return f ? format(parseISO(f), 'dd/MM/yyyy') : '—';
}

export const naturalCompare = (a?: string | null, b?: string | null) =>
  (a ?? '￿').localeCompare(b ?? '￿', 'es', { numeric: true, sensitivity: 'base' });

export function joinCodigo(codigo?: string | null, nombre?: string | null, fallback = 'Sin definir') {
  const n = nombre?.trim();
  if (codigo && n) return `${codigo} · ${n}`;
  return n || codigo || fallback;
}

/** Exporta con las mismas columnas que la hoja por silo del Excel original. */
export function exportMapaExcel(docs: MapaDoc[], filename: string) {
  const rows = docs.map(d => ({
    'Area': SILO_LABELS[d.silo] ?? d.silo,
    'Subárea': d.subarea ?? '',
    'Nro. Macroproceso': d.macroproceso_codigo ?? '',
    'Nombre del Macroproceso': d.macroproceso ?? '',
    'Mapeo Sistémico': d.mapeo_sistemico ?? '',
    'Nro. Proceso': d.proceso_codigo ?? '',
    'Nombre del Proceso': d.proceso ?? '',
    'Nro. Subproceso': d.subproceso_codigo ?? '',
    'Nombre del Subproceso': d.subproceso ?? '',
    'Nro. Documento': d.documento_codigo ?? '',
    'Documento': TIPO_LABEL[d.doc_type] ?? d.doc_type,
    'Nombre del documento': d.title,
    'Estatus actualizado': DOCUMENT_ESTATUS_LABELS[d.estatus] ?? d.estatus,
    'Ultima fecha de actualizacion': d.fecha_actualizacion ? fmtFecha(d.fecha_actualizacion) : '',
    'Observaciones': d.observaciones ?? '',
    'Código': d.codigo ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mapa de procesos');
  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
}
