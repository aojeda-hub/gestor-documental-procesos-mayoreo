/**
 * Sincronización automática: unidad compartida "Documentación" -> Gestor documental.
 *
 * Cada 5 minutos lista la unidad completa (solo metadatos: nombre, carpeta,
 * fecha; no descarga archivos) y, si algo cambió desde la última vez, se lo
 * manda a la función sync-drive, que crea/actualiza los documentos en la app.
 *
 * Instalación (una sola vez, con una cuenta que tenga acceso a la unidad,
 * idealmente procesos@mayoreo.biz):
 *   1. Ir a https://script.google.com > Nuevo proyecto. Nombrarlo "Sync Drive -> Gestor".
 *   2. Pegar este archivo completo en Code.gs.
 *   3. Menú izquierdo "Servicios" (+) > "Drive API" > versión v3 > Agregar.
 *   4. Engranaje "Configuración del proyecto" > "Propiedades de la secuencia de
 *      comandos" > agregar DRIVE_SYNC_SECRET con el valor del secreto.
 *   5. Ejecutar "previsualizar" y revisar el registro: muestra lo que se crearía,
 *      vincularía o mandaría a revisión, SIN escribir nada.
 *   6. Si todo se ve bien: ejecutar "sincronizarAhora" (primera carga real) y
 *      luego "instalarTrigger" para que corra solo cada 5 minutos.
 *
 * Para pausarla: ejecutar "desinstalarTrigger".
 */

var WEBHOOK_URL = 'https://qtxfokwwwfmovicdbtre.supabase.co/functions/v1/sync-drive';
var MINUTOS = 5;

/**
 * Unidades que se sincronizan.
 *   driveId:  la unidad compartida.
 *   carpeta:  (opcional) solo los archivos dentro de esta carpeta.
 *   prefijo:  carpetas que se anteponen a la ruta, para unidades que no empiezan
 *             por la empresa (la función espera Empresa / Silo / ... / archivo).
 * Si una unidad no se puede leer, la corrida completa se cancela (así nunca se
 * manda una foto incompleta que haría parecer borrados sus documentos).
 */
var FUENTES = [
  { nombre: 'Documentación', driveId: '0AIvHaBFZ0NhWUk9PVA', prefijo: [] },
  { nombre: 'Documentación restringida Personal — Normas Restringidas',
    driveId: '0AAUTKEi_tJKyUk9PVA', carpeta: '1xG5H3h-JLXvwfxmJn_Zg3MR525vza-EM', prefijo: ['Mayoreo'] },
];

/** Solo muestra qué haría. No escribe nada en la app. */
function previsualizar() {
  var r = enviar_(tomarFoto_(), 'preview');
  imprimir_(r);
  guardarEnDrive_('sync-drive-previsualizacion.json', r);
}

/** Guarda (sobrescribe) un JSON en "Mi unidad" de quien ejecuta el script, para revisarlo completo. */
function guardarEnDrive_(nombre, obj) {
  var texto = JSON.stringify(obj, null, 2);
  var existentes = DriveApp.getRootFolder().getFilesByName(nombre);
  if (existentes.hasNext()) {
    existentes.next().setContent(texto);
  } else {
    DriveApp.getRootFolder().createFile(nombre, texto, 'application/json');
  }
  console.log('Resultado completo guardado en Mi unidad: ' + nombre);
}

/** El registro de Apps Script corta mensajes largos: imprime cada sección por separado. */
function imprimir_(r) {
  if (!r || typeof r !== 'object') { console.log(String(r)); return; }
  Object.keys(r).forEach(function (k) {
    var v = r[k];
    if (Array.isArray(v)) {
      console.log('== ' + k + ' (' + v.length + ') ==');
      v.forEach(function (item) { console.log(JSON.stringify(item)); });
    } else {
      console.log(k + ': ' + JSON.stringify(v));
    }
  });
}

/** Sincroniza ya, aunque nada haya cambiado. */
function sincronizarAhora() {
  procesarMovimientos_();
  var foto = tomarFoto_();
  var r = enviar_(foto, 'apply');
  imprimir_(r);
  guardarEnDrive_('sync-drive-ultima-sincronizacion.json', r);
  if (r && r.ok) PropertiesService.getScriptProperties().setProperty('ultima_huella', huella_(foto));
}

