import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ========== Conocimiento estático del departamento de Procesos ==========
// Se inyecta como contexto en el prompt del sistema (no cambia con cada
// consulta), para que el asistente pueda responder preguntas generales sin
// necesidad de una herramienta.
const descripcionDepartamento = `
El departamento de procesos de Mayoreo es el responsable de diseñar, documentar, normalizar y mejorar continuamente los procesos de negocio a nivel internacional.

Somos una organización con presencia internacional, y el departamento de procesos asegura que todas las operaciones (Logística, Compras, Ventas, Personal, Control, Mercadeo, Sistemas) funcionen bajo los mismos estándares de calidad, eficiencia y mejora continua.

¿QUÉ HACEMOS?
- Diseñamos y coordinamos el plan de normalización de procesos del negocio.
- Documentamos las "mejores prácticas conocidas hasta el momento" bajo la figura de NORMAS.
- Identificamos áreas de mejora en los procesos para optimizar recursos y reducir costos.
- Implementamos mejoras y optimizaciones para garantizar calidad y efectividad.
- Mantenemos actualizada la documentación de todos los silos.
- Evaluamos la madurez y eficiencia de los procesos.
- Promovemos una cultura de mejora continua y estandarización.

¿QUÉ PROBLEMAS RESOLVEMOS?
- Falta de estandarización entre áreas y países.
- Pérdida de conocimiento crítico cuando un colaborador se va.
- Procesos ineficientes que generan pérdida de tiempo y recursos.
- Dificultad para medir el desempeño real de la operación.
- Variabilidad en la calidad del trabajo entre diferentes silos.

¿CÓMO TRABAJAMOS?
- Aplicamos pensamiento científico: observar, hipotetizar, probar, medir, documentar.
- Nos regimos por el principio de mejora continua: nunca nos conformamos con el éxito.
- Las NORMAS son la "mejor práctica conocida hasta el momento", pero siempre las retamos.
- Coordinamos con todos los departamentos porque los procesos cruzan toda la organización.
- Documentamos procedimientos, flujos y tareas en los sistemas (eflow WMS, Softland, etc.).

NUESTRA ESTRUCTURA (3 roles clave):
1. JEFE DE PROCESOS (no es responsable de métodos): diseña, lidera y coordina el plan de normalización, supervisa proyectos de mejora, evalúa madurez de procesos, dirige la documentación. Le reportan 1 Coordinador y 4 Asesores de Procesos.
2. COORDINADOR DE PROCESOS (sí es responsable de métodos): supervisa, optimiza y garantiza el correcto funcionamiento de los procesos, identifica mejoras, elabora reportes de desempeño. Le reportan 5 Asesores de Procesos.
3. ASESOR DE PROCESOS (sí es responsable de métodos): diseña, modela, analiza y normaliza los procesos, mantiene la documentación actualizada y publicada, investiga metodologías de mejora.
`.trim();

const misionVisionValores = `
MISIÓN MAYOREO: Ofrecer la mejor opción en servicio, surtido y precio del mercado.
VISIÓN MAYOREO: Ser el mayorista preferido de nuestros clientes, proveedores, colaboradores, accionistas y comunidades donde operamos.
VALORES MAYOREO:
1. HONRADEZ: orientados a la verdad, cumplimos compromisos, respetamos la propiedad intelectual, nos regimos por las leyes, denunciamos el robo.
2. IGUALDAD: todos servimos al cliente, las normas son para todos, mismas oportunidades, somos accesibles, mismos derechos.
3. CONSTANCIA: nos exigimos efectividad, somos inconformes con el éxito, preferimos la proactividad, reconocemos el mérito, comprometidos con la sucesión.
`.trim();

