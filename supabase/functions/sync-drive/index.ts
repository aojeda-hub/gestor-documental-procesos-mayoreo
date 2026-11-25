// Sincroniza la tabla `documents` con la unidad compartida "Documentación" de
// Google Drive. El Apps Script de supabase/functions/sync-drive/apps-script.gs
// lista la unidad completa cada pocos minutos y manda aquí la foto (snapshot)
// de todos sus archivos con la ruta de carpetas de cada uno.
//
// Cómo se interpreta la ruta  Empresa / Silo / [Área /] Tipo / archivo:
//   - Empresa = 1.er nivel (Mayoreo, EPA, Beconsult). Otras carpetas (OLO) se ignoran.
//   - Silo    = 2.º nivel.
//   - Tipo    = la carpeta de tipo más cercana al archivo (Normas, Procedimientos…).
//               "Documentos relevantes" se registra como Anexo. Sin carpeta de tipo,
//               se deduce del nombre del archivo; si no se puede, va a revisión.
//   - Área    = carpetas entre el silo y la de tipo (columna `subarea`).
//   - Confidencial si alguna carpeta de la ruta dice "restringido/a".
//   - Excepción: las descripciones de cargo van SIEMPRE al silo Personal; el
//     silo de la carpeta donde estaban queda como área.
//
// Reglas de seguridad:
//   - Por defecto SOLO previsualiza. Escribe únicamente con ?mode=apply.
//   - Empareja por ID de archivo. Si no hay, por empresa + silo + título exacto
//     (normalizado) contra documentos sin archivo asociado; si la coincidencia
//     no es única, va a `drive_sync_revision` y no se toca nada.
//   - En el primer emparejamiento el documento pasa al silo/empresa de su
//     carpeta en Drive, pero se respetan su título y tipo. Después, si el
//     archivo se renombra o se mueve en Drive, eso se refleja en la app.
//   - Los documentos del Mapa de Procesos (con macroproceso_codigo) nunca
//     cambian de título/silo/tipo por esta vía: los gobierna el Sheet.
//   - Archivo que desaparece de la unidad -> estatus "desincorporado" (salvo
//     documentos del Mapa: solo se anota). Si de golpe desaparecen demasiados o
//     una carpeta entera, no se aplica (probable error o carpeta movida).
//   - Puede recibir archivos de varias unidades (el Apps Script antepone a la
//     ruta la empresa cuando la unidad no la tiene, p. ej. la restringida de Personal).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SYNC_SECRET = Deno.env.get("DRIVE_SYNC_SECRET")!;

// Carpetas cuyo contenido no es documentación formal (nombres normalizados).
const CARPETAS_EXCLUIDAS = new Set([
  "proyectos", "documentacion proyectos", "indicadores", "indicadores del sim",
  "capsulas de conocimiento", "logos", "actividades pasantes", "pruebas", "indice",
  "ejercicios practicos asesores de procesos", "presentaciones dm proyectos",
  "formatos antiguos",
  // Copias PDF de las normas restringidas: el archivo principal es el original de
  // la unidad "Documentación restringida Personal".
  "normas restringidas personal pdf",
]);

const MIME_PERMITIDOS = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.jgraph.mxfile", // draw.io
]);

// Máximo de desincorporaciones por corrida antes de frenar (se puede forzar).
const MAX_ELIMINACIONES = 20;

