import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog as InnerDialog, DialogContent as InnerDialogContent, DialogHeader as InnerDialogHeader,
  DialogTitle as InnerDialogTitle, DialogTrigger as InnerDialogTrigger, DialogFooter as InnerDialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import {
  Building2, FolderKanban, Plus, ChevronRight, Loader2, ListChecks, FileCheck2,
  Trash2, Check, Download, ChevronLeft, X, Save, Pencil, Hash, Tag, FileText,
  Image as ImageIcon, User, Calendar, CheckCircle2, ArrowLeft, Upload, Home,
} from "lucide-react";
import {
  CertView, CompaniaRow, ProyectoRow, Modulo, Estado, Prioridad,
  MODULOS, ESTADOS, PRIORIDADES, MODULO_LABEL, ESTADO_LABEL, ESTADO_STYLES,
  PRIORIDAD_LABEL, PRIORIDAD_STYLES, STORAGE_BUCKET, getImagePublicUrl,
  normalizeSignedStorageUrl,
  TEST_ESTADOS, TEST_ENTORNOS, TEST_ESTADO_LABEL, TEST_ESTADO_STYLES,
  TestEntorno, TestEstado, exportToCsv,
} from "./lib";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } },
});

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function CertificaERPDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[1400px] h-[95vh] p-0 gap-0 flex flex-col overflow-hidden">
        <QueryClientProvider client={queryClient}>
          <CertificaERPApp onClose={() => onOpenChange(false)} />
        </QueryClientProvider>
      </DialogContent>
    </Dialog>
  );
}

