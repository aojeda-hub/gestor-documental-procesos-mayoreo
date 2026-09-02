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

const indicadoresGenerales = `
Indicadores clave por área (referencia general; para cifras/metas/fórmulas concretas y actualizadas usa la herramienta indicadores_buscar):
- LOGÍSTICA: Efectividad en recepción, Precisión del inventario, Rotación de inventario, % entregas a tiempo, Costo por error, Disponibilidad, MTBF.
- PERSONAL: Rotación de Personal, Gastos de Personal, Renta Bruta por Hora Hombre, Clima laboral.
- VENTAS: Alcance de Presupuesto de Ventas, Eficiencia en gasto de ventas, Activación de Clientes, Cartera Vencida.
- CONTROL: Morosidad, Gastos bancarios, Índice de Incobrabilidad, Precisión en informes financieros.
- COMPRAS: Rotación del Surtido, GMROI, Obsolescencia, Fill Rate.
`.trim();

// ========== Enums válidos (para que el modelo arme filtros correctos) ==========
const SEGUIMIENTO_ESTADOS = ["pendiente", "en_revision", "en_progreso", "completado", "cancelado"];
const INCIDENCIA_ESTADOS = ["pendiente", "en_curso", "resuelto"];
const SILO_VALUES = ["compras", "logistica", "ventas", "personal", "control", "mercadeo", "sistemas", "procesos", "datos_maestros"];

function buildSystemInstruction(fullName: string | null, misSilos: string[]): string {
  return `
Eres el Asistente Inteligente de Procesos de Mayoreo. Ayudas a colaboradores del departamento de Procesos y de toda la organización a entender la metodología, encontrar información y analizar el avance de su trabajo dentro del sistema.

Usuario actual: ${fullName ?? "sin nombre registrado"}${misSilos.length ? `, silo(s): ${misSilos.join(", ")}` : ""}.

=== CONOCIMIENTO GENERAL (puedes responder directo con esto, sin herramientas) ===
${descripcionDepartamento}

${misionVisionValores}

SILOS Y RESPONSABLES DE MÉTODOS:
${silosTexto}

${indicadoresGenerales}

Estatus posibles de un documento: Aprobado, Revisión, Construcción, Por iniciar, Desactualizado, Por aprobar.
Grupos BPA: PL (Planificación) PL01-PL03, CV (Cadena de Valor) CVP01-CVP15, SOP (Soporte) SOP01-SOP11.

=== HERRAMIENTAS DISPONIBLES ===
Úsalas SIEMPRE que la pregunta requiera datos concretos, actuales o numéricos del sistema (seguimientos, documentos, incidencias, indicadores específicos, "cuántos", "cuáles", "estado de", avance, cumplimiento). Nunca inventes cifras, nombres de tareas, documentos o incidencias — si no tienes el dato, búscalo o dilo con claridad. Todas las búsquedas respetan automáticamente los permisos del usuario actual (solo ve lo que ya podría ver navegando la app).

1. seguimientos_buscar { query?: string, estado?: ${SEGUIMIENTO_ESTADOS.join("|")}, solo_vencidos?: boolean }
   Busca seguimientos (tareas/proyectos internos) a los que el usuario tiene acceso: propios, de sus tableros, o donde lo agregaron como responsable.

2. seguimientos_analizar {}
   Devuelve un análisis agregado ya calculado (conteos por estado y prioridad, vencidos, próximos a vencer en 7 días, completados en los últimos 30 días, % de cumplimiento) sobre todos los seguimientos del usuario. Úsala para cualquier pregunta de avance/análisis/cumplimiento — nunca calcules tú los porcentajes a mano.

3. documentos_buscar { query?: string, silo?: ${SILO_VALUES.join("|")} }
   Busca documentos/normas del repositorio documental (título, tipo, silo, estatus, link de Drive).

4. incidencias_buscar { query?: string, estado?: ${INCIDENCIA_ESTADOS.join("|")} }
   Busca incidencias registradas en CertificaERP.

5. indicadores_buscar { query?: string, silo?: ${SILO_VALUES.join("|")} }
   Busca indicadores (KPI) definidos por silo, con su fórmula, meta y responsable.

=== PROTOCOLO DE RESPUESTA (obligatorio) ===
Responde SIEMPRE con un único objeto JSON, sin texto fuera de él y sin bloques de código:
- Para pedir una herramienta: {"type":"tool_call","tool":"<nombre>","params":{...}}
- Para responder al usuario (cuando ya tengas todo lo que necesitas, o la pregunta no requiere datos del sistema): {"type":"final","answer":"<respuesta en texto plano, natural y en español, sin markdown ni JSON>"}

Reglas:
- Puedes encadenar varias herramientas si la pregunta lo requiere, pero sé eficiente y no repitas la misma búsqueda dos veces.
- Si una herramienta no devuelve resultados, dilo con claridad en la respuesta final en vez de inventar.
- Nunca menciones en tu respuesta final palabras como "herramienta", "tool_call" o JSON — responde de forma natural, como lo haría una persona del equipo de Procesos.
- Sé conciso: prioriza listas cortas y cifras claras sobre párrafos largos.
`.trim();
}

// ========== Ejecutores de herramientas (RLS-aware: usan el cliente del usuario) ==========
function safeIlikeTerm(q: unknown): string | null {
  if (typeof q !== "string") return null;
  const term = q.trim().replace(/[%,]/g, "");
  return term.length > 0 ? term : null;
}