/** Lo que corre el trigger cada 5 minutos: solo llama a la app si hubo cambios. */
function sincronizarSiCambio() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // ya hay una corrida en curso
  try {
    // Primero lo que la app pidió mover; si se movió algo, la foto cambia y la
    // app se entera en esta misma corrida.
    procesarMovimientos_();
    var foto = tomarFoto_();
    var props = PropertiesService.getScriptProperties();
    var h = huella_(foto);
    if (props.getProperty('ultima_huella') === h) return;
    var r = enviar_(foto, 'apply');
    // Solo los conteos: las listas completas harían el registro ilegible cada 5 minutos.
    var resumen = {};
    Object.keys(r || {}).forEach(function (k) { if (!Array.isArray(r[k])) resumen[k] = r[k]; });
    console.log('Sync Drive: ' + JSON.stringify(resumen));
    if (r && r.ok) props.setProperty('ultima_huella', h);
  } finally {
    lock.releaseLock();
  }
}

function instalarTrigger() {
  desinstalarTrigger();
  ScriptApp.newTrigger('sincronizarSiCambio').timeBased().everyMinutes(MINUTOS).create();
  console.log('Trigger instalado: cada ' + MINUTOS + ' minutos.');
}

function desinstalarTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sincronizarSiCambio') ScriptApp.deleteTrigger(t);
  });
}

// ---------------------------------------------------------------------------
// App -> Drive: mover archivos cuando en la app cambia tipo, silo o confidencialidad.

var CARPETA_MIME = 'application/vnd.google-apps.folder';

// Nombre estándar al crear una carpeta que falta.
var NOMBRE_SILO = {
  compras: 'Compras', logistica: 'Logística', ventas: 'Ventas', personal: 'Personal',
  control: 'Control', mercadeo: 'Mercadeo', sistemas: 'Sistemas', procesos: 'Procesos',
  datos_maestros: 'Datos Maestros',
};
var NOMBRE_TIPO = {
  norma: 'Normas', procedimiento: 'Procedimientos', instructivo: 'Instructivos', anexo: 'Anexos',
  formato: 'Formatos', manual: 'Manuales', politica: 'Políticas', diagrama: 'Diagramas',
  descripcion_cargo: 'Descripciones de Cargo', presentacion_clave: 'Presentaciones Claves',
  presentacion: 'Presentaciones', libro: 'Libros', gestion_beneficios: 'Gestión de Beneficios',
};

/** Pide a la app los movimientos pendientes, los ejecuta y reporta. Nunca corta la sincronización. */
function procesarMovimientos_() {
  var r;
  try { r = llamar_('movimientos', {}); } catch (e) { console.warn('Movimientos: ' + e); return; }
  if (!r || !r.ok || !r.movimientos || r.movimientos.length === 0) return;

  var arbol = cargarArbol_(FUENTES[0].driveId);
  var resultados = r.movimientos.map(function (m) {
    try { return moverArchivo_(m, arbol); }
    catch (e) { return { id: m.id, estado: 'error', detalle: String(e && e.message || e) }; }
  });
  try { llamar_('movimientos_resultado', { resultados: resultados }); } catch (e) { console.warn('Movimientos (reporte): ' + e); }
  console.log('Movimientos: ' + JSON.stringify(resultados));
}

function moverArchivo_(m, arbol) {
  var archivo = Drive.Files.get(m.drive_file_id, { fields: 'id, name, parents', supportsAllDrives: true });
  var padres = archivo.parents || [];
  var destino = carpetaDestino_(m, arbol);

  // ¿Ya está donde corresponde? (respeta subcarpetas de área, p. ej. "Descripciones de Cargo / DC")
  if (padres.indexOf(destino.id) !== -1 || yaEstaBien_(padres[0], m, destino, arbol)) {
    return { id: m.id, estado: 'sin_cambio', detalle: destino.ruta };
  }
  Drive.Files.update({}, m.drive_file_id, null, {
    addParents: destino.id,
    removeParents: padres.join(','),
    supportsAllDrives: true,
    fields: 'id, parents',
  });
  return { id: m.id, estado: 'hecho', detalle: destino.ruta };
}