const silos = [
  { nombre: "LOGÍSTICA", responsable: "Stephanie Araya (saraya@mayoreo.biz)", grupoBPA: "CV (Cadena de Valor) - CVP06 a CVP15", procesos: ["Alisto y facturación", "Comercio Exterior", "Despacho y Transporte", "Recepción y Almacenaje de Mercancía", "Atención al cliente", "Compra", "Gestión de inventario", "Logística 3PL"] },
  { nombre: "PERSONAL", responsable: "Angely Ojeda (aojeda@mayoreo.biz)", grupoBPA: "SOP (Soporte) - SOP06", procesos: ["Captación", "Desarrollo", "Administracion de Personal", "Seguridad y salud laboral", "Servicios internos"] },
  { nombre: "COMPRAS", responsable: "Ambar Pulido (apulido@mayoreo.biz)", grupoBPA: "CV (Cadena de Valor) - CVP04, CVP05", procesos: ["Definición de Surtido", "Estudio de Factibilidad", "Negociación con Proveedores", "Compra", "Seguimiento Proveedores"] },
  { nombre: "VENTAS", responsable: "Mayte Zarraga (mzarraga@mayoreo.biz)", grupoBPA: "CV (Cadena de Valor) - CVP07 a CVP11, CVP14, CVP15", procesos: ["Administración de Clientes", "Evaluación potencial de la zona", "Administración de Ventas", "Negociación de Venta", "Administración de Cobranza"] },
  { nombre: "MERCADEO", responsable: "Mayte Zarraga (mzarraga@mayoreo.biz)", grupoBPA: "SOP (Soporte) - SOP10, SOP11", procesos: ["Gestión de Comunicación", "Gestión de Publicidad", "Oferta del Producto"] },
  { nombre: "CONTROL", responsable: "Paola Rodriguez (prodriguez@mayoreo.biz)", grupoBPA: "SOP (Soporte) - SOP01, SOP02, SOP03, SOP09", procesos: ["Ejecución y Control del Plan Financiero", "Gestión de Crédito y Cobranza", "Control de Inventarios", "Registro y Control de las Operaciones Contables", "Legal", "Monitoreo"] },
  { nombre: "SISTEMAS", responsable: "Edgar Monagas (emonagas@mayoreo.biz)", grupoBPA: "SOP (Soporte) - SOP08", procesos: ["Seguridad", "Procesos y sistemas"] },
];
const silosTexto = silos.map(s => `- ${s.nombre}: responsable de métodos ${s.responsable}. Grupo BPA: ${s.grupoBPA}. Procesos: ${s.procesos.join(", ")}.`).join("\n");

// ========== Enums válidos (para que el modelo arme filtros correctos) ==========
const SEGUIMIENTO_ESTADOS = ["pendiente", "en_revision", "en_progreso", "completado", "cancelado"];
const INCIDENCIA_ESTADOS = ["pendiente", "en_curso", "resuelto"];
const SILO_VALUES = ["compras", "logistica", "ventas", "personal", "control", "mercadeo", "sistemas", "procesos", "datos_maestros"];
const DOC_TYPES = ["norma", "manual", "procedimiento", "anexo", "formato", "diagrama", "instructivo", "politica", "descripcion_cargo", "libro", "presentacion_clave", "presentacion", "gestion_beneficios"];
const DOC_ESTATUS = ["aprobado", "revision", "desactualizado", "desincorporado", "en_construccion", "por_iniciar"];

const PROJECT_ESTADOS = ["en_progreso", "completado", "cancelado", "detenido"];
const CRONOGRAMA_ESTADOS = ["pendiente", "en_progreso", "completado"];