async function toolSeguimientosBuscar(client: SupabaseClient, params: any) {
  let q = client.from("seguimientos").select("id,titulo,descripcion,estado,prioridad,fecha_limite,fecha_completado,proyecto,board_id,created_at").order("created_at", { ascending: false }).limit(40);
  const term = safeIlikeTerm(params?.query);
  if (term) q = q.or(`titulo.ilike.%${term}%,descripcion.ilike.%${term}%`);
  if (SEGUIMIENTO_ESTADOS.includes(params?.estado)) q = q.eq("estado", params.estado);
  const { data, error } = await q;
  if (error) return { error: error.message };
  let rows = data ?? [];
  if (params?.solo_vencidos) {
    const hoy = new Date();
    rows = rows.filter((r: any) => r.fecha_limite && new Date(r.fecha_limite) < hoy && r.estado !== "completado" && r.estado !== "cancelado");
  }
  return { total: rows.length, seguimientos: rows };
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

async function toolDocumentosBuscar(client: SupabaseClient, params: any) {
  let q = client.from("documents").select("id,title,doc_type,silo,estatus,departamento,cargo,drive_link").order("updated_at", { ascending: false }).limit(30);
  const term = safeIlikeTerm(params?.query);
  if (term) q = q.ilike("title", `%${term}%`);
  if (SILO_VALUES.includes(params?.silo)) q = q.eq("silo", params.silo);
  const { data, error } = await q;
  if (error) return { error: error.message };
  return { total: (data ?? []).length, documentos: data ?? [] };
}

async function toolIncidenciasBuscar(client: SupabaseClient, params: any) {
  let q = client.from("incidencias").select("id,numero,titulo,estado,prioridad,fecha,fecha_completado,modulo,responsable,sistema_nombre").order("fecha", { ascending: false }).limit(30);
  const term = safeIlikeTerm(params?.query);
  if (term) q = q.ilike("titulo", `%${term}%`);
  if (INCIDENCIA_ESTADOS.includes(params?.estado)) q = q.eq("estado", params.estado);
  const { data, error } = await q;
  if (error) return { error: error.message };
  return { total: (data ?? []).length, incidencias: data ?? [] };
}

async function toolIndicadoresBuscar(client: SupabaseClient, params: any) {
  let q = client.from("indicators").select("id,name,silo,related_process,indicator_type,definition,formula,unit,frequency,responsible,goals,estado").order("name").limit(30);
  const term = safeIlikeTerm(params?.query);
  if (term) q = q.ilike("name", `%${term}%`);
  if (SILO_VALUES.includes(params?.silo)) q = q.eq("silo", params.silo);
  const { data, error } = await q;
  if (error) return { error: error.message };
  return { total: (data ?? []).length, indicadores: data ?? [] };
}

const TOOLS: Record<string, (client: SupabaseClient, params: any) => Promise<any>> = {
  seguimientos_buscar: toolSeguimientosBuscar,
  seguimientos_analizar: (client) => toolSeguimientosAnalizar(client),
  documentos_buscar: toolDocumentosBuscar,
  incidencias_buscar: toolIncidenciasBuscar,
  indicadores_buscar: toolIndicadoresBuscar,
};

async function safeExec(tool: string, client: SupabaseClient, params: any) {
  const exec = TOOLS[tool];
  if (!exec) return { error: `Herramienta desconocida: ${tool}` };
  try {
    return await exec(client, params ?? {});
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error ejecutando la herramienta" };
  }
}

// ========== Llamada a Gemini (mismo patrón que generate-skill-document) ==========
const RETRYABLE_STATUS = new Set([429, 503]);
const MAX_ATTEMPTS = 3;
// Cada ronda con tool_call consume una llamada a Gemini adicional — el plan
// gratuito de la API tiene una cuota diaria muy chica (ver QuotaExceededError
// más abajo), así que se limita el encadenado de herramientas por pregunta.
const MAX_TOOL_ROUNDS = 3;

class QuotaExceededError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(systemInstruction: string, contents: any[], apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  let lastErrText = "";
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
    });

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

    if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(`Gemini API error (${res.status}): ${lastErrText}`);
    }
    await sleep(attempt * 1000);
  }

  throw new Error(`Gemini API error (${lastStatus}): ${lastErrText}`);
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

    let finalAnswer: string | null = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS && finalAnswer === null; round++) {
      const raw = await callGemini(systemInstruction, contents, apiKey);
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      if (parsed?.type === "tool_call" && typeof parsed.tool === "string") {
        contents.push({ role: "model", parts: [{ text: raw }] });
        const result = await safeExec(parsed.tool, userClient, parsed.params);
        contents.push({ role: "user", parts: [{ text: `Resultado de la herramienta "${parsed.tool}": ${JSON.stringify(result)}` }] });
        continue;
      }

      if (parsed?.type === "final" && typeof parsed.answer === "string") {
        finalAnswer = parsed.answer.trim();
        break;
      }

      // Formato no reconocido (o el modelo respondió texto plano pese al
      // protocolo): se usa tal cual como respuesta final en vez de fallar.
      finalAnswer = raw.trim();
      break;
    }

    if (!finalAnswer) {
      finalAnswer = "No pude completar la consulta en este momento. Intenta reformular tu pregunta.";
    }

    return json({ answer: finalAnswer });
  } catch (error) {
    console.error("ai-assistant error:", error);
    if (error instanceof QuotaExceededError) {
      // Se devuelve 200 con una respuesta de chat normal (no un error de
      // función) porque esto no es una falla del asistente: es la cuota
      // diaria gratuita de la API de Gemini, agotada por el uso combinado
      // del chat y del generador de manuales de Skills.
      return json({
        answer: "Por hoy se agotó la cuota gratuita de consultas a la IA (Gemini) del sistema, compartida con el generador de manuales de Skills. Vuelve a intentarlo más tarde, o pide a Sistemas que active facturación en el proyecto de Gemini para levantar ese límite.",
      });
    }
    return json({ error: error instanceof Error ? error.message : "Error interno. Por favor, intenta nuevamente." }, 500);
  }
});
