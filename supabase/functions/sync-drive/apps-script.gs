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
var DRIVE_ID = '0AIvHaBFZ0NhWUk9PVA'; // Unidad compartida "Documentación"
var MINUTOS = 5;

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

/** Lista todos los archivos no borrados de la unidad, con su ruta de carpetas. */
function tomarFoto_() {
  var items = [];
  var token = null;
  do {
    var resp = Drive.Files.list({
      corpora: 'drive',
      driveId: DRIVE_ID,
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
    archivos.push({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      path: ruta_(f.parents ? f.parents[0] : null, carpetas),
    });
  });
  return archivos;
}

/** Nombres de carpeta desde la raíz de la unidad hasta el archivo; null si no se puede armar. */
function ruta_(parentId, carpetas) {
  var path = [];
  var guard = 0;
  while (parentId && parentId !== DRIVE_ID) {
    var c = carpetas[parentId];
    if (!c || guard++ > 30) return null;
    path.unshift(c.name);
    parentId = c.parent;
  }
  return path;
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