/** Carpeta destino según empresa / silo / área / tipo / confidencialidad. Crea lo que falte. */
function carpetaDestino_(m, arbol) {
  // Normas confidenciales de Personal: unidad restringida.
  var restringida = FUENTES[1];
  if (m.confidential && m.silo === 'personal' && m.doc_type === 'norma') {
    return { id: restringida.carpeta, ruta: 'Documentación restringida Personal / Personal / Normas Restringidas' };
  }
  var raiz = FUENTES[0].driveId;
  var empresa = hijoQue_(arbol, raiz, function (n) { return normalizar_(n) === normalizar_(m.empresa); });
  if (!empresa) throw new Error('No existe la carpeta de la empresa "' + m.empresa + '" en Documentación');

  var silo = hijoQue_(arbol, empresa.id, function (n) { return siloDeCarpeta_(n) === m.silo; })
    || crearCarpeta_(arbol, empresa.id, NOMBRE_SILO[m.silo] || m.silo);

  // Área: solo si ya existe esa ruta de carpetas dentro del silo (no se inventan áreas).
  var base = silo;
  if (m.subarea) {
    var actual = silo, ok = true;
    String(m.subarea).split(' / ').forEach(function (parte) {
      if (!ok) return;
      var h = hijoQue_(arbol, actual.id, function (n) { return normalizar_(n) === normalizar_(parte); });
      if (h) actual = h; else ok = false;
    });
    if (ok) base = actual;
  }
  var tipo = hijoQue_(arbol, base.id, function (n) { return tipoDeCarpeta_(n) === m.doc_type; })
    || crearCarpeta_(arbol, base.id, NOMBRE_TIPO[m.doc_type] || m.doc_type);
  return { id: tipo.id, ruta: rutaDe_(arbol, tipo.id) };
}

/** El archivo ya está en una carpeta del tipo correcto dentro del silo destino (y fuera de la restringida). */
function yaEstaBien_(padreId, m, destino, arbol) {
  if (!padreId || !arbol.porId[padreId]) return false; // está en otra unidad
  if (destino.id === FUENTES[1].carpeta) return false;
  var tipoOk = false, siloOk = false, id = padreId, guard = 0;
  while (id && arbol.porId[id] && guard++ < 30) {
    var n = arbol.porId[id].name;
    if (!tipoOk && tipoDeCarpeta_(n) === m.doc_type) tipoOk = true;
    if (arbol.porId[id].parent && arbol.porId[arbol.porId[id].parent] &&
        normalizar_(arbol.porId[arbol.porId[id].parent].name) === normalizar_(m.empresa)) {
      siloOk = siloDeCarpeta_(n) === m.silo;
      break;
    }
    id = arbol.porId[id].parent;
  }
  return tipoOk && siloOk;
}

function cargarArbol_(driveId) {
  var porId = {}, token = null;
  do {
    var resp = Drive.Files.list({
      corpora: 'drive', driveId: driveId, includeItemsFromAllDrives: true, supportsAllDrives: true,
      q: "mimeType = '" + CARPETA_MIME + "' and trashed = false",
      pageSize: 1000, pageToken: token, fields: 'nextPageToken, files(id, name, parents)',
    });
    (resp.files || []).forEach(function (f) { porId[f.id] = { id: f.id, name: f.name, parent: f.parents ? f.parents[0] : null }; });
    token = resp.nextPageToken;
  } while (token);
  return { driveId: driveId, porId: porId };
}

function hijoQue_(arbol, padreId, cumple) {
  for (var id in arbol.porId) {
    var c = arbol.porId[id];
    if (c.parent === padreId && cumple(c.name)) return c;
  }
  return null;
}

function crearCarpeta_(arbol, padreId, nombre) {
  var f = Drive.Files.create({ name: nombre, mimeType: CARPETA_MIME, parents: [padreId] }, null,
    { supportsAllDrives: true, fields: 'id, name, parents' });
  arbol.porId[f.id] = { id: f.id, name: f.name, parent: padreId };
  console.log('Carpeta creada: ' + rutaDe_(arbol, f.id));
  return arbol.porId[f.id];
}

function rutaDe_(arbol, id) {
  var partes = [], guard = 0;
  while (id && arbol.porId[id] && guard++ < 30) { partes.unshift(arbol.porId[id].name); id = arbol.porId[id].parent; }
  return partes.join(' / ');
}

// Mismas reglas de nombres que la función sync-drive.
function normalizar_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function siloDeCarpeta_(raw) {
  var n = normalizar_(raw);
  if (!n) return null;
  if (n.indexOf('logistica') !== -1) return 'logistica';
  if (n.indexOf('compras') !== -1) return 'compras';
  if (n.indexOf('ventas') !== -1) return 'ventas';
  if (n.indexOf('personal') !== -1) return 'personal';
  if (n === 'control' || n.indexOf('credito') !== -1 || n.indexOf('cobranza') !== -1) return 'control';
  if (n.indexOf('mercadeo') !== -1) return 'mercadeo';
  if (n.indexOf('sistemas') !== -1) return 'sistemas';
  if (n.indexOf('datos maestros') !== -1 || n.indexOf('integridad de datos') !== -1) return 'datos_maestros';
  if (n === 'procesos') return 'procesos';
  return null;
}
function tipoDeCarpeta_(raw) {
  var n = normalizar_(raw);
  if (n.indexOf('norma') === 0) return 'norma';
  if (n.indexOf('procedimiento') === 0) return 'procedimiento';
  if (n.indexOf('instructivo') === 0) return 'instructivo';
  if (n.indexOf('anexo') === 0) return 'anexo';
  if (n.indexOf('documentos relevantes') === 0 || n.indexOf('documento relevante') === 0) return 'anexo';
  if (n.indexOf('formato') === 0) return 'formato';
  if (n.indexOf('manual') === 0) return 'manual';
  if (n.indexOf('politica') === 0) return 'politica';
  if (n.indexOf('diagrama') === 0 || n.indexOf('flujograma') === 0) return 'diagrama';
  if (n.indexOf('descripcion') === 0 && n.indexOf('cargo') !== -1) return 'descripcion_cargo';
  if (n.indexOf('presentaciones clave') === 0 || n.indexOf('presentacion clave') === 0) return 'presentacion_clave';
  return null;
}