function buildSystemInstruction(fullName: string | null, misSilos: string[]): string {
  const hoy = new Date().toLocaleDateString("es-VE", { timeZone: "America/Caracas", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `
Eres el asistente del Sistema Integral de Gestión de Procesos de Mayoreo. Tu trabajo es CONSULTAR los datos del sistema y responder con ellos, de forma breve y exacta. No eres un consultor general ni un redactor.

Hoy es ${hoy}. Usuario: ${fullName ?? "sin nombre registrado"}${misSilos.length ? ` (silo: ${misSilos.join(", ")})` : ""}.

=== REGLAS (obligatorias) ===
1. Responde SOLO con datos que obtuviste de las consultas o del bloque REFERENCIA de abajo. Si el dato no está, di exactamente qué no encontraste ("No encontré proyectos de Ventas en progreso") y sugiere dónde buscarlo. Nunca completes con suposiciones, ejemplos inventados, "buenas prácticas" ni explicaciones generales.
2. Antes de responder cualquier pregunta sobre proyectos, tareas, pendientes, documentos, normas, mapa, cronograma, indicadores o incidencias, HAZ LA CONSULTA, aunque creas saber la respuesta.
3. Brevedad: máximo 6 líneas. Empieza por la respuesta directa (la cifra, el nombre, el estado). Para listas, usa líneas que empiecen con "- " y como mucho 8 elementos; si hay más, di cuántos faltan. Sin introducciones, sin despedidas, sin repetir la pregunta.
4. Para "cuántos" usa siempre el campo "total" del resultado (es la cuenta real aunque la lista venga recortada).
5. No des consejos, planes, ni opiniones salvo que te los pidan expresamente; si te los piden, basa cada punto en un dato del sistema.
6. Si la pregunta no tiene que ver con el sistema, los procesos o la metodología de Mayoreo, responde en una línea que solo puedes ayudar con eso.
7. Si la pregunta es ambigua (p. ej. "¿cómo va el proyecto?" sin decir cuál), pide la aclaración en una línea en vez de adivinar.
8. Nunca menciones "herramienta", "consulta", "JSON" ni detalles técnicos.

=== CONSULTAS DISPONIBLES ===
Todas respetan los permisos del usuario. Cada resultado trae "total" (cuenta real) y una lista recortada.

- mis_pendientes {}  → lo asignado al usuario actual: seguimientos activos donde es miembro o dueño, tareas de proyectos asignadas sin completar y actividades del cronograma a su cargo. Úsala para "qué tengo pendiente", "mis tareas", "qué debo hacer".
- proyectos_buscar { query?, silo?: ${SILO_VALUES.join("|")}, estado?: ${PROJECT_ESTADOS.join("|")} }  → proyectos con fase, fechas, % avance real, % planificado, desviación y tareas atrasadas.
- cronograma_buscar { query?, responsable?: nombre, mes?: 1-12, estado?: ${CRONOGRAMA_ESTADOS.join("|")}, anio? }  → actividades del cronograma de la Reunión Operativa, con proceso, meses, estado y responsable.
- seguimientos_buscar { query?, estado?: ${SEGUIMIENTO_ESTADOS.join("|")}, solo_vencidos?: boolean }  → seguimientos (tarjetas de los tableros).
- seguimientos_analizar {}  → conteos ya calculados de los seguimientos del usuario (por estado, vencidos, % cumplimiento). Nunca calcules porcentajes a mano.
- mapa_buscar { query?, silo?, codigo?, estatus?: ${DOC_ESTATUS.join("|")}, doc_type?: ${DOC_TYPES.join("|")} }  → documentos del Mapa de Procesos con su código (p. ej. SOP06-A1-T1-NO01), macroproceso, proceso, subproceso, estatus y fecha de actualización. Úsala para preguntas por código, macroproceso o proceso.
- documentos_buscar { query?, silo?, doc_type?, estatus? }  → repositorio de documentos (archivos en Drive). Para "normas", "manuales", etc. usa doc_type, no query. "query" busca todas las palabras en el título o el código.
- indicadores_buscar { query?, silo? }  → indicadores (KPI) con fórmula, meta y responsable.
- incidencias_buscar { query?, estado?: ${INCIDENCIA_ESTADOS.join("|")} }  → incidencias de CertificaERP.

Silos válidos: ${SILO_VALUES.join(", ")}. Tipos de documento: ${DOC_TYPES.join(", ")}.

=== REFERENCIA (solo para preguntas sobre el departamento, la metodología o quién es responsable de un silo) ===
${descripcionDepartamento}

${misionVisionValores}

Responsables de métodos por silo:
${silosTexto}

Grupos BPA: PL (Planificación) PL01-PL03, CV (Cadena de Valor) CVP01-CVP15, SOP (Soporte) SOP01-SOP11.

=== FORMATO DE SALIDA ===
Responde SIEMPRE con un único objeto JSON, sin texto fuera de él:
- Para consultar: {"type":"tool_call","tool":"<nombre>","params":{...}}
- Para responder: {"type":"final","answer":"<texto plano en español, sin markdown>","links":[{"label":"<texto corto>","path":"<ruta>"}]}
"links" (opcional, máximo 3) lleva a la pantalla donde está el dato. Usa SOLO rutas que vengan en el campo "ruta" de los resultados, o estas: /proyectos, /seguimientos, /documentos, /mapa-procesos, /indicadores, /desarrollos, /bpa.
`.trim();
}

// ========== Ejecutores de herramientas (RLS-aware: usan el cliente del usuario) ==========
function safeIlikeTerm(q: unknown): string | null {
  if (typeof q !== "string") return null;
  const term = q.trim().replace(/[%,]/g, "");
  return term.length > 0 ? term : null;
}

async function toolSeguimientosBuscar(client: SupabaseClient, params: any) {
  let q = client.from("seguimientos").select("id,titulo,descripcion,estado,prioridad,fecha_limite,fecha_completado,proyecto,board_id,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(40);
  const term = safeIlikeTerm(params?.query);
  if (term) q = q.or(`titulo.ilike.%${term}%,descripcion.ilike.%${term}%`);
  if (SEGUIMIENTO_ESTADOS.includes(params?.estado)) q = q.eq("estado", params.estado);
  if (params?.solo_vencidos) {
    const hoy = new Date().toISOString().slice(0, 10);
    q = q.lt("fecha_limite", hoy).not("estado", "in", "(completado,cancelado)");
  }
  const { data, error, count } = await q;
  if (error) return { error: error.message };
  // "total" es la cuenta real que cumple el filtro (aunque la lista de
  // ejemplos venga recortada a 40) — así "cuántos" nunca queda truncado.
  return { total: count ?? (data ?? []).length, mostrados: (data ?? []).length, seguimientos: data ?? [] };
}

async function toolSeguimientosAnalizar(client: SupabaseClient) {
  const { data, error } = await client.from("seguimientos").select("estado,prioridad,fecha_limite,fecha_completado,created_at").limit(500);
  if (error) return { error: error.message };
  const rows = (data ?? []) as any[];
  const hoy = new Date();
  const en7dias = new Date(hoy.getTime() + 7 * 86_400_000);
  const porEstado: Record<string, number> = {};
  const porPrioridad: Record<string, number> = {};
  let vencidos = 0, proximosAVencer = 0, completadosUltimos30Dias = 0;

  for (const r of rows) {
    porEstado[r.estado] = (porEstado[r.estado] ?? 0) + 1;
    porPrioridad[r.prioridad] = (porPrioridad[r.prioridad] ?? 0) + 1;
    const activo = r.estado !== "completado" && r.estado !== "cancelado";
    if (activo && r.fecha_limite) {
      const f = new Date(r.fecha_limite);
      if (f < hoy) vencidos++;
      else if (f <= en7dias) proximosAVencer++;
    }
    if (r.estado === "completado" && r.fecha_completado) {
      const dias = (hoy.getTime() - new Date(r.fecha_completado).getTime()) / 86_400_000;
      if (dias <= 30) completadosUltimos30Dias++;
    }
  }

  const completados = porEstado["completado"] ?? 0;
  const cancelados = porEstado["cancelado"] ?? 0;
  const cerrados = completados + cancelados;
  const tasaCumplimientoPct = cerrados > 0 ? Math.round((completados / cerrados) * 100) : null;

  return {
    total: rows.length,
    por_estado: porEstado,
    por_prioridad: porPrioridad,
    vencidos,
    proximos_a_vencer_7_dias: proximosAVencer,
    completados_ultimos_30_dias: completadosUltimos30Dias,
    tasa_cumplimiento_pct: tasaCumplimientoPct,
  };
}

/** Palabras de búsqueda (sin signos que rompan el filtro de PostgREST). */
function palabras(q: unknown): string[] {
  if (typeof q !== "string") return [];
  return q.replace(/[%,()*.:"']/g, " ").split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 2).slice(0, 6);
}

async function toolDocumentosBuscar(client: SupabaseClient, params: any) {
  let q = client.from("documents")
    .select("id,title,codigo,doc_type,silo,estatus,confidential,drive_link", { count: "exact" })
    .is("drive_eliminado_at", null)
    .order("updated_at", { ascending: false }).limit(25);
  // Cada palabra debe aparecer en el título o en el código (búsqueda por palabras, no frase exacta).
  for (const w of palabras(params?.query)) q = q.or(`title.ilike.%${w}%,codigo.ilike.%${w}%`);
  if (SILO_VALUES.includes(params?.silo)) q = q.eq("silo", params.silo);
  if (DOC_TYPES.includes(params?.doc_type)) q = q.eq("doc_type", params.doc_type);
  if (DOC_ESTATUS.includes(params?.estatus)) q = q.eq("estatus", params.estatus);
  const { data, error, count } = await q;
  if (error) return { error: error.message };
  return {
    total: count ?? (data ?? []).length, mostrados: (data ?? []).length,
    documentos: (data ?? []).map((d: any) => ({ ...d, ruta: `/documentos?silo=${d.silo}` })),
  };
}

async function toolMapaBuscar(client: SupabaseClient, params: any) {
  let q = client.from("documents")
    .select("id,codigo,title,doc_type,silo,estatus,fecha_actualizacion,macroproceso,proceso,subproceso,drive_link", { count: "exact" })
    .eq("empresa", "mayoreo").not("macroproceso_codigo", "is", null)
    .order("codigo").limit(25);
  for (const w of palabras(params?.query)) {
    q = q.or(`title.ilike.%${w}%,codigo.ilike.%${w}%,macroproceso.ilike.%${w}%,proceso.ilike.%${w}%,subproceso.ilike.%${w}%`);
  }
  const codigo = safeIlikeTerm(params?.codigo);
  if (codigo) q = q.ilike("codigo", `%${codigo}%`);
  if (SILO_VALUES.includes(params?.silo)) q = q.eq("silo", params.silo);
  if (DOC_TYPES.includes(params?.doc_type)) q = q.eq("doc_type", params.doc_type);
  if (DOC_ESTATUS.includes(params?.estatus)) q = q.eq("estatus", params.estatus);
  const { data, error, count } = await q;
  if (error) return { error: error.message };
  return {
    total: count ?? (data ?? []).length, mostrados: (data ?? []).length,
    documentos: (data ?? []).map((d: any) => ({ ...d, tiene_archivo: !!d.drive_link, ruta: `/mapa-procesos?silo=${d.silo}` })),
  };
}

/** Días hábiles (lun-vie) entre dos fechas, como en la pantalla de Proyectos. */
function diasHabiles(a: Date, b: Date): number {
  let n = 0;
  const d = new Date(a);
  while (d < b) { const w = d.getDay(); if (w !== 0 && w !== 6) n++; d.setDate(d.getDate() + 1); }
  return n;
}

async function toolProyectosBuscar(client: SupabaseClient, params: any) {
  let q = client.from("projects")
    .select("id,name,silo,phase,estado,start_date,end_date,responsible,priority,stop_reason", { count: "exact" })
    .order("start_date", { ascending: false }).limit(20);
  for (const w of palabras(params?.query)) q = q.ilike("name", `%${w}%`);
  if (SILO_VALUES.includes(params?.silo)) q = q.eq("silo", params.silo);
  if (PROJECT_ESTADOS.includes(params?.estado)) q = q.eq("estado", params.estado);
  const { data, error, count } = await q;
  if (error) return { error: error.message };
  const proyectos = (data ?? []) as any[];
  const ids = proyectos.map((p) => p.id);
  const { data: tareas } = ids.length
    ? await client.from("project_tasks").select("project_id,name,status,progress_percent,end_date").in("project_id", ids)
    : { data: [] as any[] };
  const hoy = new Date();
  const hoyIso = hoy.toISOString().slice(0, 10);
  return {
    total: count ?? proyectos.length, mostrados: proyectos.length,
    proyectos: proyectos.map((p) => {
      const ts = ((tareas ?? []) as any[]).filter((t) => t.project_id === p.id);
      // Mismo cálculo que la pantalla de Proyectos.
      const real = ts.length ? ts.reduce((s, t) => s + (t.status === "Completada" ? 100 : Number(t.progress_percent ?? 0)), 0) / ts.length : null;
      let plan: number | null = null;
      if (p.start_date && p.end_date) {
        const ini = new Date(p.start_date), fin = new Date(p.end_date), tot = diasHabiles(ini, fin);
        plan = tot <= 0 ? 0 : hoy >= fin ? 100 : hoy <= ini ? 0 : (diasHabiles(ini, hoy) / tot) * 100;
      }
      const atrasadas = ts.filter((t) => t.status !== "Completada" && t.end_date && t.end_date < hoyIso);
      return {
        nombre: p.name, silo: p.silo, estado: p.estado, fase: p.phase, inicio: p.start_date, cierre: p.end_date,
        responsable: p.responsible, motivo_detencion: p.stop_reason,
        avance_real_pct: real === null ? null : Math.round(real * 10) / 10,
        avance_planificado_pct: plan === null ? null : Math.round(plan * 10) / 10,
        desviacion_pct: real === null || plan === null ? null : Math.round((real - plan) * 10) / 10,
        tareas_total: ts.length, tareas_atrasadas: atrasadas.length,
        ejemplos_atrasadas: atrasadas.slice(0, 5).map((t) => ({ tarea: t.name, vencio: t.end_date })),
        ruta: "/proyectos",
      };
    }),
  };
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

async function nombresDeUsuarios(client: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!unicos.length) return new Map();
  const { data } = await client.from("profiles").select("user_id,full_name").in("user_id", unicos);
  return new Map(((data ?? []) as any[]).map((p) => [p.user_id, p.full_name]));
}

async function toolCronogramaBuscar(client: SupabaseClient, params: any) {
  const anio = Number(params?.anio) || new Date().getFullYear();
  let q = client.from("cronograma_actividades")
    .select("id,nombre,meses,estado,anio,responsable_user_id,seguimiento_id,proceso:cronograma_procesos(nombre,board:seguimiento_boards(nombre))", { count: "exact" })
    .eq("anio", anio).order("orden").limit(200);
  for (const w of palabras(params?.query)) q = q.ilike("nombre", `%${w}%`);
  if (CRONOGRAMA_ESTADOS.includes(params?.estado)) q = q.eq("estado", params.estado);
  const mes = Number(params?.mes);
  if (mes >= 1 && mes <= 12) q = q.contains("meses", [mes]);
  const { data, error } = await q;
  if (error) return { error: error.message };
  let filas = (data ?? []) as any[];
  const nombres = await nombresDeUsuarios(client, filas.map((a) => a.responsable_user_id));
  const resp = typeof params?.responsable === "string" ? params.responsable.toLowerCase().trim() : "";
  if (resp) filas = filas.filter((a) => (nombres.get(a.responsable_user_id) ?? "").toLowerCase().includes(resp));
  return {
    total: filas.length, mostrados: Math.min(filas.length, 40),
    actividades: filas.slice(0, 40).map((a) => ({
      actividad: a.nombre, proceso: a.proceso?.nombre, reunion: a.proceso?.board?.nombre, anio: a.anio,
      meses: (a.meses ?? []).map((m: number) => MESES[m - 1]).join(", "), estado: a.estado,
      responsable: nombres.get(a.responsable_user_id) ?? "Sin asignar",
      ruta: a.seguimiento_id ? `/seguimientos?card=${a.seguimiento_id}` : "/seguimientos?tab=reunion_operativa",
    })),
  };
}

async function toolMisPendientes(client: SupabaseClient, _params: any, userId: string) {
  const hoyIso = new Date().toISOString().slice(0, 10);
  const mesActual = new Date().getMonth() + 1;
  const [miembro, propios, asignadasA, asignadasB, cron] = await Promise.all([
    client.from("seguimiento_miembros").select("seguimiento_id").eq("member_user_id", userId),
    client.from("seguimientos").select("id").eq("user_id", userId),
    client.from("project_task_assignees").select("task_id").eq("user_id", userId),
    client.from("project_tasks").select("id").eq("assignee_id", userId),
    client.from("cronograma_actividades").select("nombre,meses,estado,seguimiento_id,proceso:cronograma_procesos(nombre)")
      .eq("responsable_user_id", userId).eq("anio", new Date().getFullYear()).neq("estado", "completado"),
  ]);
  const segIds = [...new Set([...(miembro.data ?? []), ...(propios.data ?? []).map((s: any) => ({ seguimiento_id: s.id }))].map((m: any) => m.seguimiento_id))];
  const { data: segs } = segIds.length
    ? await client.from("seguimientos").select("id,titulo,estado,prioridad,fecha_limite").in("id", segIds).not("estado", "in", "(completado,cancelado)").order("fecha_limite", { ascending: true, nullsFirst: false })
    : { data: [] as any[] };
  const tareaIds = [...new Set([...(asignadasA.data ?? []).map((t: any) => t.task_id), ...(asignadasB.data ?? []).map((t: any) => t.id)])];
  const { data: tareas } = tareaIds.length
    ? await client.from("project_tasks").select("name,status,end_date,project:projects(name,estado)").in("id", tareaIds).neq("status", "Completada").order("end_date", { ascending: true, nullsFirst: false })
    : { data: [] as any[] };
  const tareasActivas = ((tareas ?? []) as any[]).filter((t) => !t.project || t.project.estado === "en_progreso");
  const actividades = ((cron.data ?? []) as any[]).filter((a) => (a.meses ?? []).some((m: number) => m >= mesActual));
  return {
    seguimientos: {
      total: (segs ?? []).length,
      vencidos: ((segs ?? []) as any[]).filter((s) => s.fecha_limite && s.fecha_limite < hoyIso).length,
      lista: ((segs ?? []) as any[]).slice(0, 10).map((s) => ({ titulo: s.titulo, estado: s.estado, prioridad: s.prioridad, vence: s.fecha_limite, ruta: `/seguimientos?card=${s.id}` })),
    },
    tareas_de_proyectos: {
      total: tareasActivas.length,
      vencidas: tareasActivas.filter((t) => t.end_date && t.end_date < hoyIso).length,
      lista: tareasActivas.slice(0, 10).map((t) => ({ tarea: t.name, proyecto: t.project?.name, estado: t.status, vence: t.end_date, ruta: "/proyectos" })),
    },
    actividades_cronograma: {
      total: actividades.length,
      lista: actividades.slice(0, 10).map((a) => ({
        actividad: a.nombre, proceso: a.proceso?.nombre, estado: a.estado,
        proximo_mes: MESES[Math.min(...(a.meses as number[]).filter((m) => m >= mesActual)) - 1],
        ruta: a.seguimiento_id ? `/seguimientos?card=${a.seguimiento_id}` : "/seguimientos?tab=reunion_operativa",
      })),
    },
  };
}

async function toolIncidenciasBuscar(client: SupabaseClient, params: any) {
  let q = client.from("incidencias").select("id,numero,titulo,estado,prioridad,fecha,fecha_completado,modulo,responsable,sistema_nombre", { count: "exact" }).order("fecha", { ascending: false }).limit(30);
  const term = safeIlikeTerm(params?.query);
  if (term) q = q.ilike("titulo", `%${term}%`);
  if (INCIDENCIA_ESTADOS.includes(params?.estado)) q = q.eq("estado", params.estado);
  const { data, error, count } = await q;
  if (error) return { error: error.message };
  return { total: count ?? (data ?? []).length, mostrados: (data ?? []).length, incidencias: data ?? [] };
}

async function toolIndicadoresBuscar(client: SupabaseClient, params: any) {
  let q = client.from("indicators").select("id,name,silo,related_process,indicator_type,definition,formula,unit,frequency,responsible,goals,estado", { count: "exact" }).order("name").limit(30);
  const term = safeIlikeTerm(params?.query);
  if (term) q = q.ilike("name", `%${term}%`);
  if (SILO_VALUES.includes(params?.silo)) q = q.eq("silo", params.silo);
  const { data, error, count } = await q;
  if (error) return { error: error.message };
  return { total: count ?? (data ?? []).length, mostrados: (data ?? []).length, indicadores: data ?? [] };
}

const TOOLS: Record<string, (client: SupabaseClient, params: any, userId: string) => Promise<any>> = {
  mis_pendientes: toolMisPendientes,
  proyectos_buscar: toolProyectosBuscar,
  cronograma_buscar: toolCronogramaBuscar,
  seguimientos_buscar: toolSeguimientosBuscar,
  seguimientos_analizar: (client) => toolSeguimientosAnalizar(client),
  mapa_buscar: toolMapaBuscar,
  documentos_buscar: toolDocumentosBuscar,
  incidencias_buscar: toolIncidenciasBuscar,
  indicadores_buscar: toolIndicadoresBuscar,
};

async function safeExec(tool: string, client: SupabaseClient, params: any, userId: string) {
  const exec = TOOLS[tool];
  if (!exec) return { error: `Consulta desconocida: ${tool}. Usa una de: ${Object.keys(TOOLS).join(", ")}` };
  try {
    return await exec(client, params ?? {}, userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error ejecutando la herramienta" };
  }
}

// ========== Llamada a Gemini (mismo patrón que generate-skill-document) ==========
const RETRYABLE_STATUS = new Set([429, 503]);
const MAX_ATTEMPTS = 2;
// Supabase corta la función a los 150 s: se deja margen para responder siempre.
const PRESUPUESTO_MS = 100_000;
const TIMEOUT_LLAMADA_MS = 20_000;
// Cada ronda con tool_call consume una llamada a Gemini adicional — el plan
// gratuito de la API tiene una cuota diaria muy chica (ver QuotaExceededError
// más abajo), así que se limita el encadenado de herramientas por pregunta.
const MAX_TOOL_ROUNDS = 4;

class QuotaExceededError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Si el modelo principal está saturado (503), se prueba el siguiente en vez de fallar.
const MODELOS = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];

class ModeloSaturadoError extends Error {}

async function callGemini(systemInstruction: string, contents: any[], apiKey: string, limite: number): Promise<string> {
  let ultimo: unknown = null;
  for (const modelo of MODELOS) {
    try {
      return await callGeminiModelo(modelo, systemInstruction, contents, apiKey, limite);
    } catch (e) {
      ultimo = e;
      // Solo se cambia de modelo por saturación o modelo inexistente; la cuota diaria agotada corta de una vez.
      if (e instanceof QuotaExceededError) throw e;
      if (!(e instanceof ModeloSaturadoError)) throw e;
      console.warn(`ai-assistant: ${modelo} no disponible, probando el siguiente modelo`);
    }
  }
  throw ultimo;
}

async function callGeminiModelo(modelo: string, systemInstruction: string, contents: any[], apiKey: string, limite: number): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;

  let lastErrText = "";
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const restante = limite - Date.now();
    if (restante < 5_000) throw new ModeloSaturadoError("Sin tiempo para otra llamada a Gemini");
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Gemini saturado puede tardar minutos en contestar: se corta antes.
        signal: AbortSignal.timeout(Math.min(TIMEOUT_LLAMADA_MS, restante - 3_000)),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          // Temperatura baja: respuestas apegadas a los datos, no creativas.
          generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 1024 },
        }),
      });
    } catch (e) {
      lastStatus = 0;
      lastErrText = e instanceof Error ? e.message : String(e);
      console.warn(`ai-assistant: ${modelo} no respondió a tiempo (intento ${attempt})`);
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      if (!text) throw new Error("Gemini no devolvió contenido.");
      return text;
    }

    lastStatus = res.status;
    lastErrText = await res.text();

    // Un 429 por cuota DIARIA agotada no se arregla reintentando en
    // segundos — falla rápido con un error identificable en vez de gastar
    // los reintentos (que además son parte de esa misma cuota).
    if (res.status === 429 && /PerDay|RESOURCE_EXHAUSTED/i.test(lastErrText)) {
      throw new QuotaExceededError(`Gemini quota diaria agotada: ${lastErrText}`);
    }

    // Modelo inexistente o retirado: que pruebe el siguiente de la lista.
    if (res.status === 404) throw new ModeloSaturadoError(`Modelo ${modelo} no encontrado`);
    if (!RETRYABLE_STATUS.has(res.status)) {
      throw new Error(`Gemini API error (${res.status}): ${lastErrText}`);
    }
    if (attempt === MAX_ATTEMPTS) break;
    await sleep(attempt * 1500);
  }

  throw new ModeloSaturadoError(`Gemini ${modelo} no disponible (${lastStatus}): ${lastErrText.slice(0, 300)}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return json({ error: "Falta configurar el secreto GEMINI_API_KEY en Supabase." }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    // Cliente autenticado como el usuario que consulta: toda búsqueda queda
    // automáticamente acotada por las mismas políticas RLS que ya rigen el
    // resto de la app (nadie ve más de lo que ya podría ver navegando).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return json({ error: "Debes iniciar sesión para usar el asistente." }, 401);
    }

    const body = await req.json();
    const rawMessages: { role: string; content: string }[] = Array.isArray(body?.messages)
      ? body.messages
      : (typeof body?.question === "string" ? [{ role: "user", content: body.question }] : []);
    if (rawMessages.length === 0) {
      return json({ answer: "Por favor, escribe una pregunta." });
    }

    const [{ data: profile }, { data: silosRows }] = await Promise.all([
      userClient.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      userClient.from("user_silos").select("silo").eq("user_id", user.id),
    ]);
    const misSilos = ((silosRows ?? []) as any[]).map((s) => s.silo).filter(Boolean);
    const systemInstruction = buildSystemInstruction((profile as any)?.full_name ?? null, misSilos);

    // Historial visible para el modelo, dentro de una sola ronda de turnos
    // internos (tool_call / resultado) que NO se persisten en la
    // conversación real — solo el "final" se devuelve y se guarda.
    const contents = rawMessages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content ?? "") }],
    }));

    const limite = Date.now() + PRESUPUESTO_MS;
    let finalAnswer: string | null = null;
    let links: { label: string; path: string }[] = [];
    let consultas = 0;

    for (let round = 0; round <= MAX_TOOL_ROUNDS && finalAnswer === null; round++) {
      const raw = await callGemini(systemInstruction, contents, apiKey, limite);
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // A veces el JSON viene rodeado de texto: se rescata el objeto.
        const m = raw.match(/\{[\s\S]*\}/);
        try { parsed = m ? JSON.parse(m[0]) : null; } catch { parsed = null; }
      }

      if (parsed?.type === "tool_call" && typeof parsed.tool === "string" && round < MAX_TOOL_ROUNDS) {
        contents.push({ role: "model", parts: [{ text: JSON.stringify(parsed) }] });
        const result = await safeExec(parsed.tool, userClient, parsed.params, user.id);
        consultas++;
        const ultima = round === MAX_TOOL_ROUNDS - 1;
        contents.push({
          role: "user",
          parts: [{ text: `Resultado de ${parsed.tool}: ${JSON.stringify(result).slice(0, 30000)}` +
            (ultima ? "\nYa no puedes hacer más consultas: responde ahora con type \"final\" usando solo estos datos." : "") }],
        });
        continue;
      }

      if (parsed?.type === "final" && typeof parsed.answer === "string") {
        finalAnswer = parsed.answer.trim();
        if (Array.isArray(parsed.links)) {
          links = parsed.links
            .filter((l: any) => typeof l?.label === "string" && typeof l?.path === "string" && /^\/[a-z-]*(\?[\w=&%.-]*)?$/i.test(l.path))
            .slice(0, 3)
            .map((l: any) => ({ label: l.label.slice(0, 40), path: l.path }));
        }
        break;
      }

      // Respuesta fuera de formato: no se muestra texto libre sin verificar.
      console.warn("ai-assistant: respuesta fuera de formato", raw.slice(0, 500));
      break;
    }

    if (!finalAnswer) {
      finalAnswer = "No pude obtener esa información. Intenta con una pregunta más específica, por ejemplo: \"¿qué proyectos de Personal están en progreso?\".";
    }

    return json({ answer: finalAnswer, links, consultas });
  } catch (error) {
    console.error("ai-assistant error:", error);
    if (error instanceof ModeloSaturadoError) {
      return json({ answer: "El servicio de IA de Google está saturado en este momento. Intenta de nuevo en un minuto.", links: [] });
    }
    if (error instanceof QuotaExceededError) {
      // Se devuelve 200 con una respuesta de chat normal (no un error de
      // función) porque esto no es una falla del asistente: es la cuota
      // diaria gratuita de la API de Gemini, agotada por el uso combinado
      // del chat y del generador de manuales de Skills.
      return json({
        answer: "Por el momento, no podemos procesar más consultas porque se alcanzó el límite en Gemini. Te sugiero esperar un rato y volver a intentarlo.",
      });
    }
    return json({ error: error instanceof Error ? error.message : "Error interno. Por favor, intenta nuevamente." }, 500);
  }
});
