// Sincroniza el Mapa de Procesos (tabla `documents`) con la pestaña "Index"
// del Google Sheet maestro. Se invoca vía webhook desde un trigger de Apps
// Script instalado en el propio Sheet (ver supabase/functions/sync-mapa-sheet/apps-script.gs),
// cada vez que alguien edita la hoja. También se puede invocar a mano para
// pruebas o como botón "Sincronizar ahora".
//
// Nunca borra documentos: solo crea los que faltan y actualiza los campos que
// cambiaron en los que ya existen (match por silo + los 4 códigos). Cualquier
// fila que no tenga la forma esperada se cuenta como "omitida" y se reporta,
// en vez de insertarse a ciegas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHEET_ID = "1OJowqqn5fA4tZb4fcHTtwjxtGOBW0WWSSI2hmXq-ePU";
const SHEET_GID = "635080480"; // pestaña "Index (dinámico)"
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SYNC_SECRET = Deno.env.get("MAPA_SYNC_SECRET")!;

function normalize(s: string): string {
  return (s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const DOC_TYPE_LABELS: Record<string, string> = {
  anexo: "Anexo", procedimiento: "Procedimiento", norma: "Norma", instructivo: "Instructivo",
  politica: "Política", descripcion_cargo: "Descripción de Cargo", manual: "Manual", libro: "Libro",
  presentacion_clave: "Presentación Clave", presentacion: "Presentación", formato: "Formato",
  gestion_beneficios: "Gestión de Beneficios", diagrama: "Diagrama", sintipo: "Sin Tipo",
};
const DOC_TYPE_BY_LABEL = new Map(Object.entries(DOC_TYPE_LABELS).map(([k, v]) => [normalize(v), k]));
const DOC_TYPE_BY_CODE_PREFIX: Record<string, string> = {
  no: "norma", pr: "procedimiento", in: "instructivo", iu: "instructivo", po: "politica",
  ma: "manual", fo: "formato", an: "anexo", di: "diagrama", li: "libro",
};
function matchDocType(rawLabel: string, docCode: string): string | null {
  const byLabel = DOC_TYPE_BY_LABEL.get(normalize(rawLabel));
  if (byLabel) return byLabel;
  const prefix = (docCode || "").slice(0, 2).toLowerCase();
  return DOC_TYPE_BY_CODE_PREFIX[prefix] || null;
}

function matchEstatus(raw: string): string | null {
  const n = normalize(raw);
  if (!n) return null;
  if (n.includes("por aprobar")) return "por_aprobar";
  if (n.includes("aprobado")) return "aprobado";
  if (n.includes("revision")) return "revision";
  if (n.includes("desactualizado")) return "desactualizado";
  if (n.includes("desincorporado")) return "desincorporado";
  if (n.includes("construccion")) return "en_construccion";
  if (n.includes("creada")) return "creada_ia";
  if (n.includes("iniciar")) return "por_iniciar";
  return null;
}

function matchSilo(raw: string): string | null {
  const n = normalize(raw);
  if (!n) return null;
  if (n.includes("logistica")) return "logistica";
  if (n.includes("compras")) return "compras";
  if (n.includes("ventas")) return "ventas";
  if (n.includes("personal")) return "personal";
  if (n.includes("control") || n.includes("credito") || n.includes("cobranza") || n.includes("cobro")) return "control";
  if (n.includes("mercadeo")) return "mercadeo";
  if (n.includes("sistemas")) return "sistemas";
  if (n.includes("datos") || n.includes("integridad")) return "datos_maestros";
  if (n.includes("procesos")) return "procesos";
  return null;
}

function parseFecha(raw: string): string | null {
  const s = (raw || "").trim();
  if (!s || s === "-") return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// Parser CSV simple, soporta campos entre comillas con comas/saltos de línea dentro.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

interface ParsedRow {
  silo: string; macroproceso_codigo: string; macroproceso: string;
  mapeo_sistemico: string | null; proceso_codigo: string; proceso: string;
  subproceso_codigo: string; subproceso: string; documento_codigo: string;
  doc_type: string; title: string; estatus: string; fecha_actualizacion: string | null;
  observaciones: string | null; orden_hoja: number | null;
}

// Incluye el título normalizado: se descubrió que la planilla original reutiliza
// el mismo código (silo+macroproceso+proceso+subproceso+documento) para varios
// documentos realmente distintos en ~50 casos, así que el código solo no basta
// para identificar una fila sin riesgo de mezclar los datos de dos documentos.
const keyOf = (s: string, a: string, b: string, c: string, d: string, title: string) =>
  `${s}|${a}|${b}|${c}|${d}|${normalize(title)}`;

Deno.serve(async (req) => {
  try {
    if (req.headers.get("x-sync-secret") !== SYNC_SECRET) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }

    const modo = new URL(req.url).searchParams.get("mode");

    // ── Espejo app -> Sheet ────────────────────────────────────────────────
    // El Apps Script del Sheet pide los cambios hechos en la app (tabla
    // mapa_hoja_cambios), los escribe en la pestaña del silo y reporta el
    // resultado. Al entregarlos quedan "procesando": una edición nueva en la app
    // mientras tanto genera otro cambio pendiente aparte, que se aplica después.
    if (modo === "hoja_pendientes") {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const hace10min = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("mapa_hoja_cambios")
        .select("id, document_id, accion, antes, cambios, estado, solicitado_at")
        .or(`estado.eq.pendiente,and(estado.eq.procesando,procesado_at.lt.${hace10min})`)
        .order("solicitado_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      // Un cambio que se reentrega (nunca se confirmó) y otro más nuevo del mismo
      // documento se combinan en uno: la edición nueva corrige la anterior.
      let lista = data || [];
      // Lo mismo con uno que falló: al volver a editar el documento en la app, se
      // reintenta junto con la edición nueva (que suele ser la corrección).
      const docsPendientes = lista.filter((c) => c.estado === "pendiente").map((c) => c.document_id);
      if (docsPendientes.length > 0) {
        const { data: fallidos, error: ef } = await supabase.from("mapa_hoja_cambios")
          .select("id, document_id, accion, antes, cambios, estado, solicitado_at")
          .eq("estado", "error").in("document_id", docsPendientes);
        if (ef) throw ef;
        for (const f of fallidos || []) lista.push({ ...f, estado: "procesando" });
      }
      const reentregas = new Map(lista.filter((c) => c.estado === "procesando").map((c) => [c.document_id, c]));
      for (const nuevo of lista.filter((c) => c.estado === "pendiente" && reentregas.has(c.document_id))) {
        const viejo = reentregas.get(nuevo.document_id)!;
        viejo.cambios = { ...(viejo.cambios || {}), ...(nuevo.cambios || {}) };
        if (nuevo.accion === "eliminar") viejo.accion = "eliminar";
        const { error: eu } = await supabase.from("mapa_hoja_cambios")
          .update({ cambios: viejo.cambios, accion: viejo.accion }).eq("id", viejo.id);
        if (eu) throw eu;
        const { error: ed } = await supabase.from("mapa_hoja_cambios").delete().eq("id", nuevo.id);
        if (ed) throw ed;
        lista = lista.filter((c) => c.id !== nuevo.id);
      }
      // Se escribe siempre lo que el documento tiene HOY (no el valor de cuando se
      // pidió el cambio): un reintento nunca puede llevar al Sheet un valor viejo.
      const docIds = lista.filter((c) => c.accion !== "eliminar").map((c) => c.document_id);
      if (docIds.length > 0) {
        const { data: actuales, error: ea } = await supabase.from("documents")
          .select("id, silo, macroproceso_codigo, macroproceso, mapeo_sistemico, proceso_codigo, proceso, subproceso_codigo, subproceso, documento_codigo, doc_type, title, estatus, fecha_actualizacion, observaciones")
          .in("id", docIds);
        if (ea) throw ea;
        const porId = new Map((actuales || []).map((d: any) => [d.id, d]));
        for (const c of lista) {
          const d = porId.get(c.document_id);
          if (!d || c.accion === "eliminar") continue;
          const frescos: Record<string, unknown> = {};
          for (const k of Object.keys(c.cambios || {})) frescos[k] = d[k] ?? null;
          if (JSON.stringify(frescos) !== JSON.stringify(c.cambios)) {
            c.cambios = frescos;
            const { error: eu } = await supabase.from("mapa_hoja_cambios").update({ cambios: frescos }).eq("id", c.id);
            if (eu) throw eu;
          }
        }
      }
      const ids = lista.map((c) => c.id);
      if (ids.length > 0) {
        // procesado_at marca cuándo se entregó; si el script se cae, a los 10 min se reentrega.
        const { error: e2 } = await supabase.from("mapa_hoja_cambios")
          .update({ estado: "procesando", procesado_at: new Date().toISOString() }).in("id", ids);
        if (e2) throw e2;
      }
      // Los ya entregados antes van primero (son más viejos que cualquier pendiente del mismo documento).
      const orden = (c: any) => (c.estado === "procesando" ? 0 : 1);
      const cambios = [...lista].sort((a, b) => orden(a) - orden(b) ||
        new Date(a.solicitado_at).getTime() - new Date(b.solicitado_at).getTime());
      return new Response(JSON.stringify({ ok: true, cambios }), { headers: { "Content-Type": "application/json" } });
    }

    if (modo === "hoja_resultado") {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const body = await req.json().catch(() => ({}));
      const resultados: { id: string; estado: string; detalle?: string }[] = body.resultados || [];
      for (const r of resultados) {
        if (!["hecho", "error"].includes(r.estado)) continue;
        const { error } = await supabase.from("mapa_hoja_cambios")
          .update({ estado: r.estado, detalle: r.detalle ?? null, procesado_at: new Date().toISOString() })
          .eq("id", r.id).eq("estado", "procesando");
        if (error) throw error;
      }
      return new Response(JSON.stringify({ ok: true, registrados: resultados.length }), { headers: { "Content-Type": "application/json" } });
    }

    const csvRes = await fetch(CSV_URL, { redirect: "follow" });
    if (!csvRes.ok) {
      return new Response(
        JSON.stringify({ error: `No se pudo leer el Google Sheet (HTTP ${csvRes.status}). ¿Sigue compartido como "Cualquiera con el enlace"?` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
    const csvText = await csvRes.text();
    const rows = parseCsv(csvText);

    const parsedByKey = new Map<string, ParsedRow>();
    const silosNoReconocidos = new Set<string>();
    let omitidas = 0;

    for (const r of rows) {
      if (r.length < 14) { omitidas++; continue; }
      // Columna de conteo de la hoja de origen (restablece por silo): se guarda
      // para poder mostrar los documentos en el mismo orden en que están en el
      // Sheet, agrupados por macroproceso/proceso/subproceso como allí.
      const ordenHojaRaw = (r[1] || "").trim();
      const ordenHoja = /^\d+$/.test(ordenHojaRaw) ? parseInt(ordenHojaRaw, 10) : null;
      const siloRaw = (r[2] || "").trim();
      const macroCod = (r[3] || "").trim();
      const macroNom = (r[4] || "").trim();
      const mapeo = (r[5] || "").trim();
      const procCod = (r[6] || "").trim();
      const procNom = (r[7] || "").trim();
      const subCod = (r[8] || "").trim();
      const subNom = (r[9] || "").trim();
      const docCod = (r[10] || "").trim();
      const docTypeRaw = (r[11] || "").trim();
      const titulo = (r[12] || "").trim();
      const estatusRaw = (r[13] || "").trim();
      const fechaRaw = (r[14] || "").trim();
      const obsRaw = (r[15] || "").trim();

      if (!macroCod || !procCod || !subCod || !docCod || !titulo) { omitidas++; continue; }
      const silo = matchSilo(siloRaw);
      if (!silo) {
        if (siloRaw) silosNoReconocidos.add(siloRaw);
        omitidas++;
        continue;
      }
      const docType = matchDocType(docTypeRaw, docCod);
      if (!docType) { omitidas++; continue; }

      const parsed: ParsedRow = {
        silo, macroproceso_codigo: macroCod, macroproceso: macroNom,
        mapeo_sistemico: mapeo || null,
        proceso_codigo: procCod, proceso: procNom,
        subproceso_codigo: subCod, subproceso: subNom,
        documento_codigo: docCod, doc_type: docType, title: titulo,
        estatus: matchEstatus(estatusRaw) || "por_iniciar",
        fecha_actualizacion: parseFecha(fechaRaw),
        observaciones: obsRaw || null,
        orden_hoja: ordenHoja,
      };
      parsedByKey.set(keyOf(silo, macroCod, procCod, subCod, docCod, titulo), parsed);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Trae todo lo que ya está mapeado para poder comparar sin pisar nada a ciegas.
    const existing: any[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from("documents")
        .select("id, silo, macroproceso_codigo, proceso_codigo, subproceso_codigo, documento_codigo, title, doc_type, estatus, fecha_actualizacion, observaciones, macroproceso, proceso, subproceso, mapeo_sistemico, orden_hoja, updated_at, created_at")
        .eq("empresa", "mayoreo")
        .not("macroproceso_codigo", "is", null)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      existing.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    // Modo de solo-diagnóstico: reporta grupos duplicados por clave compuesta
    // (silo + los 4 códigos) sin insertar ni actualizar nada. Para verificar
    // que la sincronización no haya creado filas repetidas.
    if (new URL(req.url).searchParams.get("mode") === "check") {
      const groups = new Map<string, any[]>();
      for (const d of existing) {
        const k = keyOf(d.silo, d.macroproceso_codigo, d.proceso_codigo, d.subproceso_codigo, d.documento_codigo, d.title);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push({ id: d.id, title: d.title, estatus: d.estatus, updated_at: d.updated_at, created_at: d.created_at });
      }
      const dup = [...groups.entries()].filter(([, v]) => v.length > 1);
      const masRecientes = [...existing]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 10)
        .map((d) => ({ id: d.id, title: d.title, estatus: d.estatus, observaciones: d.observaciones, updated_at: d.updated_at }));

      const countBy = (key: string) => {
        const c: Record<string, number> = {};
        for (const d of existing) { const v = d[key] ?? "(vacío)"; c[v] = (c[v] || 0) + 1; }
        return c;
      };
      const distinct = (key: string) => new Set(existing.map((d) => d[key]).filter(Boolean)).size;

      return new Response(JSON.stringify({
        ok: true,
        total_documentos_mapeados: existing.length,
        grupos_duplicados: dup.length,
        detalle: dup.map(([k, v]) => ({ clave: k, filas: v })),
        mas_recientes: masRecientes,
        filas_sheet_total: rows.length,
        filas_sheet_omitidas: omitidas,
        silos_no_reconocidos_en_sheet: [...silosNoReconocidos],
        por_silo: countBy("silo"),
        por_doc_type: countBy("doc_type"),
        por_estatus: countBy("estatus"),
        macroprocesos_distintos: distinct("macroproceso_codigo"),
        procesos_distintos: distinct("proceso_codigo"),
        subprocesos_distintos: distinct("subproceso_codigo"),
        sin_fecha_actualizacion: existing.filter((d) => !d.fecha_actualizacion).length,
        aprobado_sin_fecha: existing.filter((d) => d.estatus === "aprobado" && !d.fecha_actualizacion).length,
      }), { headers: { "Content-Type": "application/json" } });
    }

    // Modo de búsqueda puntual: ?mode=lookup&silo=logistica&macro=CVP13&proc=A1&sub=T1&doc=PR01
    // Muestra, para ese código (sin importar el título), tanto lo que hay HOY en
    // la base de datos como todas las filas del sheet que calzan ese mismo código
    // — para detectar si varias filas del sheet comparten código y se están
    // "tapando" entre sí antes de llegar a comparar contra la base de datos.
    if (new URL(req.url).searchParams.get("mode") === "lookup") {
      const u = new URL(req.url);
      const fSilo = (u.searchParams.get("silo") || "").toLowerCase();
      const fMacro = u.searchParams.get("macro") || "";
      const fProc = u.searchParams.get("proc") || "";
      const fSub = u.searchParams.get("sub") || "";
      const fDoc = u.searchParams.get("doc") || "";
      const codePrefix = `${fSilo}|${fMacro}|${fProc}|${fSub}|${fDoc}|`;

      const enBD = existing
        .filter((d) => keyOf(d.silo, d.macroproceso_codigo, d.proceso_codigo, d.subproceso_codigo, d.documento_codigo, d.title).startsWith(codePrefix))
        .map((d) => ({ id: d.id, title: d.title, estatus: d.estatus, observaciones: d.observaciones, fecha_actualizacion: d.fecha_actualizacion, updated_at: d.updated_at }));

      const enSheet = [...parsedByKey.values()]
        .filter((p) => keyOf(p.silo, p.macroproceso_codigo, p.proceso_codigo, p.subproceso_codigo, p.documento_codigo, p.title).startsWith(codePrefix))
        .map((p) => ({ title: p.title, estatus: p.estatus, observaciones: p.observaciones, fecha_actualizacion: p.fecha_actualizacion }));

      // Todas las filas CRUDAS del CSV que calzan el código, sin deduplicar por
      // título (para ver si el sheet tiene más de una fila con el mismo código).
      const crudasDelSheet: any[] = [];
      for (const r of rows) {
        if (r.length < 14) continue;
        const silo = matchSilo(r[2] || "");
        if (silo !== fSilo) continue;
        if ((r[3] || "").trim() !== fMacro) continue;
        if ((r[6] || "").trim() !== fProc) continue;
        if ((r[8] || "").trim() !== fSub) continue;
        if ((r[10] || "").trim() !== fDoc) continue;
        crudasDelSheet.push({ titulo: r[12], estatus: r[13], fecha: r[14], observaciones: r[15] });
      }

      return new Response(JSON.stringify({ ok: true, en_base_de_datos: enBD, en_sheet_tras_dedup: enSheet, filas_crudas_del_sheet: crudasDelSheet }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Modo de limpieza de duplicados legítimos (preexistentes a esta sincronización,
    // ver mode=check). Por defecto solo reporta: agrupa por clave y separa los grupos
    // "exactos" (mismo estatus/fecha/observaciones -> se puede borrar la copia de más
    // sin perder información) de los "ambiguos" (difieren en algún campo -> se listan
    // para que una persona decida, nunca se borran solos). Solo borra si se manda
    // ?confirm=true, y en ese caso únicamente los grupos exactos.
    if (new URL(req.url).searchParams.get("mode") === "dedupe") {
      const groups = new Map<string, any[]>();
      for (const d of existing) {
        const k = keyOf(d.silo, d.macroproceso_codigo, d.proceso_codigo, d.subproceso_codigo, d.documento_codigo, d.title);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(d);
      }
      const exactos: { clave: string; mantener: string; borrar: string[] }[] = [];
      const ambiguos: { clave: string; filas: any[] }[] = [];
      for (const [k, v] of groups.entries()) {
        if (v.length < 2) continue;
        const sig = (d: any) => `${d.estatus}|${d.fecha_actualizacion || ""}|${d.observaciones || ""}`;
        const allSame = v.every((d) => sig(d) === sig(v[0]));
        if (allSame) {
          const sorted = [...v].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          exactos.push({ clave: k, mantener: sorted[0].id, borrar: sorted.slice(1).map((d) => d.id) });
        } else {
          ambiguos.push({
            clave: k,
            filas: v.map((d) => ({ id: d.id, estatus: d.estatus, fecha_actualizacion: d.fecha_actualizacion, observaciones: d.observaciones, created_at: d.created_at })),
          });
        }
      }

      const confirm = new URL(req.url).searchParams.get("confirm") === "true";
      let borrados = 0;
      if (confirm) {
        const ids = exactos.flatMap((g) => g.borrar);
        if (ids.length > 0) {
          const { error } = await supabase.from("documents").delete().in("id", ids);
          if (error) throw error;
          borrados = ids.length;
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        modo: confirm ? "borrado_ejecutado" : "solo_reporte",
        grupos_exactos: exactos.length,
        filas_borradas: borrados,
        detalle_exactos: exactos,
        grupos_ambiguos: ambiguos.length,
        detalle_ambiguos: ambiguos,
      }), { headers: { "Content-Type": "application/json" } });
    }

    const existingByKey = new Map(
      existing.map((d) => [keyOf(d.silo, d.macroproceso_codigo, d.proceso_codigo, d.subproceso_codigo, d.documento_codigo, d.title), d]),
    );

    // Modo de diagnóstico de "huérfanos": a diferencia de orden_hoja (que se
    // graba una vez y queda pegado aunque la fila deje de existir en la hoja),
    // esto compara la clave EXACTA de cada documento existente contra el parseo
    // de la hoja de AHORA MISMO. Si la clave no aparece, ese documento ya no
    // corresponde a nada vigente (le cambiaron el código/macroproceso en la
    // hoja en algún sync anterior, o se eliminó de la hoja). Solo reporta.
    if (new URL(req.url).searchParams.get("mode") === "huerfanos") {
      const huerfanos = existing.filter((d) =>
        !parsedByKey.has(keyOf(d.silo, d.macroproceso_codigo, d.proceso_codigo, d.subproceso_codigo, d.documento_codigo, d.title))
      );
      const porSilo: Record<string, number> = {};
      for (const d of huerfanos) porSilo[d.silo] = (porSilo[d.silo] || 0) + 1;
      return new Response(JSON.stringify({
        ok: true,
        total_existentes: existing.length,
        total_huerfanos: huerfanos.length,
        huerfanos_por_silo: porSilo,
        huerfanos: huerfanos.map((d) => ({
          id: d.id, silo: d.silo, macroproceso_codigo: d.macroproceso_codigo, macroproceso: d.macroproceso,
          proceso_codigo: d.proceso_codigo, proceso: d.proceso, subproceso_codigo: d.subproceso_codigo, subproceso: d.subproceso,
          documento_codigo: d.documento_codigo, title: d.title, created_at: d.created_at,
        })),
      }), { headers: { "Content-Type": "application/json" } });
    }

    // Modo de previsualización: calcula qué se crearía/actualizaría sin escribir nada.
    // Pensado para validar una fuente (gid) nueva antes de confiarle la sincronización real.
    if (new URL(req.url).searchParams.get("mode") === "preview") {
      const nuevos: any[] = [];
      const cambios: any[] = [];
      for (const p of parsedByKey.values()) {
        const match = existingByKey.get(keyOf(p.silo, p.macroproceso_codigo, p.proceso_codigo, p.subproceso_codigo, p.documento_codigo, p.title));
        if (!match) { nuevos.push(p); continue; }
        const diff: Record<string, [unknown, unknown]> = {};
        if (match.estatus !== p.estatus) diff.estatus = [match.estatus, p.estatus];
        if ((match.fecha_actualizacion || null) !== (p.fecha_actualizacion || null)) diff.fecha_actualizacion = [match.fecha_actualizacion, p.fecha_actualizacion];
        if ((match.observaciones || null) !== (p.observaciones || null)) diff.observaciones = [match.observaciones, p.observaciones];
        if (Object.keys(diff).length > 0) cambios.push({ title: p.title, silo: p.silo, diff });
      }
      return new Response(JSON.stringify({
        ok: true,
        filas_leidas: rows.length,
        filas_validas: parsedByKey.size,
        filas_omitidas: omitidas,
        silos_no_reconocidos: [...silosNoReconocidos],
        documentos_existentes_en_bd: existing.length,
        se_crearian: nuevos.length,
        se_actualizarian: cambios.length,
        muestra_nuevos: nuevos.slice(0, 15).map((p) => ({ silo: p.silo, macroproceso: p.macroproceso, proceso: p.proceso, subproceso: p.subproceso, title: p.title, estatus: p.estatus })),
        muestra_cambios: cambios.slice(0, 15),
      }), { headers: { "Content-Type": "application/json" } });
    }

    // Cambios hechos en la app que todavía no se escribieron en el Sheet: esos
    // documentos no se tocan (el Sheet aún tiene el valor viejo) y la fila vieja
    // del Sheet no se registra como documento nuevo (p. ej. tras un cambio de
    // título o una eliminación en la app). Los que fallaron también quedan
    // protegidos hasta que un admin los descarte (entonces vuelve a mandar el Sheet).
    const { data: enCola, error: colaError } = await supabase.from("mapa_hoja_cambios")
      .select("document_id, antes").in("estado", ["pendiente", "procesando", "error"]);
    if (colaError) throw colaError;
    const docsEnCola = new Set((enCola || []).map((c: any) => c.document_id));
    const clavesEnCola = new Set((enCola || []).filter((c: any) => c.antes).map((c: any) =>
      keyOf(c.antes.silo, c.antes.macroproceso_codigo, c.antes.proceso_codigo, c.antes.subproceso_codigo, c.antes.documento_codigo, c.antes.title)));
    let enEspera = 0;

    const toInsert: any[] = [];
    const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];

    for (const p of parsedByKey.values()) {
      const clave = keyOf(p.silo, p.macroproceso_codigo, p.proceso_codigo, p.subproceso_codigo, p.documento_codigo, p.title);
      const match = existingByKey.get(clave);
      if (match && docsEnCola.has(match.id)) { enEspera++; continue; }
      if (!match && clavesEnCola.has(clave)) { enEspera++; continue; }
      if (!match) {
        toInsert.push({
          title: p.title, doc_type: p.doc_type, silo: p.silo, empresa: "mayoreo", confidential: false,
          estatus: p.estatus, macroproceso_codigo: p.macroproceso_codigo, macroproceso: p.macroproceso,
          mapeo_sistemico: p.mapeo_sistemico, proceso_codigo: p.proceso_codigo, proceso: p.proceso,
          subproceso_codigo: p.subproceso_codigo, subproceso: p.subproceso,
          documento_codigo: p.documento_codigo, fecha_actualizacion: p.fecha_actualizacion,
          observaciones: p.observaciones, orden_hoja: p.orden_hoja,
        });
        continue;
      }
      const patch: Record<string, unknown> = {};
      if (match.title !== p.title) patch.title = p.title;
      if (match.doc_type !== p.doc_type) patch.doc_type = p.doc_type;
      if (match.estatus !== p.estatus) patch.estatus = p.estatus;
      if ((match.fecha_actualizacion || null) !== (p.fecha_actualizacion || null)) patch.fecha_actualizacion = p.fecha_actualizacion;
      if ((match.observaciones || null) !== (p.observaciones || null)) patch.observaciones = p.observaciones;
      if ((match.macroproceso || "") !== p.macroproceso) patch.macroproceso = p.macroproceso;
      if ((match.proceso || "") !== p.proceso) patch.proceso = p.proceso;
      if ((match.subproceso || "") !== p.subproceso) patch.subproceso = p.subproceso;
      if ((match.mapeo_sistemico || null) !== p.mapeo_sistemico) patch.mapeo_sistemico = p.mapeo_sistemico;
      if ((match.orden_hoja ?? null) !== p.orden_hoja) patch.orden_hoja = p.orden_hoja;
      if (Object.keys(patch).length > 0) toUpdate.push({ id: match.id, patch });
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from("documents").insert(toInsert);
      if (error) throw error;
    }
    for (const u of toUpdate) {
      const { error } = await supabase.from("documents").update(u.patch).eq("id", u.id);
      if (error) throw error;
    }

    return new Response(JSON.stringify({
      ok: true,
      filas_leidas: rows.length,
      filas_validas: parsedByKey.size,
      filas_omitidas: omitidas,
      creados: toInsert.length,
      actualizados: toUpdate.length,
      en_espera_de_escritura_en_sheet: enEspera,
      silos_no_reconocidos: [...silosNoReconocidos],
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