function CertificaERPApp({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<CertView>({ name: "companias" });

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <header className="flex items-center justify-between border-b bg-card px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">CertificaERP</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Gestión integral de incidencias y certificación</div>
          </div>
          {view.name !== "companias" && (
            <Button variant="ghost" size="sm" onClick={() => setView({ name: "companias" })}>
              <Home className="h-4 w-4" /> Inicio
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6">
        {view.name === "companias" && <CompaniasList navigate={setView} />}
        {view.name === "compania" && <CompaniaView slug={view.slug} navigate={setView} />}
        {view.name === "proyecto" && <ProyectoView id={view.id} navigate={setView} />}
        {view.name === "incidencia" && <IncidenciaDetail id={view.id} navigate={setView} />}
        {view.name === "nueva" && <NuevaIncidencia proyectoId={view.proyectoId} navigate={setView} />}
      </main>
    </div>
  );
}

/* ============================ COMPAÑÍAS LIST ============================ */
function CompaniasList({ navigate }: { navigate: (v: CertView) => void }) {
  const { data: companias, isLoading } = useQuery({
    queryKey: ["cert-companias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companias").select("id, nombre, slug, orden, activo")
        .eq("activo", true).order("orden", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CompaniaRow[];
    },
  });

  if (isLoading) return <Card className="flex items-center justify-center gap-2 p-12 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</Card>;
  if (!companias || companias.length === 0) return <Card className="p-12 text-center text-muted-foreground">No hay compañías disponibles.</Card>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compañías</h1>
        <p className="text-sm text-muted-foreground">Selecciona una compañía para gestionar sus proyectos e incidencias.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companias.map((c) => (
          <Card key={c.id} onClick={() => navigate({ name: "compania", slug: c.slug })}
            className="group cursor-pointer p-5 transition-all hover:border-primary hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-3 text-base font-semibold group-hover:text-primary">{c.nombre}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============================ COMPAÑÍA VIEW ============================ */
function CompaniaView({ slug, navigate }: { slug: string; navigate: (v: CertView) => void }) {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<ProyectoRow | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [deleting, setDeleting] = useState<ProyectoRow | null>(null);

  const { data: compania, isLoading } = useQuery({
    queryKey: ["cert-compania", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("companias")
        .select("id, nombre, slug, orden, activo").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as CompaniaRow | null;
    },
  });

  const { data: proyectos } = useQuery({
    queryKey: ["cert-proyectos", compania?.id],
    enabled: !!compania?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("proyectos")
        .select("id, compania_id, nombre, descripcion, archivado, created_at, created_by")
        .eq("compania_id", compania!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProyectoRow[];
    },
  });


  const crearProyecto = async () => {
    if (!user || !compania) return;
    if (nombre.trim().length < 3) { toast.error("Mínimo 3 caracteres"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("proyectos").insert({
        compania_id: compania.id, nombre: nombre.trim(),
        descripcion: descripcion.trim() || null, created_by: user.id,
      });
      if (error) throw error;
      toast.success("Proyecto creado");
      setNombre(""); setDescripcion(""); setOpen(false);
      await qc.invalidateQueries({ queryKey: ["cert-proyectos", compania.id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSubmitting(false); }
  };

  const startEdit = (p: ProyectoRow) => {
    setEditing(p);
    setEditNombre(p.nombre);
    setEditDescripcion(p.descripcion ?? "");
  };

  const guardarEdicion = async () => {
    if (!editing) return;
    if (editNombre.trim().length < 3) { toast.error("Mínimo 3 caracteres"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("proyectos").update({
        nombre: editNombre.trim(),
        descripcion: editDescripcion.trim() || null,
      }).eq("id", editing.id);
      if (error) throw error;
      toast.success("Proyecto actualizado");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["cert-proyectos", compania!.id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSubmitting(false); }
  };

  const confirmarEliminar = async () => {
    if (!deleting) return;
    try {
      const { error } = await supabase.from("proyectos").delete().eq("id", deleting.id);
      if (error) throw error;
      toast.success("Proyecto eliminado");
      setDeleting(null);
      await qc.invalidateQueries({ queryKey: ["cert-proyectos", compania!.id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
  };

  const canManage = (p: ProyectoRow) => isAdmin || (!!user && p.created_by === user.id);


  if (isLoading) return <div className="h-32 animate-pulse rounded bg-muted/40" />;
  if (!compania) return <Card className="p-12 text-center"><p className="text-muted-foreground">Compañía no encontrada</p></Card>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button onClick={() => navigate({ name: "companias" })} className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3 w-3" /> Compañías
          </button>
          <h1 className="text-3xl font-bold tracking-tight">{compania.nombre}</h1>
          <p className="text-sm text-muted-foreground">Proyectos activos.</p>
        </div>
        <InnerDialog open={open} onOpenChange={setOpen}>
          <InnerDialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo proyecto</Button></InnerDialogTrigger>
          <InnerDialogContent>
            <InnerDialogHeader><InnerDialogTitle>Nuevo proyecto en {compania.nombre}</InnerDialogTitle></InnerDialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Nombre *</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
            </div>
            <InnerDialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={crearProyecto} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Crear</Button>
            </InnerDialogFooter>
          </InnerDialogContent>
        </InnerDialog>
      </div>

      {proyectos && proyectos.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground" />
          <div className="font-medium">Sin proyectos</div>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuevo proyecto</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(proyectos ?? []).map((p) => (
            <Card key={p.id} onClick={() => navigate({ name: "proyecto", id: p.id })}
              className="group relative cursor-pointer p-5 transition-all hover:border-primary hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><FolderKanban className="h-4 w-4" /></div>
                <div className="flex items-center gap-1">
                  {canManage(p) && (
                    <>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                        title="Editar"
                      ><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleting(p); }}
                        title="Eliminar"
                      ><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="mt-3 line-clamp-2 text-base font-semibold group-hover:text-primary">{p.nombre}</div>
              {p.descripcion && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descripcion}</p>}
              <div className="mt-3 text-[11px] text-muted-foreground">Creado {format(new Date(p.created_at), "d MMM yyyy", { locale: es })}</div>
            </Card>
          ))}
        </div>
      )}

      <InnerDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <InnerDialogContent>
          <InnerDialogHeader><InnerDialogTitle>Editar proyecto</InnerDialogTitle></InnerDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} /></div>
            <div className="space-y-2"><Label>Descripción</Label><Textarea rows={3} value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} /></div>
          </div>
          <InnerDialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={submitting}>Cancelar</Button>
            <Button onClick={guardarEdicion} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</Button>
          </InnerDialogFooter>
        </InnerDialogContent>
      </InnerDialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{deleting?.nombre}" junto con sus incidencias y scripts asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================ PROYECTO VIEW ============================ */
type ProyectoFull = { id: string; nombre: string; descripcion: string | null; compania_id: string; compania: { nombre: string; slug: string } | null; };
type IncRow = { id: string; numero: number; titulo: string; modulo: string | null; prioridad: Prioridad; estado: Estado; sistema_nombre: string | null; fecha: string; };
type ScriptRow = { id: string; nombre: string; descripcion: string | null; created_at: string; created_by: string | null; };
type CasoRow = {
  id: string; script_id: string; numero: number; modulo: string | null; titulo: string;
  ruta_acceso: string | null; resultado_esperado: string | null; resultado_obtenido: string | null;
  estado: TestEstado; entorno: TestEntorno; responsable: string | null; orden: number;
};

function ProyectoView({ id, navigate }: { id: string; navigate: (v: CertView) => void }) {
  const { data: proyecto, isLoading } = useQuery({
    queryKey: ["cert-proyecto", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("proyectos")
        .select("id, nombre, descripcion, compania_id, compania:companias(nombre, slug)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as ProyectoFull | null;
    },
  });

  if (isLoading) return <div className="h-32 animate-pulse rounded bg-muted/40" />;
  if (!proyecto) return <Card className="p-12 text-center text-muted-foreground">Proyecto no encontrado</Card>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            {proyecto.compania && (
              <button onClick={() => navigate({ name: "compania", slug: proyecto.compania!.slug })} className="hover:text-foreground">
                {proyecto.compania.nombre}
              </button>
            )}
            <span>/</span>
            <span className="flex items-center gap-1"><FolderKanban className="h-3 w-3" /> Proyecto</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{proyecto.nombre}</h1>
          {proyecto.descripcion && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{proyecto.descripcion}</p>}
        </div>
        {proyecto.compania && (
          <Button variant="outline" size="sm" onClick={() => navigate({ name: "compania", slug: proyecto.compania!.slug })}>
            <ChevronLeft className="h-4 w-4" /> Proyectos
          </Button>
        )}
      </div>

      <Tabs defaultValue="incidencias" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="incidencias"><ListChecks className="mr-1 h-4 w-4" /> Incidencias</TabsTrigger>
          <TabsTrigger value="certificacion"><FileCheck2 className="mr-1 h-4 w-4" /> Certificación</TabsTrigger>
        </TabsList>
        <TabsContent value="incidencias" className="mt-4"><IncidenciasTab proyectoId={proyecto.id} proyectoNombre={proyecto.nombre} navigate={navigate} /></TabsContent>
        <TabsContent value="certificacion" className="mt-4"><CertificacionTab proyectoId={proyecto.id} proyectoNombre={proyecto.nombre} /></TabsContent>
      </Tabs>
    </div>
  );
}

function IncidenciasTab({ proyectoId, proyectoNombre, navigate }: { proyectoId: string; proyectoNombre: string; navigate: (v: CertView) => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [editingInc, setEditingInc] = useState<IncRow | null>(null);
  const [creatingFromCert, setCreatingFromCert] = useState<(CasoRow & { script_nombre: string }) | null>(null);

  const { data: incidencias } = useQuery({
    queryKey: ["cert-proyecto-incidencias", proyectoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("incidencias")
        .select("id, numero, titulo, modulo, prioridad, estado, sistema_nombre, fecha, test_caso_id")
        .eq("proyecto_id", proyectoId).order("numero", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (IncRow & { test_caso_id: string | null })[];
    },
  });

  const linkedCasoIds = new Set((incidencias ?? []).map((i) => i.test_caso_id).filter(Boolean) as string[]);

  const { data: certIncidencias } = useQuery({
    queryKey: ["cert-proyecto-cert-incidencias", proyectoId],
    queryFn: async () => {
      const { data: scriptRows, error: sErr } = await supabase.from("test_scripts")
        .select("id, nombre").eq("proyecto_id", proyectoId);
      if (sErr) throw sErr;
      const scriptIds = (scriptRows ?? []).map((s) => s.id);
      if (scriptIds.length === 0) return [] as Array<CasoRow & { script_nombre: string; created_at: string }>;
      const scriptMap = new Map((scriptRows ?? []).map((s) => [s.id, s.nombre]));
      const { data, error } = await supabase.from("test_casos")
        .select("id, script_id, numero, modulo, titulo, ruta_acceso, resultado_esperado, resultado_obtenido, estado, entorno, responsable, orden, created_at")
        .in("script_id", scriptIds).eq("estado", "incidencia")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({ ...c, script_nombre: scriptMap.get(c.script_id) ?? "" })) as Array<CasoRow & { script_nombre: string; created_at: string }>;
    },
  });


  const exportar = async () => {
    const totalReal = incidencias?.length ?? 0;
    const totalCert = certIncidencias?.length ?? 0;
    if (totalReal === 0 && totalCert === 0) { toast.info("No hay incidencias"); return; }
    const { exportIncidenciasPDF } = await import("@/lib/pdfExport");
    const rows = [
      ...(incidencias ?? []).map((r) => ({
        numero: r.numero,
        titulo: r.titulo,
        sistema: r.sistema_nombre,
        modulo: r.modulo || "-",
        estado: ESTADO_LABEL[r.estado],
        prioridad: PRIORIDAD_LABEL[r.prioridad],
        responsable: null,
        origen: "Incidencia",
        fecha: format(new Date(r.fecha), "yyyy-MM-dd"),
      })),
      ...(certIncidencias ?? []).map((c) => ({
        numero: `C#${c.numero}`,
        titulo: c.titulo,
        sistema: c.entorno,
        modulo: c.modulo ?? "-",
        estado: "Incidencia",
        prioridad: null,
        responsable: c.responsable,
        origen: `Certificación · ${c.script_nombre}`,
        fecha: format(new Date(c.created_at), "yyyy-MM-dd"),
      })),
    ];
    await exportIncidenciasPDF(proyectoNombre || "Proyecto", rows);
    toast.success(`Exportadas ${rows.length} incidencias`);
  };


  const INC_HEADERS = ["Título", "Descripción", "Sección", "Prioridad", "Estado", "Sistema", "Código transacción", "Nombre transacción", "Responsable", "Fecha (YYYY-MM-DD)", "Fecha ocurrencia (YYYY-MM-DD)"];

  const descargarPlantillaInc = async () => {
    const XLSX = await import("xlsx");
    const ejemplo = [{
      "Título": "Ejemplo: Error al generar reporte de ventas",
      "Descripción": "Al intentar generar el reporte mensual el sistema muestra un error 500.",
      "Sección": "Ventas",
      "Prioridad": "Alta",
      "Estado": "Pendiente",
      "Sistema": "Softland ERP",
      "Código transacción": "VEN-001",
      "Nombre transacción": "Generar reporte",
      "Responsable": "Nombre Apellido",
      "Fecha (YYYY-MM-DD)": format(new Date(), "yyyy-MM-dd"),
      "Fecha ocurrencia (YYYY-MM-DD)": format(new Date(), "yyyy-MM-dd"),
    }];
    const ws = XLSX.utils.json_to_sheet(ejemplo, { header: INC_HEADERS });
    ws["!cols"] = [{ wch: 38 }, { wch: 50 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 28 }];
    const ayuda = [
      ["Campo", "Valores permitidos / formato"],
      ["Título", "Obligatorio. Resumen breve de la incidencia"],
      ["Descripción", "Obligatorio. Detalle completo"],
      ["Sección", "Texto libre (ej. Nómina, Ventas, Compras, Inventario, Contabilidad)"],
      ["Prioridad", "Baja | Media | Alta"],
      ["Estado", "Pendiente | En curso | Solventado"],
      ["Sistema", "Nombre del sistema donde ocurrió"],
      ["Código transacción", "Código interno (opcional)"],
      ["Nombre transacción", "Nombre legible de la transacción (opcional)"],
      ["Responsable", "Persona responsable (opcional)"],
      ["Fecha (YYYY-MM-DD)", "Fecha de registro. Si se deja vacía se usa hoy"],
      ["Fecha ocurrencia (YYYY-MM-DD)", "Fecha en que ocurrió la incidencia (opcional)"],
    ];
    const wsAyuda = XLSX.utils.aoa_to_sheet(ayuda);
    wsAyuda["!cols"] = [{ wch: 32 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidencias");
    XLSX.utils.book_append_sheet(wb, wsAyuda, "Instrucciones");
    XLSX.writeFile(wb, "plantilla-incidencias.xlsx");
    toast.success("Plantilla descargada. Llénala y luego usa Importar.");
  };

  const moduloFromLabel = (s: string): string | null => {
    const v = (s ?? "").trim();
    return v ? v : null;
  };
  const prioridadFromLabel = (s: string): Prioridad => {
    const v = (s ?? "").trim().toLowerCase();
    if (v.startsWith("alt")) return "alta";
    if (v.startsWith("baj")) return "baja";
    return "media";
  };
  const estadoIncFromLabel = (s: string): Estado => {
    const v = (s ?? "").trim().toLowerCase();
    if (v.startsWith("solv") || v.startsWith("res") || v.startsWith("compl")) return "resuelto";
    if (v.startsWith("en")) return "en_curso";
    return "pendiente";
  };
  const parseDate = (s: string): string | null => {
    const v = (s ?? "").toString().trim();
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return format(d, "yyyy-MM-dd");
  };

  const importarInc = async (file: File) => {
    if (!user) { toast.error("Sesión requerida"); return; }
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "incidencias") ?? wb.SheetNames[0];
      if (!sheetName) { toast.error("El archivo no tiene hojas"); return; }
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
      if (rows.length === 0) { toast.error("El archivo está vacío"); return; }
      const norm = (s: unknown) => String(s ?? "").trim();
      const today = format(new Date(), "yyyy-MM-dd");
      const payload = rows
        .map((r) => {
          const tit = norm(r["Título"] ?? r["Titulo"]);
          const desc = norm(r["Descripción"] ?? r["Descripcion"]);
          if (!tit) return null;
          return {
            proyecto_id: proyectoId,
            titulo: tit,
            descripcion: desc || tit,
            modulo: moduloFromLabel(norm(r["Sección"] ?? r["Seccion"] ?? r["Módulo"] ?? r["Modulo"])),
            prioridad: prioridadFromLabel(norm(r["Prioridad"])),
            estado: estadoIncFromLabel(norm(r["Estado"])),
            sistema_nombre: norm(r["Sistema"]) || null,
            codigo_transaccion: norm(r["Código transacción"] ?? r["Codigo transaccion"]) || null,
            nombre_transaccion: norm(r["Nombre transacción"] ?? r["Nombre transaccion"]) || null,
            responsable: norm(r["Responsable"]) || null,
            fecha: parseDate(norm(r["Fecha (YYYY-MM-DD)"] ?? r["Fecha"])) ?? today,
            fecha_ocurrencia: parseDate(norm(r["Fecha ocurrencia (YYYY-MM-DD)"] ?? r["Fecha ocurrencia"])),
            created_by: user.id,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (payload.length === 0) { toast.error("No se encontraron filas con Título"); return; }
      const { error } = await supabase.from("incidencias").insert(payload);
      if (error) { toast.error(error.message); return; }
      await qc.invalidateQueries({ queryKey: ["cert-proyecto-incidencias", proyectoId] });
      toast.success(`Importadas ${payload.length} incidencias`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al importar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Incidencias en sistemas</h2>
          <p className="text-sm text-muted-foreground">Cada incidencia indica el sistema donde ocurrió.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={descargarPlantillaInc} title="Descargar plantilla Excel vacía">
            <FileText className="h-4 w-4" /> Plantilla
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importarInc(f); e.currentTarget.value = ""; }}
            />
            <Button variant="outline" asChild>
              <span className="cursor-pointer"><Upload className="h-4 w-4" /> Importar</span>
            </Button>
          </label>
          <Button variant="outline" onClick={exportar} disabled={(!incidencias || incidencias.length === 0) && (!certIncidencias || certIncidencias.length === 0)}>
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <Button onClick={() => navigate({ name: "nueva", proyectoId })}><Plus className="h-4 w-4" /> Nueva incidencia</Button>
        </div>
      </div>


      {incidencias && incidencias.length === 0 && (!certIncidencias || certIncidencias.length === 0) ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <ListChecks className="h-8 w-8 text-muted-foreground" />
          <div className="font-medium">Sin incidencias en este proyecto</div>
          <Button size="sm" onClick={() => navigate({ name: "nueva", proyectoId })}><Plus className="h-4 w-4" /> Registrar la primera</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">N°</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-[160px]">Sistema</TableHead>
                <TableHead className="w-[110px]">Sección</TableHead>
                <TableHead className="w-[110px]">Estado</TableHead>
                <TableHead className="w-[100px]">Prioridad</TableHead>
                <TableHead className="w-[130px]">Origen</TableHead>
                <TableHead className="w-[110px]">Fecha</TableHead>
                <TableHead className="w-[90px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(incidencias ?? []).map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate({ name: "incidencia", id: r.id })}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{r.numero}</TableCell>
                  <TableCell className="font-medium">{r.titulo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.sistema_nombre ?? <span className="opacity-50">—</span>}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.modulo || '—'}</Badge></TableCell>
                  <TableCell><span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${ESTADO_STYLES[r.estado]}`}>{ESTADO_LABEL[r.estado]}</span></TableCell>
                  <TableCell><span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${PRIORIDAD_STYLES[r.prioridad]}`}>{PRIORIDAD_LABEL[r.prioridad]}</span></TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">Incidencia</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.fecha), "d MMM yyyy", { locale: es })}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditingInc(r)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(certIncidencias ?? []).filter((c) => !linkedCasoIds.has(c.id)).map((c) => (
                <TableRow key={`cert-${c.id}`} className="bg-orange-50/40 dark:bg-orange-950/10">
                  <TableCell className="font-mono text-xs text-muted-foreground">C#{c.numero}</TableCell>
                  <TableCell className="font-medium">{c.titulo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.entorno}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{c.modulo ?? '—'}</Badge></TableCell>
                  <TableCell><span className="rounded-md border px-2 py-0.5 text-[11px] font-medium bg-orange-200 text-black border-orange-400">Incidencia</span></TableCell>
                  <TableCell><span className="text-[11px] text-muted-foreground">—</span></TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">Certificación · {c.script_nombre}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(c.created_at), "d MMM yyyy", { locale: es })}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setCreatingFromCert(c)} title="Editar">
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

            </TableBody>
          </Table>
        </Card>
      )}

      <IncidenciaFormDialog
        open={!!editingInc || !!creatingFromCert}
        mode={editingInc ? "edit" : "create"}
        proyectoId={proyectoId}
        testCasoId={creatingFromCert?.id ?? null}
        initial={
          editingInc
            ? { id: editingInc.id }
            : creatingFromCert
              ? {
                  titulo: creatingFromCert.titulo,
                  descripcion: creatingFromCert.resultado_obtenido || creatingFromCert.resultado_esperado || creatingFromCert.titulo,
                  sistema_nombre: creatingFromCert.entorno,
                  responsable: creatingFromCert.responsable || "",
                }
              : undefined
        }
        onOpenChange={(v) => { if (!v) { setEditingInc(null); setCreatingFromCert(null); } }}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["cert-proyecto-incidencias", proyectoId] });
          qc.invalidateQueries({ queryKey: ["cert-proyecto-cert-incidencias", proyectoId] });
        }}
      />
    </div>
  );
}

/* ============================ INCIDENCIA FORM DIALOG ============================ */
function IncidenciaFormDialog({
  open, mode, proyectoId, testCasoId, initial, onOpenChange, onSaved,
}: {
  open: boolean;
  mode: "edit" | "create";
  proyectoId: string;
  testCasoId?: string | null;
  initial?: Partial<{
    id: string; titulo: string; descripcion: string; sistema_nombre: string;
    modulo: string; prioridad: Prioridad; responsable: string;
    codigo_transaccion: string; nombre_transaccion: string;
    fecha_ocurrencia: string; fecha: string;
  }>;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    titulo: "", descripcion: "", sistema_nombre: "",
    modulo: "", prioridad: "media" as Prioridad, responsable: "",
    codigo_transaccion: "", nombre_transaccion: "",
    fecha_ocurrencia: today, fecha: today,
  });

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    const next = [...files, ...incoming].slice(0, 10);
    setFiles(next);
    setPreviews(next.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : "")));
  };
  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreviews(next.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : "")));
  };

  useEffect(() => {
    if (!open) return;
    setFiles([]); setPreviews([]);
    if (mode === "edit" && initial?.id) {
      (async () => {
        const { data } = await supabase.from("incidencias")
          .select("titulo, descripcion, sistema_nombre, modulo, prioridad, responsable, codigo_transaccion, nombre_transaccion, fecha_ocurrencia, fecha")
          .eq("id", initial.id).maybeSingle();
        if (data) {
          setForm({
            titulo: data.titulo ?? "",
            descripcion: data.descripcion ?? "",
            sistema_nombre: data.sistema_nombre ?? "",
            modulo: (data.modulo as string) ?? "",
            prioridad: (data.prioridad as Prioridad) ?? "media",
            responsable: data.responsable ?? "",
            codigo_transaccion: data.codigo_transaccion ?? "",
            nombre_transaccion: data.nombre_transaccion ?? "",
            fecha_ocurrencia: (data.fecha_ocurrencia as string) ?? today,
            fecha: (data.fecha as string) ?? today,
          });
        }
      })();
    } else {
      setForm((f) => ({
        ...f,
        titulo: initial?.titulo ?? "",
        descripcion: initial?.descripcion ?? "",
        sistema_nombre: initial?.sistema_nombre ?? "",
        responsable: initial?.responsable ?? "",
      }));
    }
  }, [open, mode, initial?.id]);

  const save = async () => {
    if (!user) { toast.error("Sesión no válida"); return; }
    if (form.titulo.trim().length < 3) { toast.error("Título mínimo 3 caracteres"); return; }
    if (form.descripcion.trim().length < 5) { toast.error("Descripción mínimo 5 caracteres"); return; }
    if (form.sistema_nombre.trim().length < 2) { toast.error("Indica el sistema"); return; }
    if (form.responsable.trim().length < 2) { toast.error("Indica el responsable"); return; }
    setSubmitting(true);
    try {
      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        sistema_nombre: form.sistema_nombre.trim(),
        modulo: form.modulo,
        prioridad: form.prioridad,
        responsable: form.responsable.trim(),
        codigo_transaccion: form.codigo_transaccion.trim() || null,
        nombre_transaccion: form.nombre_transaccion.trim() || null,
        fecha_ocurrencia: form.fecha_ocurrencia,
        fecha: form.fecha,
      };
      let incId: string | null = null;
      if (mode === "edit" && initial?.id) {
        const { error } = await supabase.from("incidencias").update(payload).eq("id", initial.id);
        if (error) throw error;
        incId = initial.id;
        toast.success("Incidencia actualizada");
      } else {
        const { data, error } = await supabase.from("incidencias").insert({
          ...payload, proyecto_id: proyectoId, created_by: user.id, test_caso_id: testCasoId ?? null,
        }).select("id").single();
        if (error) throw error;
        incId = data.id;
        toast.success("Incidencia creada");
      }
      if (incId && files.length > 0) {
        const failed: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
          const path = `${incId}/${Date.now()}_${i}.${ext}`;
          const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
          if (upErr) { failed.push(file.name); continue; }
          const { error: imgErr } = await supabase.from("incidencia_imagenes").insert({
            incidencia_id: incId, storage_path: path, nombre_original: file.name, orden: i,
          });
          if (imgErr) failed.push(file.name);
        }
        if (failed.length > 0) toast.warning(`${failed.length} imagen(es) fallaron`);
        qc.invalidateQueries({ queryKey: ["cert-incidencia-imgs", incId] });
      }
      onSaved();
      onOpenChange(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSubmitting(false); }
  };

  return (
    <InnerDialog open={open} onOpenChange={onOpenChange}>
      <InnerDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <InnerDialogHeader>
          <InnerDialogTitle>{mode === "edit" ? "Editar incidencia" : "Registrar incidencia"}</InnerDialogTitle>
        </InnerDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Nombre del sistema *</Label><Input value={form.sistema_nombre} onChange={(e) => setForm({ ...form, sistema_nombre: e.target.value })} placeholder="Ej. Softland Nómina, SAP, Odoo…" /></div>
          <div className="space-y-2"><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="space-y-2"><Label>Descripción *</Label><Textarea rows={4} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Sección</Label>
              <Input value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} placeholder="Escribe la sección" />
            </div>
            <div className="space-y-2"><Label>Prioridad *</Label>
              <Select value={form.prioridad} onValueChange={(v) => setForm({ ...form, prioridad: v as Prioridad })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{PRIORIDAD_LABEL[p]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>Responsable *</Label><Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></div>
            <div className="space-y-2"><Label>Fecha ocurrencia *</Label><Input type="date" value={form.fecha_ocurrencia} onChange={(e) => setForm({ ...form, fecha_ocurrencia: e.target.value })} /></div>
            <div className="space-y-2"><Label>Fecha registro *</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Código transacción</Label><Input value={form.codigo_transaccion} onChange={(e) => setForm({ ...form, codigo_transaccion: e.target.value })} placeholder="Ej. VA001" /></div>
            <div className="space-y-2"><Label>Nombre transacción</Label><Input value={form.nombre_transaccion} onChange={(e) => setForm({ ...form, nombre_transaccion: e.target.value })} placeholder="Ej. Crear factura" /></div>
          </div>
          <div className="space-y-2">
            <Label>Archivos adjuntos ({files.length}/10)</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-6 text-center hover:bg-muted/50">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="text-sm font-medium">Click para subir archivos</div>
              <div className="text-xs text-muted-foreground">PDF, Word, Excel, imágenes y otros — hasta 10 archivos</div>
              <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {files.map((file, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                    {previews[i] ? (
                      <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="line-clamp-2 text-[10px] text-muted-foreground break-all">{file.name}</div>
                      </div>
                    )}
                    <button type="button" onClick={() => removeFile(i)} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 hover:bg-destructive hover:text-destructive-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <InnerDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={save} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</Button>
        </InnerDialogFooter>
      </InnerDialogContent>
    </InnerDialog>
  );
}


function CertificacionTab({ proyectoId, proyectoNombre }: { proyectoId: string; proyectoNombre: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: scripts } = useQuery({
    queryKey: ["cert-scripts", proyectoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("test_scripts")
        .select("id, nombre, descripcion, created_at, created_by").eq("proyecto_id", proyectoId).order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as ScriptRow[];
      if (list.length > 0 && !selectedScript) setSelectedScript(list[0].id);
      return list;
    },
  });

  const crearScript = async () => {
    if (!user) return;
    if (nombre.trim().length < 3) { toast.error("Nombre mínimo 3 caracteres"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("test_scripts").insert({
        proyecto_id: proyectoId, nombre: nombre.trim(),
        descripcion: descripcion.trim() || null, created_by: user.id,
      }).select("id").single();
      if (error) throw error;
      toast.success("Script creado");
      setNombre(""); setDescripcion(""); setOpenNew(false); setSelectedScript(data.id);
      await qc.invalidateQueries({ queryKey: ["cert-scripts", proyectoId] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <InnerDialog open={openNew} onOpenChange={setOpenNew}>
          <InnerDialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo script</Button></InnerDialogTrigger>
          <InnerDialogContent>
            <InnerDialogHeader><InnerDialogTitle>Nuevo script de pruebas</InnerDialogTitle></InnerDialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Nombre *</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
            </div>
            <InnerDialogFooter>
              <Button variant="outline" onClick={() => setOpenNew(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={crearScript} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Crear</Button>
            </InnerDialogFooter>
          </InnerDialogContent>
        </InnerDialog>
      </div>

      {scripts && scripts.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <FileCheck2 className="h-8 w-8 text-muted-foreground" />
          <div className="font-medium">Aún no hay scripts</div>
          <Button size="sm" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4" /> Nuevo script</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {(scripts ?? []).length > 1 && (
            <div className="flex flex-wrap gap-2">
              {(scripts ?? []).map((s) => (
                <button key={s.id} onClick={() => setSelectedScript(s.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedScript === s.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"
                  }`}>{s.nombre}</button>
              ))}
            </div>
          )}
          {selectedScript && (
            <CasosEditor
              scriptId={selectedScript}
              proyectoNombre={proyectoNombre}
              scriptNombre={(scripts ?? []).find((s) => s.id === selectedScript)?.nombre ?? ""}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CasosEditor({ scriptId, proyectoNombre, scriptNombre }: { scriptId: string; proyectoNombre: string; scriptNombre: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: casos } = useQuery({
    queryKey: ["cert-casos", scriptId],
    queryFn: async () => {
      const { data, error } = await supabase.from("test_casos")
        .select("id, script_id, numero, modulo, titulo, ruta_acceso, resultado_esperado, resultado_obtenido, estado, entorno, responsable, orden")
        .eq("script_id", scriptId).order("orden", { ascending: true }).order("numero", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CasoRow[];
    },
  });

  const stats = useMemo(() => {
    const total = casos?.length ?? 0;
    const completadas = (casos ?? []).filter((c) => c.estado === "completada").length;
    const enCurso = (casos ?? []).filter((c) => c.estado === "en_curso").length;
    const pendientes = (casos ?? []).filter((c) => c.estado === "pendiente").length;
    const incidencias = (casos ?? []).filter((c) => c.estado === "incidencia").length;
    return { total, completadas, enCurso, pendientes, incidencias };
  }, [casos]);

  const agregar = async () => {
    if (!user) return;
    const orden = (casos?.length ?? 0) + 1;
    const { error } = await supabase.from("test_casos").insert({
      script_id: scriptId, titulo: "Nuevo caso de prueba", orden, created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["cert-casos", scriptId] });
  };

  const exportar = async () => {
    if (!casos || casos.length === 0) { toast.info("No hay casos"); return; }
    const { exportCertificacionPDF } = await import("@/lib/pdfExport");
    await exportCertificacionPDF(
      proyectoNombre || "Proyecto",
      scriptNombre || "Script",
      casos.map((c) => ({
        numero: c.numero,
        modulo: c.modulo,
        titulo: c.titulo,
        ruta_acceso: c.ruta_acceso,
        resultado_esperado: c.resultado_esperado,
        resultado_obtenido: c.resultado_obtenido,
        estado: c.estado,
        entorno: c.entorno,
        responsable: c.responsable,
      })),
      TEST_ESTADO_LABEL as Record<string, string>,
    );
    toast.success(`Exportados ${casos.length} casos`);
  };

  const PLANTILLA_HEADERS = ["Sección", "Título", "Ruta de acceso", "Resultado esperado", "Resultado obtenido", "Estado", "Entorno", "Responsable"];

  const descargarPlantilla = async () => {
    const XLSX = await import("xlsx");
    const ejemplo = [{
      "Sección": "Nómina",
      "Título": "Ejemplo: Cálculo de quincena",
      "Ruta de acceso": "Nómina > Procesos > Cálculo",
      "Resultado esperado": "Totales coinciden con cálculo manual",
      "Resultado obtenido": "",
      "Estado": "Pendiente",
      "Entorno": "QA",
      "Responsable": "Nombre Apellido",
    }];
    const ws = XLSX.utils.json_to_sheet(ejemplo, { header: PLANTILLA_HEADERS });
    ws["!cols"] = [{ wch: 14 }, { wch: 36 }, { wch: 28 }, { wch: 32 }, { wch: 32 }, { wch: 14 }, { wch: 10 }, { wch: 20 }];
    // Hoja de instrucciones / valores válidos
    const ayuda = [
      ["Campo", "Valores permitidos / formato"],
      ["Sección", "Texto libre (ej. Nómina, Ventas, Compras, Inventario, Contabilidad)"],
      ["Título", "Obligatorio. Nombre del caso de prueba"],
      ["Ruta de acceso", "Ruta del menú o módulo donde se ejecuta"],
      ["Resultado esperado", "Lo que debe ocurrir"],
      ["Resultado obtenido", "Lo que realmente ocurrió (puede dejarse vacío)"],
      ["Estado", "Pendiente | En curso | Completada | Incidencia"],
      ["Entorno", "QA | PRD"],
      ["Responsable", "Nombre del responsable de la prueba"],
    ];
    const wsAyuda = XLSX.utils.aoa_to_sheet(ayuda);
    wsAyuda["!cols"] = [{ wch: 22 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Casos");
    XLSX.utils.book_append_sheet(wb, wsAyuda, "Instrucciones");
    XLSX.writeFile(wb, "plantilla-certificacion.xlsx");
    toast.success("Plantilla descargada. Llénala y luego usa Importar.");
  };

  const estadoFromLabel = (s: string): TestEstado => {
    const v = (s ?? "").trim().toLowerCase();
    if (v.startsWith("compl")) return "completada";
    if (v.startsWith("inc")) return "incidencia";
    if (v.startsWith("en")) return "en_curso";
    return "pendiente";
  };
  const entornoFromLabel = (s: string): TestEntorno => ((s ?? "").trim().toUpperCase() === "PRD" ? "PRD" : "QA");

  const importar = async (file: File) => {
    if (!user) { toast.error("Sesión requerida"); return; }
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      // Buscar hoja "Casos" o usar la primera
      const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "casos") ?? wb.SheetNames[0];
      if (!sheetName) { toast.error("El archivo no tiene hojas"); return; }
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
      if (rows.length === 0) { toast.error("El archivo está vacío"); return; }
      const norm = (s: unknown) => String(s ?? "").trim();
      const startOrden = (casos?.length ?? 0) + 1;
      const payload = rows
        .map((r, k) => {
          const tit = norm(r["Título"] ?? r["Titulo"] ?? r["titulo"]);
          if (!tit) return null;
          return {
            script_id: scriptId,
            modulo: norm(r["Sección"] ?? r["Seccion"] ?? r["Módulo"] ?? r["Modulo"]) || null,
            titulo: tit,
            ruta_acceso: norm(r["Ruta de acceso"] ?? r["Ruta"]) || null,
            resultado_esperado: norm(r["Resultado esperado"]) || null,
            resultado_obtenido: norm(r["Resultado obtenido"]) || null,
            estado: estadoFromLabel(norm(r["Estado"])),
            entorno: entornoFromLabel(norm(r["Entorno"])),
            responsable: norm(r["Responsable"]) || null,
            orden: startOrden + k,
            created_by: user.id,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (payload.length === 0) { toast.error("No se encontraron filas con Título"); return; }
      const { error } = await supabase.from("test_casos").insert(payload);
      if (error) { toast.error(error.message); return; }
      await qc.invalidateQueries({ queryKey: ["cert-casos", scriptId] });
      toast.success(`Importados ${payload.length} casos`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al importar");
    }
  };


  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Total: {stats.total}</Badge>
          <Badge className="bg-red-200 text-black border-red-400" variant="outline">Pendientes: {stats.pendientes}</Badge>
          <Badge className="bg-blue-200 text-black border-blue-400" variant="outline">En curso: {stats.enCurso}</Badge>
          <Badge className="bg-green-200 text-black border-green-400" variant="outline">Completadas: {stats.completadas}</Badge>
          <Badge className="bg-orange-200 text-black border-orange-400" variant="outline">Incidencias: {stats.incidencias}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={descargarPlantilla} title="Descargar plantilla CSV vacía">
            <FileText className="h-4 w-4" /> Plantilla
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.currentTarget.value = ""; }}
            />
            <Button size="sm" variant="outline" asChild>
              <span className="cursor-pointer"><Upload className="h-4 w-4" /> Importar</span>
            </Button>
          </label>
          <Button size="sm" variant="outline" onClick={exportar} disabled={!casos || casos.length === 0}><Download className="h-4 w-4" /> Exportar</Button>
          <Button size="sm" onClick={agregar}><Plus className="h-4 w-4" /> Caso</Button>
        </div>
      </div>

      {casos && casos.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Aún no hay casos.</div>
      ) : (
        <div className="w-full overflow-x-auto">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44px] px-1 text-[10px]">ID</TableHead>
                <TableHead className="w-[9%] px-1 text-[10px]">Sección</TableHead>
                <TableHead className="w-[16%] px-1 text-[10px]">Título</TableHead>
                <TableHead className="w-[14%] px-1 text-[10px]">Ruta</TableHead>
                <TableHead className="w-[16%] px-1 text-[10px]">R. Esperado</TableHead>
                <TableHead className="w-[16%] px-1 text-[10px]">R. Obtenido</TableHead>
                <TableHead className="w-[10%] px-1 text-[10px]">Estado</TableHead>
                <TableHead className="w-[64px] px-1 text-[10px]">Entorno</TableHead>
                <TableHead className="w-[10%] px-1 text-[10px]">Resp.</TableHead>
                <TableHead className="w-[40px] px-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(casos ?? []).map((c) => <CasoRowEditor key={c.id} caso={c} />)}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function CasoRowEditor({ caso }: { caso: CasoRow }) {
  const qc = useQueryClient();
  const [local, setLocal] = useState(caso);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const pendingRef = useRef<Partial<CasoRow>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  // Sync from server when the row id changes (unlikely) — otherwise keep local edits.
  useEffect(() => { setLocal(caso); }, [caso.id]);

  const flush = async () => {
    if (inFlightRef.current) return;
    const payload = pendingRef.current;
    if (!payload || Object.keys(payload).length === 0) return;
    pendingRef.current = {};
    inFlightRef.current = true;
    setSaving(true);
    const { error } = await supabase.from("test_casos").update(payload).eq("id", caso.id);
    inFlightRef.current = false;
    setSaving(false);
    if (error) {
      toast.error(error.message);
      // Restore pending so user can retry
      pendingRef.current = { ...payload, ...pendingRef.current };
      return;
    }
    setSavedTick((t) => t + 1);
    // Re-run if more changes queued while saving
    if (Object.keys(pendingRef.current).length > 0) flush();
  };

  const scheduleFlush = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { flush(); }, 500);
  };

  const update = <K extends keyof CasoRow>(key: K, value: CasoRow[K]) => {
    setLocal((p) => ({ ...p, [key]: value }));
    pendingRef.current = { ...pendingRef.current, [key]: value };
    scheduleFlush();
  };

  const flushNow = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    flush();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // best-effort final save on unmount
      if (Object.keys(pendingRef.current).length > 0) {
        supabase.from("test_casos").update(pendingRef.current).eq("id", caso.id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateAndSave = async <K extends keyof CasoRow>(key: K, value: CasoRow[K]) => {
    setLocal((p) => ({ ...p, [key]: value }));
    pendingRef.current = { ...pendingRef.current, [key]: value };
    await flush();
    await qc.invalidateQueries({ queryKey: ["cert-casos", caso.script_id] });
  };

  const eliminar = async () => {
    if (!confirm("¿Eliminar este caso?")) return;
    const { error } = await supabase.from("test_casos").delete().eq("id", caso.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado");
    await qc.invalidateQueries({ queryKey: ["cert-casos", caso.script_id] });
  };

  return (
    <TableRow className="align-top">
      <TableCell className="px-1 py-1 font-mono text-[10px] text-muted-foreground">#{caso.numero}</TableCell>
      <TableCell className="px-1 py-1"><Textarea value={local.modulo ?? ""} onChange={(e) => update("modulo", e.target.value)} onBlur={flushNow} placeholder="—" rows={2} className="min-h-[36px] resize-none px-1.5 py-1 text-[11px] leading-tight" /></TableCell>
      <TableCell className="px-1 py-1"><Textarea value={local.titulo} onChange={(e) => update("titulo", e.target.value)} onBlur={flushNow} rows={2} className="min-h-[36px] resize-none px-1.5 py-1 text-[11px] leading-tight" /></TableCell>
      <TableCell className="px-1 py-1"><Textarea value={local.ruta_acceso ?? ""} onChange={(e) => update("ruta_acceso", e.target.value)} onBlur={flushNow} placeholder="Menú > Submenú" rows={2} className="min-h-[36px] resize-none px-1.5 py-1 text-[11px] leading-tight" /></TableCell>
      <TableCell className="px-1 py-1"><Textarea value={local.resultado_esperado ?? ""} onChange={(e) => update("resultado_esperado", e.target.value)} onBlur={flushNow} rows={2} className="min-h-[36px] resize-none px-1.5 py-1 text-[11px] leading-tight" /></TableCell>
      <TableCell className="px-1 py-1"><Textarea value={local.resultado_obtenido ?? ""} onChange={(e) => update("resultado_obtenido", e.target.value)} onBlur={flushNow} rows={2} className="min-h-[36px] resize-none px-1.5 py-1 text-[11px] leading-tight" /></TableCell>
      <TableCell className="px-1 py-1">
        <Select value={local.estado} onValueChange={(v) => updateAndSave("estado", v as TestEstado)}>
          <SelectTrigger className={`h-7 px-1.5 text-[11px] ${TEST_ESTADO_STYLES[local.estado]}`}><SelectValue /></SelectTrigger>
          <SelectContent>{TEST_ESTADOS.map((s) => <SelectItem key={s} value={s}>{TEST_ESTADO_LABEL[s]}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-1 py-1">
        <Select value={local.entorno} onValueChange={(v) => updateAndSave("entorno", v as TestEntorno)}>
          <SelectTrigger className="h-7 px-1.5 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>{TEST_ENTORNOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-1 py-1"><Input value={local.responsable ?? ""} onChange={(e) => update("responsable", e.target.value)} onBlur={flushNow} placeholder="Nombre" className="h-7 px-1.5 text-[11px]" /></TableCell>
      <TableCell className="px-1 py-1">
        <div className="flex flex-col items-center gap-0.5">
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : savedTick > 0 ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : null}
          <Button size="icon" variant="ghost" onClick={eliminar} className="h-6 w-6" title="Eliminar"><Trash2 className="h-3 w-3 text-destructive" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}



/* ============================ INCIDENCIA DETAIL ============================ */
type Inc = {
  id: string; numero: number; titulo: string; descripcion: string; modulo: string | null;
  prioridad: Prioridad; estado: Estado; fecha: string; codigo_transaccion: string | null;
  nombre_transaccion: string | null; responsable: string | null; fecha_ocurrencia: string | null;
  fecha_completado: string | null; created_at: string; updated_at: string;
  proyecto_id: string | null;
};
type Img = { id: string; storage_path: string; nombre_original: string | null; orden: number; signed_url: string };
type EditForm = {
  titulo: string; descripcion: string; modulo: string; prioridad: Prioridad; fecha: string;
  codigo_transaccion: string; nombre_transaccion: string; responsable: string; fecha_ocurrencia: string;
};

function attachmentName(file: Img): string {
  return file.nombre_original || file.storage_path.split("/").pop() || "Archivo";
}

function isImageAttachment(file: Img): boolean {
  const value = `${file.nombre_original ?? ""} ${file.storage_path}`;
  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(value);
}

function isPdfAttachment(file: Img): boolean {
  const value = `${file.nombre_original ?? ""} ${file.storage_path}`;
  return /\.pdf$/i.test(value);
}

function PdfAttachmentPreview({ file, blob }: { file: Img; blob: Blob }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageNumber(1);
  }, [file.id]);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;
    let loadingTask: { destroy: () => Promise<void>; promise: Promise<unknown> } | null = null;

    const renderPage = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setLoading(true);
      setError(null);
      try {
        const data = new Uint8Array(await blob.arrayBuffer());
        loadingTask = pdfjsLib.getDocument({ data }) as typeof loadingTask;
        const pdf = await loadingTask.promise as Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;
        if (cancelled) return;
        setPageCount(pdf.numPages);
        const safePage = Math.min(Math.max(pageNumber, 1), pdf.numPages);
        if (safePage !== pageNumber) {
          setPageNumber(safePage);
          return;
        }
        const page = await pdf.getPage(safePage);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const frameWidth = frameRef.current?.clientWidth ?? 900;
        const frameHeight = frameRef.current?.clientHeight ?? 620;
        const fitScale = Math.min((frameWidth - 32) / baseViewport.width, (frameHeight - 32) / baseViewport.height);
        const viewport = page.getViewport({ scale: Math.max(0.35, Math.min(fitScale, 2)) });
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No se pudo preparar el visor");
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
      } catch (e) {
        if (!cancelled && !(e instanceof Error && e.name === "RenderingCancelledException")) {
          setError(e instanceof Error ? e.message : "No se pudo mostrar el PDF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [blob, pageNumber]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b bg-background px-3 py-2 text-xs">
        <span className="line-clamp-1 min-w-0 break-all text-muted-foreground">{attachmentName(file)}</span>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={loading || pageNumber <= 1}>Anterior</Button>
          <span className="min-w-16 text-center text-muted-foreground">{pageNumber} / {pageCount || "—"}</span>
          <Button size="sm" variant="outline" onClick={() => setPageNumber((p) => (pageCount ? Math.min(pageCount, p + 1) : p + 1))} disabled={loading || (pageCount > 0 && pageNumber >= pageCount)}>Siguiente</Button>
        </div>
      </div>
      <div ref={frameRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        {loading && <div className="absolute top-4 z-10 flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm"><Loader2 className="h-4 w-4 animate-spin" /> Cargando PDF…</div>}
        {error ? (
          <div className="max-w-sm text-center text-sm text-muted-foreground">{error}</div>
        ) : (
          <canvas ref={canvasRef} className="rounded-sm bg-background shadow-sm" />
        )}
      </div>
    </div>
  );
}

function IncidenciaDetail({ id, navigate }: { id: string; navigate: (v: CertView) => void }) {
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: inc, isLoading, error } = useQuery({
    queryKey: ["cert-incidencia", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("incidencias")
        .select("id, numero, titulo, descripcion, modulo, prioridad, estado, fecha, codigo_transaccion, nombre_transaccion, responsable, fecha_ocurrencia, fecha_completado, created_at, updated_at, proyecto_id")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No encontrada");
      return data as Inc;
    },
  });

  const { data: imgs } = useQuery({
    queryKey: ["cert-incidencia-imgs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("incidencia_imagenes")
        .select("id, storage_path, nombre_original, orden").eq("incidencia_id", id).order("orden", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as Omit<Img, "signed_url">[];
      if (rows.length === 0) return [] as Img[];
      const paths = rows.map((r) => r.storage_path);
      const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrls(paths, 60 * 60);
      const urlMap = new Map((signed ?? []).map((s) => {
        const rawUrl = s.signedUrl ?? (s as { signedURL?: string }).signedURL ?? "";
        return [s.path ?? "", normalizeSignedStorageUrl(rawUrl)];
      }));
      return rows.map((r) => ({ ...r, signed_url: urlMap.get(r.storage_path) ?? "" })) as Img[];
    },
  });

  const images = imgs ?? [];
  const selectedAttachment = previewIndex !== null ? images[previewIndex] : undefined;

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    setPreviewUrl("");
    setPreviewBlob(null);
    setPreviewError(null);

    if (!selectedAttachment) {
      setPreviewLoading(false);
      return () => undefined;
    }

    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(selectedAttachment.storage_path);
        if (error) throw error;
        if (!data) throw new Error("No se pudo cargar el archivo");
        objectUrl = URL.createObjectURL(data);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreviewBlob(data);
        setPreviewUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setPreviewError(e instanceof Error ? e.message : "No se pudo cargar la vista previa");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedAttachment?.storage_path]);

  useEffect(() => {
    if (inc && !editing) {
      setForm({
        titulo: inc.titulo, descripcion: inc.descripcion, modulo: inc.modulo ?? "", prioridad: inc.prioridad,
        fecha: inc.fecha, codigo_transaccion: inc.codigo_transaccion ?? "",
        nombre_transaccion: inc.nombre_transaccion ?? "", responsable: inc.responsable ?? "",
        fecha_ocurrencia: inc.fecha_ocurrencia ?? inc.fecha,
      });
    }
  }, [inc, editing]);

  const cambiarEstado = async (nuevo: Estado) => {
    if (!inc || nuevo === inc.estado) return;
    setUpdating(true);
    const { error } = await supabase.from("incidencias").update({ estado: nuevo }).eq("id", inc.id);
    setUpdating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Estado: ${ESTADO_LABEL[nuevo]}`);
    qc.invalidateQueries({ queryKey: ["cert-incidencia", id] });
  };

  const eliminarAdjunto = async (img: Img) => {
    setDeletingAttachmentId(img.id);
    try {
      const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([img.storage_path]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("incidencia_imagenes").delete().eq("id", img.id);
      if (dbError) throw dbError;
      if (selectedAttachment?.id === img.id) setPreviewIndex(null);
      toast.success("Adjunto eliminado");
      await qc.invalidateQueries({ queryKey: ["cert-incidencia-imgs", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar el adjunto");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const showPreviousAttachment = () => {
    setPreviewIndex((current) => {
      if (current === null || images.length === 0) return current;
      return (current - 1 + images.length) % images.length;
    });
  };

  const showNextAttachment = () => {
    setPreviewIndex((current) => {
      if (current === null || images.length === 0) return current;
      return (current + 1) % images.length;
    });
  };

  const guardarEdicion = async () => {
    if (!inc || !form) return;
    if (!form.titulo.trim() || !form.descripcion.trim()) { toast.error("Título y descripción son obligatorios"); return; }
    setSaving(true);
    const { error } = await supabase.from("incidencias").update({
      titulo: form.titulo.trim(), descripcion: form.descripcion.trim(),
      modulo: form.modulo, prioridad: form.prioridad, fecha: form.fecha,
      codigo_transaccion: form.codigo_transaccion.trim() || null,
      nombre_transaccion: form.nombre_transaccion.trim() || null,
      responsable: form.responsable.trim() || null, fecha_ocurrencia: form.fecha_ocurrencia,
    }).eq("id", inc.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Incidencia actualizada"); setEditing(false);
    qc.invalidateQueries({ queryKey: ["cert-incidencia", id] });
  };

  const eliminar = async () => {
    if (!inc) return;
    setDeleting(true);
    try {
      const paths = (imgs ?? []).map((i) => i.storage_path);
      if (paths.length > 0) await supabase.storage.from(STORAGE_BUCKET).remove(paths);
      await supabase.from("incidencia_imagenes").delete().eq("incidencia_id", inc.id);
      const { error } = await supabase.from("incidencias").delete().eq("id", inc.id);
      if (error) throw error;
      toast.success(`Incidencia #${inc.numero} eliminada`);
      if (inc.proyecto_id) navigate({ name: "proyecto", id: inc.proyecto_id });
      else navigate({ name: "companias" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); setDeleting(false); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !inc) return <Card className="p-12 text-center text-muted-foreground">Incidencia no encontrada</Card>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => inc.proyecto_id ? navigate({ name: "proyecto", id: inc.proyecto_id }) : navigate({ name: "companias" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="h-3.5 w-3.5" /><span className="font-mono">{inc.numero}</span>
            <span>·</span><span>{inc.modulo || '—'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{inc.titulo}</h1>
        </div>
        {!editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Editar</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar incidencia #{inc.numero}?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción es permanente. Se eliminarán también todos los archivos adjuntos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={eliminar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}><X className="h-4 w-4" /> Cancelar</Button>
            <Button size="sm" onClick={guardarEdicion} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {editing && form ? (
            <Card className="space-y-4 p-6">
              <div className="space-y-2"><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea rows={6} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Código transacción</Label><Input value={form.codigo_transaccion} onChange={(e) => setForm({ ...form, codigo_transaccion: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nombre transacción</Label><Input value={form.nombre_transaccion} onChange={(e) => setForm({ ...form, nombre_transaccion: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Responsable</Label><Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" /> Descripción</div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{inc.descripcion}</p>
            </Card>
          )}

          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4" /> Archivos adjuntos ({images.length})</div>
            {images.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin archivos adjuntos</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, i) => {
                  const name = attachmentName(img);
                  const isImg = isImageAttachment(img);
                  const url = img.signed_url || getImagePublicUrl(img.storage_path);
                  return (
                    <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted/40">
                      <Button type="button" variant="ghost" onClick={() => setPreviewIndex(i)} className="h-full w-full rounded-none p-0 hover:bg-muted">
                        {isImg ? (
                          <img src={url} alt={name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <span className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
                            <FileText className="h-10 w-10 text-muted-foreground group-hover:text-foreground" />
                            <span className="line-clamp-2 break-all text-[11px] leading-tight text-muted-foreground group-hover:text-foreground">{name}</span>
                          </span>
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute right-2 top-2 h-7 w-7 opacity-90 shadow-sm"
                            disabled={deletingAttachmentId === img.id}
                            title="Eliminar adjunto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {deletingAttachmentId === img.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar adjunto?</AlertDialogTitle>
                            <AlertDialogDescription>Se eliminará “{name}” de esta incidencia. Esta acción no se puede deshacer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => eliminarAdjunto(img)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 text-sm font-semibold">Estado actual</div>
            <div className={`mb-4 inline-flex w-full items-center justify-center rounded-md border px-3 py-2 text-sm font-medium ${ESTADO_STYLES[inc.estado]}`}>{ESTADO_LABEL[inc.estado]}</div>
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Cambiar estado</div>
            <div className="grid grid-cols-1 gap-2">
              {ESTADOS.map((s) => {
                const active = s === inc.estado;
                return (
                  <Button key={s} variant={active ? "default" : "outline"} size="sm" disabled={updating || active} onClick={() => cambiarEstado(s)} className="justify-start">
                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className={`h-2 w-2 rounded-full ${s === "pendiente" ? "bg-yellow-500" : s === "en_curso" ? "bg-blue-500" : "bg-green-500"}`} />}
                    {ESTADO_LABEL[s]}{active && <span className="ml-auto text-[10px] opacity-70">Actual</span>}
                  </Button>
                );
              })}
            </div>
          </Card>

          {editing && form ? (
            <Card className="space-y-4 p-6">
              <div className="space-y-2"><Label>Sección</Label>
                <Input value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} placeholder="Escribe la sección" />
              </div>
              <div className="space-y-2"><Label>Prioridad</Label>
                <Select value={form.prioridad} onValueChange={(v) => setForm({ ...form, prioridad: v as Prioridad })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{PRIORIDAD_LABEL[p]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Fecha ocurrencia</Label><Input type="date" value={form.fecha_ocurrencia} onChange={(e) => setForm({ ...form, fecha_ocurrencia: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fecha registro</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
              </div>
            </Card>
          ) : (
            <Card className="space-y-3 p-6">
              <Detail label="Prioridad" icon={<Tag className="h-4 w-4" />}><span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${PRIORIDAD_STYLES[inc.prioridad]}`}>{PRIORIDAD_LABEL[inc.prioridad]}</span></Detail>
              <Detail label="Sección" icon={<Tag className="h-4 w-4" />}><span className="text-sm font-medium">{inc.modulo || '—'}</span></Detail>
              <Detail label="Responsable" icon={<User className="h-4 w-4" />}><span className="text-sm font-medium">{inc.responsable ?? <span className="text-muted-foreground italic">Sin asignar</span>}</span></Detail>
              <Detail label="Fecha ocurrencia" icon={<Calendar className="h-4 w-4" />}><span className="text-sm">{inc.fecha_ocurrencia ? format(new Date(inc.fecha_ocurrencia), "d 'de' MMMM yyyy", { locale: es }) : "—"}</span></Detail>
              <Detail label="Fecha registro" icon={<Calendar className="h-4 w-4" />}><span className="text-sm">{format(new Date(inc.fecha), "d 'de' MMMM yyyy", { locale: es })}</span></Detail>
              {inc.fecha_completado && <Detail label="Solventado" icon={<CheckCircle2 className="h-4 w-4" />}><span className="text-sm font-medium text-green-600">{format(new Date(inc.fecha_completado), "d MMM yyyy, HH:mm", { locale: es })}</span></Detail>}
              {inc.codigo_transaccion && <Detail label="Código transacción" icon={<Hash className="h-4 w-4" />}><span className="font-mono text-sm">{inc.codigo_transaccion}</span></Detail>}
              {inc.nombre_transaccion && <Detail label="Nombre transacción" icon={<FileText className="h-4 w-4" />}><span className="text-sm">{inc.nombre_transaccion}</span></Detail>}
              <Detail label="Creada" icon={<Calendar className="h-4 w-4" />}><span className="text-sm text-muted-foreground">{format(new Date(inc.created_at), "d MMM yyyy, HH:mm", { locale: es })}</span></Detail>
            </Card>
          )}
        </div>
      </div>

      <InnerDialog open={previewIndex !== null} onOpenChange={(o) => !o && setPreviewIndex(null)}>
        <InnerDialogContent className="max-w-5xl border-0 bg-background/95 p-0">
          {selectedAttachment && (
            <div className="relative flex max-h-[90vh] min-h-[520px] flex-col">
              <InnerDialogHeader className="border-b px-4 py-3">
                <InnerDialogTitle className="flex items-center gap-2 text-sm">
                  {isImageAttachment(selectedAttachment) ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  <span className="line-clamp-1 break-all">{attachmentName(selectedAttachment)}</span>
                </InnerDialogTitle>
              </InnerDialogHeader>
              <div className="flex h-[72vh] min-h-[420px] items-center justify-center overflow-hidden bg-muted/30">
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando preview…</div>
                ) : previewError ? (
                  <div className="max-w-sm text-center text-sm text-muted-foreground">{previewError}</div>
                ) : previewUrl && isImageAttachment(selectedAttachment) ? (
                  <img src={previewUrl} alt={attachmentName(selectedAttachment)} className="h-full w-full object-contain" />
                ) : previewBlob && isPdfAttachment(selectedAttachment) ? (
                  <PdfAttachmentPreview file={selectedAttachment} blob={previewBlob} />
                ) : (
                  <div className="flex max-w-sm flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
                    <FileText className="h-12 w-12" />
                    <div className="font-medium text-foreground">Preview no disponible</div>
                    <div>Este tipo de archivo no puede previsualizarse directamente en el navegador.</div>
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <>
                  <Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={showPreviousAttachment}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={showNextAttachment}><ChevronRight className="h-4 w-4" /></Button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-xs">{previewIndex !== null ? previewIndex + 1 : 0} / {images.length}</div>
                </>
              )}
            </div>
          )}
        </InnerDialogContent>
      </InnerDialog>
    </div>
  );
}

function Detail({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="text-right">{children}</div>
    </div>
  );
}

/* ============================ NUEVA INCIDENCIA ============================ */
type ProyectoOption = { id: string; nombre: string; compania: { nombre: string } | null };

function NuevaIncidencia({ proyectoId, navigate }: { proyectoId?: string; navigate: (v: CertView) => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    proyecto_id: proyectoId ?? "", sistema_nombre: "", titulo: "", descripcion: "",
    modulo: "", prioridad: "media" as Prioridad,
    codigo_transaccion: "", nombre_transaccion: "", responsable: "",
    fecha_ocurrencia: today, fecha: today,
  });

  const { data: proyectos } = useQuery({
    queryKey: ["cert-proyectos-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proyectos")
        .select("id, nombre, compania:companias(nombre)").eq("archivado", false).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProyectoOption[];
    },
  });

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    const next = [...files, ...incoming].slice(0, 10);
    setFiles(next);
    setPreviews(next.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : "")));
  };

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreviews(next.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : "")));
  };

  const submit = async () => {
    if (!user) { toast.error("Sesión no válida"); return; }
    if (!form.proyecto_id) { toast.error("Selecciona un proyecto"); return; }
    if (form.sistema_nombre.trim().length < 2) { toast.error("Indica el sistema"); return; }
    if (form.titulo.trim().length < 3) { toast.error("Título mínimo 3 caracteres"); return; }
    if (form.descripcion.trim().length < 5) { toast.error("Descripción mínimo 5 caracteres"); return; }
    if (form.responsable.trim().length < 2) { toast.error("Indica el responsable"); return; }

    setSubmitting(true);
    try {
      const { data: inc, error: insErr } = await supabase.from("incidencias").insert({
        proyecto_id: form.proyecto_id, sistema_nombre: form.sistema_nombre,
        titulo: form.titulo, descripcion: form.descripcion,
        modulo: form.modulo, prioridad: form.prioridad,
        codigo_transaccion: form.codigo_transaccion || null,
        nombre_transaccion: form.nombre_transaccion || null,
        responsable: form.responsable, fecha_ocurrencia: form.fecha_ocurrencia,
        fecha: form.fecha, created_by: user.id,
      }).select("id, numero").single();
      if (insErr) throw insErr;

      const failed: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `${inc.id}/${Date.now()}_${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) { failed.push(file.name); continue; }
        const { error: imgErr } = await supabase.from("incidencia_imagenes").insert({
          incidencia_id: inc.id, storage_path: path, nombre_original: file.name, orden: i,
        });
        if (imgErr) failed.push(file.name);
      }

      await qc.invalidateQueries({ queryKey: ["cert-proyecto-incidencias", form.proyecto_id] });
      if (failed.length > 0) toast.warning(`Incidencia #${inc.numero} creada, pero ${failed.length} imagen(es) fallaron`);
      else toast.success(`Incidencia #${inc.numero} creada`);
      navigate({ name: "incidencia", id: inc.id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => proyectoId ? navigate({ name: "proyecto", id: proyectoId }) : navigate({ name: "companias" })}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva incidencia</h1>
          <p className="text-sm text-muted-foreground">Registra una nueva incidencia del ERP</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Proyecto *</Label>
              <Select value={form.proyecto_id} onValueChange={(v) => setForm({ ...form, proyecto_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
                <SelectContent>
                  {(proyectos ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.compania?.nombre ? `${p.compania.nombre} — ${p.nombre}` : p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nombre del sistema *</Label><Input value={form.sistema_nombre} onChange={(e) => setForm({ ...form, sistema_nombre: e.target.value })} placeholder="Ej. Softland Nómina, SAP, Odoo…" /></div>
          </div>

          <div className="space-y-2"><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="space-y-2"><Label>Descripción *</Label><Textarea rows={5} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Sección</Label>
              <Input value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} placeholder="Escribe la sección" />
            </div>
            <div className="space-y-2"><Label>Prioridad *</Label>
              <Select value={form.prioridad} onValueChange={(v) => setForm({ ...form, prioridad: v as Prioridad })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{PRIORIDAD_LABEL[p]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>Responsable *</Label><Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></div>
            <div className="space-y-2"><Label>Fecha ocurrencia *</Label><Input type="date" value={form.fecha_ocurrencia} onChange={(e) => setForm({ ...form, fecha_ocurrencia: e.target.value })} /></div>
            <div className="space-y-2"><Label>Fecha registro *</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Código transacción</Label><Input value={form.codigo_transaccion} onChange={(e) => setForm({ ...form, codigo_transaccion: e.target.value })} placeholder="Ej. VA001" /></div>
            <div className="space-y-2"><Label>Nombre transacción</Label><Input value={form.nombre_transaccion} onChange={(e) => setForm({ ...form, nombre_transaccion: e.target.value })} placeholder="Ej. Crear factura" /></div>
          </div>

          <div className="space-y-2">
            <Label>Archivos adjuntos ({files.length}/10)</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center hover:bg-muted/50">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="text-sm font-medium">Click para subir archivos</div>
              <div className="text-xs text-muted-foreground">PDF, Word, Excel, imágenes y otros — hasta 10 archivos</div>
              <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {files.map((file, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                    {previews[i] ? (
                      <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="line-clamp-2 text-[10px] text-muted-foreground break-all">{file.name}</div>
                      </div>
                    )}
                    <button type="button" onClick={() => removeFile(i)} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 hover:bg-destructive hover:text-destructive-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => proyectoId ? navigate({ name: "proyecto", id: proyectoId }) : navigate({ name: "companias" })}>Cancelar</Button>
            <Button onClick={submit} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Crear incidencia</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
