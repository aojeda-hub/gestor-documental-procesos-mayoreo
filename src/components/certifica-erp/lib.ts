// Constants and helpers ported from "Incident Manager Pro" for the embedded CertificaERP module.

export type Modulo = "nomina" | "ventas" | "compras" | "inventario" | "contabilidad";
export type Estado = "pendiente" | "en_curso" | "resuelto";
export type Prioridad = "baja" | "media" | "alta";

export const MODULOS: Modulo[] = ["nomina", "ventas", "compras", "inventario", "contabilidad"];
export const ESTADOS: Estado[] = ["pendiente", "en_curso", "resuelto"];
export const PRIORIDADES: Prioridad[] = ["baja", "media", "alta"];

export const MODULO_LABEL: Record<Modulo, string> = {
  nomina: "Nómina", ventas: "Ventas", compras: "Compras", inventario: "Inventario", contabilidad: "Contabilidad",
};
export const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: "Pendiente", en_curso: "En curso", resuelto: "Solventado",
};
export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: "Baja", media: "Media", alta: "Alta",
};
export const ESTADO_STYLES: Record<Estado, string> = {
  pendiente: "bg-red-200 text-black border-red-400",
  en_curso: "bg-blue-200 text-black border-blue-400",
  resuelto: "bg-green-200 text-black border-green-400",
};
export const PRIORIDAD_STYLES: Record<Prioridad, string> = {
  baja: "bg-muted text-muted-foreground border-border",
  media: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  alta: "bg-destructive/15 text-destructive border-destructive/30",
};

export const STORAGE_BUCKET = "incidencias";
export const SUPABASE_STORAGE_URL = "https://qtxfokwwwfmovicdbtre.supabase.co/storage/v1";

export function getImagePublicUrl(path: string): string {
  return `${SUPABASE_STORAGE_URL}/object/public/${STORAGE_BUCKET}/${path}`;
}

export function normalizeSignedStorageUrl(url?: string | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${SUPABASE_STORAGE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

// --- Companias / Test ---
export type CompaniaRow = { id: string; nombre: string; slug: string; orden: number; activo: boolean };
export type ProyectoRow = { id: string; compania_id: string; nombre: string; descripcion: string | null; archivado: boolean; created_at: string; created_by: string | null };

export const TEST_ESTADOS = ["pendiente", "en_curso", "completada", "incidencia"] as const;
export type TestEstado = (typeof TEST_ESTADOS)[number];
export const TEST_ENTORNOS = ["QA", "PRD"] as const;
export type TestEntorno = (typeof TEST_ENTORNOS)[number];
export const TEST_ESTADO_LABEL: Record<TestEstado, string> = {
  pendiente: "Pendiente", en_curso: "En curso", completada: "Completada", incidencia: "Incidencia",
};
export const TEST_ESTADO_STYLES: Record<TestEstado, string> = {
  pendiente: "bg-red-200 text-black border-red-400",
  en_curso: "bg-blue-200 text-black border-blue-400",
  completada: "bg-green-200 text-black border-green-400",
  incidencia: "bg-orange-200 text-black border-orange-400",
};

// --- CSV export ---
export type CsvRow = Record<string, string | number | null | undefined>;
function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
export function exportToCsv(filename: string, rows: CsvRow[], headers?: string[]) {
  if (rows.length === 0 && (!headers || headers.length === 0)) return;
  const cols = headers ?? Object.keys(rows[0] ?? {});
  const lines: string[] = [];
  lines.push(cols.map((c) => escape(c)).join(";"));
  for (const row of rows) lines.push(cols.map((c) => escape(row[c])).join(";"));
  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Internal navigation ---
export type CertView =
  | { name: "companias" }
  | { name: "compania"; slug: string }
  | { name: "proyecto"; id: string }
  | { name: "incidencia"; id: string }
  | { name: "nueva"; proyectoId?: string };