function normalize(s: string): string {
  return (s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchEmpresa(raw: string): string | null {
  const n = normalize(raw);
  if (n === "mayoreo") return "mayoreo";
  if (n === "epa") return "epa";
  if (n === "beconsult") return "beconsult";
  return null;
}

function matchSilo(raw: string): string | null {
  const n = normalize(raw);
  if (!n) return null;
  if (n.includes("logistica")) return "logistica";
  if (n.includes("compras")) return "compras";
  if (n.includes("ventas")) return "ventas";
  if (n.includes("personal")) return "personal";
  if (n === "control" || n.includes("credito") || n.includes("cobranza")) return "control";
  if (n.includes("mercadeo")) return "mercadeo";
  if (n.includes("sistemas")) return "sistemas";
  if (n.includes("datos maestros") || n.includes("integridad de datos")) return "datos_maestros";
  if (n === "procesos") return "procesos";
  return null;
}

function tipoDeCarpeta(raw: string): string | null {
  const n = normalize(raw);
  if (n.startsWith("norma")) return "norma";
  if (n.startsWith("procedimiento")) return "procedimiento";
  if (n.startsWith("instructivo")) return "instructivo";
  if (n.startsWith("anexo")) return "anexo";
  if (n.startsWith("documentos relevantes") || n.startsWith("documento relevante")) return "anexo";
  if (n.startsWith("formato")) return "formato";
  if (n.startsWith("manual")) return "manual";
  if (n.startsWith("politica")) return "politica";
  if (n.startsWith("diagrama") || n.startsWith("flujograma")) return "diagrama";
  if (n.startsWith("descripcion") && n.includes("cargo")) return "descripcion_cargo";
  if (n.startsWith("presentaciones clave") || n.startsWith("presentacion clave")) return "presentacion_clave";
  return null;
}

function tipoDeTitulo(title: string, mime: string): string | null {
  const n = normalize(title);
  if (n.startsWith("procedimiento")) return "procedimiento";
  if (n.startsWith("instructivo")) return "instructivo";
  if (n.startsWith("norma")) return "norma";
  if (n.startsWith("manual")) return "manual";
  if (n.startsWith("politica")) return "politica";
  if (n.startsWith("anexo")) return "anexo";
  if (n.startsWith("formato")) return "formato";
  if (n.startsWith("diagrama") || n.startsWith("flujograma")) return "diagrama";
  if (n.startsWith("descripcion de cargo")) return "descripcion_cargo";
  if (mime === "application/vnd.jgraph.mxfile") return "diagrama";
  return null;
}

// Título "de fondo" para emparejar: sin código (SOP04-A5-T3-NO01) ni palabra de
// tipo ("Norma de", "Procedimiento para la"…), porque en Drive el archivo suele
// llamarse "Norma de X" y en el Mapa de Procesos solo "X".
function claveTitulo(title: string): string {
  const t = (title || "")
    .replace(/^\s*[A-Z]{2,5}\d{0,3}(-[A-Z0-9]{2,6})+\s*/i, "")
    .replace(/^\s*(normas?|procedimientos?|instructivos?|manual(es)?|pol[ií]ticas?|anexos?|formatos?|diagramas?)(?![a-záéíóúñ])\s*[:\-]?\s*((de|del|para|sobre)\s+(la\s+|el\s+|los\s+|las\s+)?)?/i, "");
  return normalize(t.replace(EXTENSIONES, "")).replace(/ /g, "");
}

const EXTENSIONES = /\.(docx?|pdf|xlsx?|pptx?|drawio)$/i;

function limpiarTitulo(name: string): string {
  return (name || "").replace(EXTENSIONES, "").trim();
}

// Estatus inicial de un documento NUEVO según señales claras en carpeta/título.
// Los documentos que ya existen nunca cambian de estatus por esta vía.
function estatusInicial(path: string[], title: string): string {
  if (path.some((p) => normalize(p).startsWith("desactualizad"))) return "desactualizado";
  if (normalize(title).startsWith("borrador")) return "en_construccion";
  return "por_iniciar";
}

interface ArchivoDrive {
  id: string; name: string; mimeType: string; modifiedTime: string;
  webViewLink?: string; path: string[] | null; // carpetas desde la raíz de la unidad
}

interface Mapeado {
  file: ArchivoDrive; empresa: string; silo: string; doc_type: string | null;
  subarea: string | null; title: string; confidential: boolean; drive_path: string; link: string;
  estatus?: string;
}

type Clasificacion = { ok: Mapeado } | { omitido: string };

function clasificar(f: ArchivoDrive): Clasificacion {
  if (!MIME_PERMITIDOS.has(f.mimeType)) return { omitido: "formato_no_documental" };
  if (/^(_temp|~\$)/i.test((f.name || "").trim())) return { omitido: "archivo_temporal" };
  const path = f.path;
  if (!path || path.length < 2) return { omitido: "fuera_de_estructura" };
  const empresa = matchEmpresa(path[0]);
  if (!empresa) return { omitido: "carpeta_no_empresa" };
  if (path.some((p) => CARPETAS_EXCLUIDAS.has(normalize(p)))) return { omitido: "carpeta_excluida" };
  const silo = matchSilo(path[1]);
  if (!silo) return { omitido: "silo_no_reconocido" };

  const title = limpiarTitulo(f.name);
  let doc_type: string | null = null;
  let idxTipo = -1;
  for (let i = path.length - 1; i >= 2; i--) {
    const t = tipoDeCarpeta(path[i]);
    if (t) { doc_type = t; idxTipo = i; break; }
  }
  if (!doc_type) doc_type = tipoDeTitulo(title, f.mimeType);
  let areaParts = path.slice(2, idxTipo >= 0 ? idxTipo : path.length).map((s) => s.trim()).filter(Boolean);

  // Las descripciones de cargo pertenecen solo a Personal, estén en la carpeta
  // que estén. El silo de origen queda como área (p. ej. "Ventas", "Logística / Reposición").
  let siloFinal = silo;
  if (doc_type === "descripcion_cargo" && silo !== "personal") {
    areaParts = [path[1].trim(), ...areaParts];
    siloFinal = "personal";
  }

  return {
    ok: {
      file: f, empresa, silo: siloFinal, doc_type, title,
      subarea: areaParts.length ? areaParts.join(" / ") : null,
      confidential: path.some((p) => normalize(p).includes("restringid")),
      drive_path: path.map((s) => s.trim()).join(" / "),
      link: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
      estatus: estatusInicial(path, title),
    },
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  try {
    if (req.headers.get("x-sync-secret") !== SYNC_SECRET) return json({ error: "unauthorized" }, 401);
    if (req.method !== "POST") return json({ error: "usar POST con el snapshot de la unidad" }, 405);

    const url = new URL(req.url);
    const apply = url.searchParams.get("mode") === "apply";
    const forzarEliminaciones = url.searchParams.get("forzar_eliminaciones") === "true";

    const body = await req.json() as { completo?: boolean; archivos?: ArchivoDrive[] };
    const archivos = body.archivos || [];
    if (archivos.length === 0) return json({ error: "snapshot vacío: no se aplica nada" }, 400);
    const idsEnUnidad = new Set(archivos.map((f) => f.id));

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Archivos que un admin marcó como "ignorar" en la pantalla de revisión.
    // Si la lectura falla (p. ej. la tabla aún no existe), se sigue sin ignorados:
    // lo peor que pasa es que esos archivos vuelvan a aparecer en revisión.
    const { data: ignoradosRows, error: ignErr } = await supabase.from("drive_sync_ignorados").select("drive_file_id");
    if (ignErr) console.warn("sync-drive: no se pudo leer drive_sync_ignorados:", ignErr.message);
    const ignorados = new Set(((ignErr ? [] : ignoradosRows) || []).map((r: any) => r.drive_file_id));

    // 1. Clasificar cada archivo según su carpeta.
    const mapeados: Mapeado[] = [];
    const omitidos: Record<string, number> = {};
    // Detalle solo de los omitidos "raros" (los de formato o carpeta excluida son esperables).
    const omitidosDetalle: { motivo: string; nombre: string; ruta: string }[] = [];
    for (const f of archivos) {
      if (ignorados.has(f.id)) { omitidos.ignorado_manual = (omitidos.ignorado_manual || 0) + 1; continue; }
      const c = clasificar(f);
      if ("ok" in c) { mapeados.push(c.ok); continue; }
      omitidos[c.omitido] = (omitidos[c.omitido] || 0) + 1;
      if (["silo_no_reconocido", "carpeta_no_empresa", "fuera_de_estructura", "archivo_temporal"].includes(c.omitido)) {
        omitidosDetalle.push({ motivo: c.omitido, nombre: f.name, ruta: (f.path || []).join(" / ") });
      }
    }

    // 2. Traer los documentos existentes.
    const existing: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("documents")
        .select("id, title, silo, empresa, doc_type, subarea, confidential, estatus, drive_link, drive_file_id, drive_path, drive_nombre, drive_modified_at, drive_visto_at, drive_eliminado_at, macroproceso_codigo")
        .range(from, from + 999);
      if (error) throw error;
      existing.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const byFileId = new Map<string, any[]>();
    // Candidatos a emparejar por título: documentos sin archivo de ESTA unidad
    // (sin enlace, o con enlace a una copia en otra unidad, como pasa con muchos
    // del Mapa de Procesos).
    const sinArchivoByKey = new Map<string, any[]>();   // empresa|silo|título exacto
    const sinArchivoByClave = new Map<string, any[]>(); // empresa|silo|tipo|título sin prefijo
    const push = (map: Map<string, any[]>, k: string, d: any) => {
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(d);
    };
    for (const d of existing) {
      if (d.drive_file_id) push(byFileId, d.drive_file_id, d);
      const tieneArchivoDeLaUnidad = !!d.drive_visto_at || (!!d.drive_file_id && idsEnUnidad.has(d.drive_file_id));
      if (tieneArchivoDeLaUnidad) continue;
      push(sinArchivoByKey, `${d.empresa}|${d.silo}|${normalize(d.title)}`, d);
      const c = claveTitulo(d.title);
      if (c.length > 3) push(sinArchivoByClave, `${d.empresa}|${d.silo}|${d.doc_type}|${c}`, d);
    }

    const ahora = new Date().toISOString();
    const toInsert: any[] = [];
    const toUpdate: { id: string; patch: Record<string, unknown>; tipo: string; title: string; silo?: string; ruta?: string }[] = [];
    const revision: any[] = [];
    const siloDistintoMapa: any[] = []; // documentos del Mapa cuyo silo no calza con su carpeta (solo se reporta)
    const resumenCand = (d: any) => ({ id: d.id, title: d.title, silo: d.silo, estatus: d.estatus, codigo_mapa: d.macroproceso_codigo });

    // Patch para un documento ya vinculado (o que se vincula ahora) a su archivo.
    const patchVinculado = (d: any, m: Mapeado, primeraVez: boolean) => {
      const p: Record<string, unknown> = {};
      if (d.drive_file_id !== m.file.id) p.drive_file_id = m.file.id;
      if (!d.drive_link) p.drive_link = m.link;
      const msDb = d.drive_modified_at ? new Date(d.drive_modified_at).getTime() : null;
      if (msDb !== new Date(m.file.modifiedTime).getTime()) p.drive_modified_at = m.file.modifiedTime;
      if (d.drive_eliminado_at) p.drive_eliminado_at = null;
      const esMapa = !!d.macroproceso_codigo;
      if (primeraVez && !esMapa) {
        // Cada documento queda en el silo (y empresa) de su carpeta en Drive.
        if (d.empresa !== m.empresa) p.empresa = m.empresa;
        if (d.silo !== m.silo) p.silo = m.silo;
        // Títulos cargados a mano con la extensión del archivo ("… .docx").
        if (EXTENSIONES.test((d.title || "").trim())) p.title = limpiarTitulo(d.title);
      }
      if (primeraVez && esMapa && d.silo !== m.silo) {
        siloDistintoMapa.push({ title: d.title, silo_app: d.silo, silo_drive: m.silo, ruta: m.drive_path });
      }
      if (!primeraVez && !esMapa) {
        // Renombrado en Drive -> nuevo título. Movido de carpeta -> nueva ubicación.
        if (d.drive_nombre && d.drive_nombre !== m.title && d.title !== m.title) p.title = m.title;
        if (d.drive_path && d.drive_path !== m.drive_path) {
          if (d.empresa !== m.empresa) p.empresa = m.empresa;
          if (d.silo !== m.silo) p.silo = m.silo;
          if (m.doc_type && d.doc_type !== m.doc_type) p.doc_type = m.doc_type;
          if ((d.subarea || null) !== m.subarea) p.subarea = m.subarea;
        }
      }
      if (m.confidential && !d.confidential) p.confidential = true; // nunca se des-confidencializa solo
      if (d.drive_path !== m.drive_path) p.drive_path = m.drive_path;
      if (d.drive_nombre !== m.title) p.drive_nombre = m.title;
      // drive_visto_at se marca en la primera vez y cuando hay cambios; no en cada
      // corrida, para no reescribir 1.500 filas cada 5 minutos.
      if (primeraVez || Object.keys(p).length > 0) p.drive_visto_at = ahora;
      return p;
    };

    // 3a. Archivos ya vinculados por ID.
    const pendientesPorTitulo: Mapeado[] = [];
    for (const m of mapeados) {
      const docs = byFileId.get(m.file.id);
      if (!docs) { pendientesPorTitulo.push(m); continue; }
      if (docs.length > 1) {
        revision.push({ m, motivo: "enlace_repetido", candidatos: docs.map(resumenCand) });
        continue;
      }
      const d = docs[0];
      const patch = patchVinculado(d, m, !d.drive_visto_at);
      if (Object.keys(patch).length) toUpdate.push({ id: d.id, patch, tipo: d.drive_visto_at ? "actualizado" : "vinculado_por_enlace", title: d.title, silo: d.silo, ruta: m.drive_path });
    }

    // 3b. Archivos sin vínculo: buscar por empresa + silo + título.
    const asignaciones = new Map<string, Mapeado[]>(); // docId -> archivos que calzan solo con él
    const docPorId = new Map(existing.map((d) => [d.id, d]));
    for (const m of pendientesPorTitulo) {
      // Primero título exacto; si no hay, título sin "Norma de…"/código, mismo tipo.
      let cands = sinArchivoByKey.get(`${m.empresa}|${m.silo}|${normalize(m.title)}`) || [];
      if (cands.length === 0 && m.doc_type) {
        const c = claveTitulo(m.title);
        if (c.length > 3) cands = sinArchivoByClave.get(`${m.empresa}|${m.silo}|${m.doc_type}|${c}`) || [];
      }
      if (cands.length > 1) {
        revision.push({ m, motivo: "coincidencia_ambigua", candidatos: cands.map(resumenCand) });
      } else if (cands.length === 1) {
        const id = cands[0].id;
        if (!asignaciones.has(id)) asignaciones.set(id, []);
        asignaciones.get(id)!.push(m);
      } else if (!m.doc_type) {
        revision.push({ m, motivo: "sin_tipo", candidatos: null });
      } else {
        toInsert.push({
          title: m.title, doc_type: m.doc_type, silo: m.silo, empresa: m.empresa,
          confidential: m.confidential, subarea: m.subarea, drive_link: m.link,
          drive_file_id: m.file.id, drive_path: m.drive_path, drive_nombre: m.title,
          drive_modified_at: m.file.modifiedTime, drive_visto_at: ahora,
          // Siempre explícito: en un insert por lotes, supabase-js manda null en
          // las columnas que faltan en alguna fila, y estatus es NOT NULL.
          estatus: m.estatus || "por_iniciar",
        });
      }
    }
    for (const [docId, files] of asignaciones) {
      const d = docPorId.get(docId);
      if (files.length > 1) {
        // Dos archivos (p. ej. .docx y Google Doc) para un mismo documento: decide una persona.
        for (const m of files) revision.push({ m, motivo: "coincidencia_ambigua", candidatos: [resumenCand(d)] });
        continue;
      }
      toUpdate.push({ id: docId, patch: patchVinculado(d, files[0], true), tipo: "vinculado_por_titulo", title: d.title, silo: d.silo, ruta: files[0].drive_path });
    }

    // 4. Archivos que ya no están en la unidad.
    const eliminados = existing.filter((d) =>
      d.drive_file_id && d.drive_visto_at && !d.drive_eliminado_at && !idsEnUnidad.has(d.drive_file_id));
    // Freno: una carpeta entera que desaparece de golpe suele ser una carpeta
    // movida o borrada por error, no documentos que se dieron de baja.
    const porCarpeta: Record<string, number> = {};
    for (const d of eliminados) porCarpeta[d.drive_path || "?"] = (porCarpeta[d.drive_path || "?"] || 0) + 1;
    const carpetasCompletas = Object.entries(porCarpeta)
      .filter(([ruta, n]) => n > 5 && !mapeados.some((m) => m.drive_path === ruta))
      .map(([ruta, n]) => `${ruta} (${n})`);
    let eliminacionesBloqueadas: string | null = null;
    if (eliminados.length > 0) {
      if (body.completo !== true) eliminacionesBloqueadas = "snapshot incompleto";
      else if (!forzarEliminaciones && eliminados.length > MAX_ELIMINACIONES)
        eliminacionesBloqueadas = `más de ${MAX_ELIMINACIONES} de golpe; revisar y reenviar con ?forzar_eliminaciones=true`;
      else if (!forzarEliminaciones && carpetasCompletas.length > 0)
        eliminacionesBloqueadas = `desapareció la carpeta completa ${carpetasCompletas.join(", ")}; revisar y reenviar con ?forzar_eliminaciones=true`;
    }
    if (!eliminacionesBloqueadas) {
      for (const d of eliminados) {
        const patch: Record<string, unknown> = { drive_eliminado_at: ahora };
        // El estatus de los documentos del Mapa de Procesos lo gobierna el Sheet:
        // aquí solo se anota que su archivo ya no está.
        if (!d.macroproceso_codigo && d.estatus !== "desincorporado") patch.estatus = "desincorporado";
        toUpdate.push({ id: d.id, patch, tipo: "desincorporado", title: d.title });
      }
    }

    const conteo = (tipo: string) => toUpdate.filter((u) => u.tipo === tipo).length;
    const porMotivo: Record<string, number> = {};
    for (const r of revision) porMotivo[r.motivo] = (porMotivo[r.motivo] || 0) + 1;

    const resumen = {
      ok: true,
      modo: apply ? "aplicado" : "solo_previsualizacion",
      archivos_en_unidad: archivos.length,
      archivos_documentales: mapeados.length,
      omitidos_por_motivo: omitidos,
      se_crean: toInsert.length,
      se_vinculan_por_enlace_existente: conteo("vinculado_por_enlace"),
      se_vinculan_por_titulo: conteo("vinculado_por_titulo"),
      se_actualizan: conteo("actualizado"),
      se_desincorporan: conteo("desincorporado"),
      eliminaciones_detectadas: eliminados.length,
      eliminaciones_bloqueadas: eliminacionesBloqueadas,
      se_cambian_de_silo: toUpdate.filter((u) => "silo" in u.patch).length,
      se_limpia_extension_del_titulo: toUpdate.filter((u) => "title" in u.patch && u.tipo !== "actualizado").length,
      mapa_con_silo_distinto_a_drive: siloDistintoMapa.length,
      a_revision: revision.length,
      revision_por_motivo: porMotivo,
      nuevos_por_estatus: toInsert.reduce((acc: Record<string, number>, d) => { const k = d.estatus || "por_iniciar"; acc[k] = (acc[k] || 0) + 1; return acc; }, {}),
      // Listas completas (el Apps Script las guarda en un archivo para revisarlas).
      cambios_de_silo: toUpdate.filter((u) => "silo" in u.patch).map((u) => ({ title: u.title, de: u.silo, a: u.patch.silo, ruta: u.ruta })),
      mapa_silo_distinto: siloDistintoMapa,
      revision: revision.map((r) => ({ title: r.m.title, motivo: r.motivo, ruta: r.m.drive_path, link: r.m.link, candidatos: r.candidatos })),
      omitidos_detalle: omitidosDetalle,
      nuevos: toInsert.map((d) => ({ title: d.title, silo: d.silo, doc_type: d.doc_type, subarea: d.subarea, estatus: d.estatus || "por_iniciar", ruta: d.drive_path })),
      vinculados_por_titulo: toUpdate.filter((u) => u.tipo === "vinculado_por_titulo").map((u) => u.title),
      actualizados: toUpdate.filter((u) => u.tipo === "actualizado").map((u) => ({ title: u.title, cambios: Object.keys(u.patch) })),
      desincorporados: eliminados.map((d) => d.title),
    };

    if (!apply) return json(resumen);

    // 5. Escribir.
    for (let i = 0; i < toInsert.length; i += 200) {
      const { error } = await supabase.from("documents").insert(toInsert.slice(i, i + 200));
      if (error) throw error;
    }
    for (let i = 0; i < toUpdate.length; i += 10) {
      const results = await Promise.all(toUpdate.slice(i, i + 10).map((u) =>
        supabase.from("documents").update(u.patch).eq("id", u.id)));
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    }

    // Lista de revisión: refleja exactamente lo pendiente de esta corrida.
    const filasRevision = revision.map((r) => ({
      drive_file_id: r.m.file.id, empresa: r.m.empresa, silo: r.m.silo, title: r.m.title,
      drive_path: r.m.drive_path, drive_link: r.m.link, mime_type: r.m.file.mimeType,
      motivo: r.motivo, candidatos: r.candidatos, actualizado_at: ahora,
    }));
    for (let i = 0; i < filasRevision.length; i += 200) {
      const { error } = await supabase.from("drive_sync_revision").upsert(filasRevision.slice(i, i + 200), { onConflict: "drive_file_id" });
      if (error) throw error;
    }
    const vigentes = new Set(filasRevision.map((r) => r.drive_file_id));
    const { data: prev, error: prevErr } = await supabase.from("drive_sync_revision").select("drive_file_id");
    if (prevErr) throw prevErr;
    const resueltos = (prev || []).map((r) => r.drive_file_id).filter((id) => !vigentes.has(id));
    for (let i = 0; i < resueltos.length; i += 200) {
      const { error } = await supabase.from("drive_sync_revision").delete().in("drive_file_id", resueltos.slice(i, i + 200));
      if (error) throw error;
    }

    return json(resumen);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