/** POST a la función con un modo y un cuerpo JSON. */
function llamar_(modo, cuerpo) {
  var secreto = PropertiesService.getScriptProperties().getProperty('DRIVE_SYNC_SECRET');
  if (!secreto) throw new Error('Falta la propiedad DRIVE_SYNC_SECRET (Configuración del proyecto).');
  var resp = UrlFetchApp.fetch(WEBHOOK_URL + '?mode=' + modo, {
    method: 'post', contentType: 'application/json',
    headers: { 'x-sync-secret': secreto },
    payload: JSON.stringify(cuerpo || {}), muteHttpExceptions: true,
  });
  try { return JSON.parse(resp.getContentText()); }
  catch (e) { return { ok: false, http: resp.getResponseCode(), texto: resp.getContentText() }; }
}

// ---------------------------------------------------------------------------

/** Lista los archivos no borrados de todas las FUENTES, con su ruta de carpetas. */
function tomarFoto_() {
  var archivos = [];
  FUENTES.forEach(function (fuente) {
    archivos = archivos.concat(fotoDeUnidad_(fuente));
  });
  return archivos;
}

function fotoDeUnidad_(fuente) {
  var items = [];
  var token = null;
  do {
    var resp = Drive.Files.list({
      corpora: 'drive',
      driveId: fuente.driveId,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: 'trashed = false',
      pageSize: 1000,
      pageToken: token,
      fields: 'nextPageToken, files(id, name, mimeType, parents, modifiedTime, webViewLink)',
    });
    items = items.concat(resp.files || []);
    token = resp.nextPageToken;
  } while (token);

  var carpetas = {};
  items.forEach(function (f) {
    if (f.mimeType === 'application/vnd.google-apps.folder') {
      carpetas[f.id] = { name: f.name, parent: f.parents ? f.parents[0] : null };
    }
  });

  var archivos = [];
  items.forEach(function (f) {
    if (f.mimeType === 'application/vnd.google-apps.folder') return;
    var r = ruta_(f.parents ? f.parents[0] : null, carpetas, fuente.driveId);
    // Con "carpeta", solo entra lo que cuelga de ella.
    if (fuente.carpeta && (!r || r.ids.indexOf(fuente.carpeta) === -1)) return;
    archivos.push({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      path: r ? fuente.prefijo.concat(r.nombres) : null,
    });
  });
  return archivos;
}

/** Carpetas desde la raíz de la unidad hasta el archivo (nombres e ids); null si no se puede armar. */
function ruta_(parentId, carpetas, driveId) {
  var nombres = [];
  var ids = [];
  var guard = 0;
  while (parentId && parentId !== driveId) {
    var c = carpetas[parentId];
    if (!c || guard++ > 30) return null;
    nombres.unshift(c.name);
    ids.unshift(parentId);
    parentId = c.parent;
  }
  return { nombres: nombres, ids: ids };
}

/** Huella de la foto para no llamar a la app si nada cambió. */
function huella_(archivos) {
  var s = archivos
    .map(function (f) { return f.id + '|' + f.name + '|' + f.modifiedTime + '|' + (f.path || []).join('/'); })
    .sort()
    .join('\n');
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(bytes);
}

function enviar_(archivos, modo) {
  var secreto = PropertiesService.getScriptProperties().getProperty('DRIVE_SYNC_SECRET');
  if (!secreto) throw new Error('Falta la propiedad DRIVE_SYNC_SECRET (Configuración del proyecto).');
  var resp = UrlFetchApp.fetch(WEBHOOK_URL + '?mode=' + modo, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-sync-secret': secreto },
    payload: JSON.stringify({ completo: true, archivos: archivos }),
    muteHttpExceptions: true,
  });
  var texto = resp.getContentText();
  try { return JSON.parse(texto); } catch (e) { return { ok: false, http: resp.getResponseCode(), texto: texto }; }
}
