/**
 * Script del Google Sheet del Mapa de Procesos (Extensiones > Apps Script).
 * Mantiene la app y el Sheet como espejo, en los dos sentidos:
 *
 *  • Sheet -> app: cada edición en el Sheet avisa a la aplicación (~60 s después
 *    de la última edición, para no saturarla si alguien edita varias celdas).
 *
 *  • App -> Sheet: cada minuto recoge lo que se creó, editó o eliminó en el
 *    Mapa de Procesos desde la app y lo escribe en la pestaña del silo
 *    (Logística, Personal, Compras, Ventas, Mercadeo, Control, Sistemas). La
 *    pestaña "Index (dinámico)" se recalcula sola a partir de esas pestañas.
 *    Las escrituras del script no disparan el trigger de edición, así que no
 *    hay ida y vuelta.
 *
 * Instalación (una sola vez, o al actualizar este script):
 *   1. En el Sheet: Extensiones > Apps Script.
 *   2. Reemplaza el contenido de Code.gs por este archivo completo y pon el
 *      secreto real en SYNC_SECRET (el mismo de MAPA_SYNC_SECRET).
 *   3. En el selector de función elige "instalarTriggers" y presiona ▶ Ejecutar.
 *      Google pedirá autorizar el script — acepta los permisos.
 *
 * IMPORTANTE: no subas el secreto real a git.
 */

var WEBHOOK_URL = 'https://qtxfokwwwfmovicdbtre.supabase.co/functions/v1/sync-mapa-sheet';
var SYNC_SECRET = 'REEMPLAZAR_CON_EL_SECRETO_REAL';
var DEBOUNCE_FN = 'ejecutarSincronizacionPendiente';

// Pestaña de cada silo y el texto que lleva en la columna "Area".
var PESTANAS = {
  logistica: { hoja: 'Logística', area: 'LOGISTICA' },
  personal:  { hoja: 'Personal',  area: 'PERSONAL', sinObservaciones: true },
  compras:   { hoja: 'Compras',   area: 'COMPRAS' },
  ventas:    { hoja: 'Ventas',    area: 'VENTAS' },
  mercadeo:  { hoja: 'Mercadeo',  area: 'MERCADEO' },
  control:   { hoja: 'Control',   area: 'CONTROL' },
  sistemas:  { hoja: 'Sistemas',  area: 'SISTEMAS' },
};
var PRIMERA_FILA = 5;   // las filas 1-4 son títulos y encabezados

// Columna (1 = A) de cada campo en las pestañas de silo.
var COLUMNA = {
  silo: 1, macroproceso_codigo: 2, macroproceso: 3, mapeo_sistemico: 4,
  proceso_codigo: 5, proceso: 6, subproceso_codigo: 7, subproceso: 8,
  documento_codigo: 9, doc_type: 10, title: 11, estatus: 12,
  fecha_actualizacion: 13, observaciones: 14,
};
var NUM_COLUMNAS = 14;

var TIPO = {
  anexo: 'Anexo', procedimiento: 'Procedimiento', norma: 'Norma', instructivo: 'Instructivo',
  politica: 'Política', descripcion_cargo: 'Descripción de Cargo', manual: 'Manual', libro: 'Libro',
  presentacion_clave: 'Presentación Clave', presentacion: 'Presentación', formato: 'Formato',
  gestion_beneficios: 'Gestión de Beneficios', diagrama: 'Diagrama',
};
var ESTATUS = {
  aprobado: 'Aprobado', revision: 'Revisión', por_aprobar: 'Por aprobar',
  desactualizado: 'Desactualizado', desincorporado: 'Desincorporado',
  en_construccion: 'Construcción', creada_ia: 'Creada con IA', por_iniciar: 'Por iniciar',
};

// ─────────────────────────── Sheet -> app ───────────────────────────

/** Trigger instalable de edición. */
function onEditInstalable(e) {
  PropertiesService.getScriptProperties().setProperty('pendiente', 'true');
  var yaProgramado = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === DEBOUNCE_FN;
  });
  if (!yaProgramado) {
    ScriptApp.newTrigger(DEBOUNCE_FN).timeBased().after(60 * 1000).create();
  }
}

/** Se ejecuta ~60 s después de la última edición. */
function ejecutarSincronizacionPendiente() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === DEBOUNCE_FN) ScriptApp.deleteTrigger(t);
  });
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('pendiente') !== 'true') return;
  props.setProperty('pendiente', 'false');
  sincronizarHaciaApp_();
}

function sincronizarHaciaApp_() {
  try {
    var resp = llamar_('', null);
    console.log('Sincronización Mapa de Procesos: ' + JSON.stringify(resp));
  } catch (err) {
    console.error('Error sincronizando Mapa de Procesos: ' + err);
  }
}

// ─────────────────────────── App -> Sheet ───────────────────────────

/** Corre cada minuto: escribe en el Sheet los cambios hechos en la app. */
function procesarCambiosApp() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { console.log('Otra ejecución está en curso; se omite esta.'); return; }
  try {
    var cambios = llamar_('hoja_pendientes', null).cambios || [];
    console.log('Cambios de la app por escribir: ' + cambios.length);
    if (cambios.length === 0) return;

    var libro = SpreadsheetApp.getActiveSpreadsheet();
    if (!libro) throw new Error('Este script debe estar dentro del Sheet del Mapa (Extensiones > Apps Script), no en un proyecto aparte.');
    var resultados = [];
    cambios.forEach(function (c) {
      try {
        var detalle = aplicarCambio_(libro, c);
        SpreadsheetApp.flush();   // si el Sheet rechaza algo, que falle este cambio y no toda la corrida
        resultados.push({ id: c.id, estado: 'hecho', detalle: detalle });
      } catch (err) {
        resultados.push({ id: c.id, estado: 'error', detalle: String(err.message || err) });
      }
    });
    SpreadsheetApp.flush();
    llamar_('hoja_resultado', { resultados: resultados });
    console.log('Cambios de la app escritos en el Sheet: ' + JSON.stringify(resultados));

    // Insertar/eliminar filas corre la numeración: se resincroniza para que la
    // app tenga el orden de las filas al día.
    sincronizarHaciaApp_();
  } finally {
    lock.releaseLock();
  }
}

function aplicarCambio_(libro, c) {
  var cambios = c.cambios || {};

  if (c.accion === 'insertar') {
    var destino = pestana_(libro, cambios.silo);
    var fila = insertarFila_(destino, cambios);
    escribir_(destino, fila, cambios, true);
    return 'Agregado en ' + destino.getName() + ', fila ' + fila;
  }

  // Ubica la fila tal como estaba antes del cambio; si no está, puede que el
  // cambio ya se haya aplicado en una corrida anterior (se busca con los datos nuevos).
  var antes = c.antes || {};
  var ubic = buscarFila_(libro, antes);
  if (!ubic) ubic = buscarFila_(libro, combinar_(antes, cambios));
  if (!ubic) {
    if (c.accion === 'eliminar') return 'La fila ya no estaba en el Sheet';
    throw new Error('No se encontró la fila en el Sheet (' + [antes.macroproceso_codigo, antes.proceso_codigo,
      antes.subproceso_codigo, antes.documento_codigo].join('-') + ' "' + antes.title + '")');
  }

  if (c.accion === 'eliminar') {
    ubic.hoja.deleteRow(ubic.fila);
    return 'Eliminada de ' + ubic.hoja.getName() + ', fila ' + ubic.fila;
  }

  // Cambio de silo: la fila pasa a la pestaña del silo nuevo.
  if (cambios.silo && PESTANAS[cambios.silo] && PESTANAS[cambios.silo].hoja !== ubic.hoja.getName()) {
    var original = ubic.hoja.getRange(ubic.fila, 1, 1, NUM_COLUMNAS).getValues()[0];
    var claves = {
      macroproceso_codigo: original[1], proceso_codigo: original[4], subproceso_codigo: original[6],
    };
    var nueva = pestana_(libro, cambios.silo);
    var filaNueva = insertarFila_(nueva, combinar_(claves, cambios));
    nueva.getRange(filaNueva, 1, 1, NUM_COLUMNAS).setValues([original]);   // copia tal cual
    escribir_(nueva, filaNueva, cambios, false);                           // y aplica lo cambiado
    ubic.hoja.deleteRow(ubic.fila);
    return 'Movido de ' + ubic.hoja.getName() + ' a ' + nueva.getName() + ', fila ' + filaNueva;
  }
  if (cambios.silo && !PESTANAS[cambios.silo]) {
    throw new Error('El silo "' + cambios.silo + '" no tiene pestaña en el Sheet');
  }

  escribir_(ubic.hoja, ubic.fila, cambios, false);
  return 'Actualizado en ' + ubic.hoja.getName() + ', fila ' + ubic.fila + ' (' + Object.keys(cambios).join(', ') + ')';
}

function pestana_(libro, silo) {
  var p = PESTANAS[silo];
  if (!p) throw new Error('El silo "' + silo + '" no tiene pestaña en el Sheet');
  var hoja = libro.getSheetByName(p.hoja);
  if (!hoja) throw new Error('No existe la pestaña "' + p.hoja + '"');
  return hoja;
}

function norm_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function coincide_(valores, d) {
  return String(valores[1]).trim() === String(d.macroproceso_codigo || '').trim() &&
    String(valores[4]).trim() === String(d.proceso_codigo || '').trim() &&
    String(valores[6]).trim() === String(d.subproceso_codigo || '').trim() &&
    String(valores[8]).trim() === String(d.documento_codigo || '').trim() &&
    norm_(valores[10]) === norm_(d.title);
}

/** Busca la fila del documento: primero en la pestaña de su silo, luego en todas. */
function buscarFila_(libro, d) {
  var nombres = [];
  if (PESTANAS[d.silo]) nombres.push(PESTANAS[d.silo].hoja);
  Object.keys(PESTANAS).forEach(function (k) {
    if (nombres.indexOf(PESTANAS[k].hoja) < 0) nombres.push(PESTANAS[k].hoja);
  });
  for (var i = 0; i < nombres.length; i++) {
    var hoja = libro.getSheetByName(nombres[i]);
    if (!hoja) continue;
    var ultima = hoja.getLastRow();
    if (ultima < PRIMERA_FILA) continue;
    var valores = hoja.getRange(PRIMERA_FILA, 1, ultima - PRIMERA_FILA + 1, NUM_COLUMNAS).getValues();
    // Si hay filas repetidas, gana la que está en la posición que conoce la app.
    if (i === 0 && d.orden_hoja >= PRIMERA_FILA && d.orden_hoja <= ultima &&
        coincide_(valores[d.orden_hoja - PRIMERA_FILA], d)) {
      return { hoja: hoja, fila: d.orden_hoja };
    }
    for (var r = 0; r < valores.length; r++) {
      if (coincide_(valores[r], d)) return { hoja: hoja, fila: PRIMERA_FILA + r };
    }
  }
  return null;
}

function combinar_(a, b) {
  var out = {};
  Object.keys(a).forEach(function (k) { out[k] = a[k]; });
  Object.keys(b).forEach(function (k) { out[k] = b[k]; });
  return out;
}

/**
 * Inserta una fila nueva junto a las de su mismo subproceso / proceso /
 * macroproceso (o al final de la pestaña) y devuelve su número.
 */
function insertarFila_(hoja, d) {
  var ultima = Math.max(hoja.getLastRow(), PRIMERA_FILA - 1);
  var despues = ultima;
  if (ultima >= PRIMERA_FILA) {
    var v = hoja.getRange(PRIMERA_FILA, 1, ultima - PRIMERA_FILA + 1, NUM_COLUMNAS).getValues();
    var ultimaCon = function (n) {
      var r = -1;
      for (var i = 0; i < v.length; i++) {
        var ok = String(v[i][1]).trim() === String(d.macroproceso_codigo || '').trim() &&
          (n < 2 || String(v[i][4]).trim() === String(d.proceso_codigo || '').trim()) &&
          (n < 3 || String(v[i][6]).trim() === String(d.subproceso_codigo || '').trim());
        if (ok) r = i;
      }
      return r;
    };
    var idx = ultimaCon(3);
    if (idx < 0) idx = ultimaCon(2);
    if (idx < 0) idx = ultimaCon(1);
    if (idx >= 0) despues = PRIMERA_FILA + idx;
    // Última fila con datos (getLastRow puede contar filas con formato vacías).
    else for (var j = v.length - 1; j >= 0; j--) {
      if (v[j].join('').trim()) { despues = PRIMERA_FILA + j; break; }
    }
  }
  hoja.insertRowAfter(despues);
  var nueva = despues + 1;
  // Fórmulas de columnas extra (p. ej. el código completo en Control y Sistemas).
  if (despues >= PRIMERA_FILA && hoja.getLastColumn() > NUM_COLUMNAS) {
    var extra = hoja.getLastColumn() - NUM_COLUMNAS;
    var formulas = hoja.getRange(despues, NUM_COLUMNAS + 1, 1, extra).getFormulasR1C1()[0];
    formulas.forEach(function (f, i) {
      if (f) hoja.getRange(nueva, NUM_COLUMNAS + 1 + i).setFormulaR1C1(f);
    });
  }
  return nueva;
}

/** Escribe los campos en la fila. `todo` = fila nueva (escribe todas las columnas). */
function escribir_(hoja, fila, d, todo) {
  var silo = siloDeHoja_(hoja);
  var sinObs = silo && PESTANAS[silo].sinObservaciones;
  // Primero valida todo, para no dejar la fila a medio escribir.
  var escrituras = [];
  Object.keys(COLUMNA).forEach(function (k) {
    if (!todo && !(k in d)) return;
    if (k === 'observaciones' && sinObs) return;   // Personal no tiene esa columna en el Index
    var celda = hoja.getRange(fila, COLUMNA[k]);
    escrituras.push([celda, valorPermitido_(celda, k, valorHoja_(k, d[k]))]);
  });
  escrituras.forEach(function (e) { e[0].setValue(e[1]); });
}

/**
 * Si la celda tiene una lista desplegable (validación de datos), devuelve el
 * valor tal como está escrito en la lista; si no está, falla con un mensaje claro.
 */
function valorPermitido_(celda, campo, valor) {
  if (valor === '' || valor instanceof Date) return valor;
  var regla = celda.getDataValidation();
  if (!regla) return valor;
  var tipo = regla.getCriteriaType();
  var permitidos = null;
  if (tipo === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    permitidos = regla.getCriteriaValues()[0];
  } else if (tipo === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
    permitidos = regla.getCriteriaValues()[0].getValues()
      .map(function (f) { return f[0]; }).filter(function (v) { return v !== ''; });
  }
  if (!permitidos) return valor;
  for (var i = 0; i < permitidos.length; i++) {
    if (norm_(permitidos[i]) === norm_(valor)) return permitidos[i];
  }
  if (!regla.getAllowInvalid()) {
    throw new Error('El valor "' + valor + '" (' + campo + ') no está permitido en la lista desplegable de la pestaña ' +
      celda.getSheet().getName() + '. Permitidos: ' + permitidos.join(', ') +
      '. Agrégalo a la lista del Sheet o usa uno de esos en la app.');
  }
  return valor;
}

function siloDeHoja_(hoja) {
  var nombre = hoja.getName();
  for (var k in PESTANAS) if (PESTANAS[k].hoja === nombre) return k;
  return null;
}

/** Convierte el valor de la app al texto que usa el Sheet. */
function valorHoja_(campo, v) {
  if (v === null || v === undefined) return '';
  switch (campo) {
    case 'silo': return PESTANAS[v] ? PESTANAS[v].area : v;
    case 'doc_type': return TIPO[v] || v;
    case 'estatus': return ESTATUS[v] || v;
    case 'fecha_actualizacion': {
      if (v instanceof Date) return v;
      var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : v;
    }
    default: return v;
  }
}

// ─────────────────────────── Comunes ───────────────────────────

function llamar_(modo, cuerpo) {
  var resp = UrlFetchApp.fetch(WEBHOOK_URL + (modo ? '?mode=' + modo : ''), {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-sync-secret': SYNC_SECRET },
    payload: cuerpo ? JSON.stringify(cuerpo) : '',
    muteHttpExceptions: true,
  });
  var texto = resp.getContentText();
  if (resp.getResponseCode() >= 300) throw new Error('HTTP ' + resp.getResponseCode() + ': ' + texto);
  return JSON.parse(texto);
}

/** Ejecutar UNA VEZ manualmente: instala el trigger de edición y el de cada minuto. */
function instalarTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'onEditInstalable' || fn === 'procesarCambiosApp') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onEditInstalable')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  ScriptApp.newTrigger('procesarCambiosApp').timeBased().everyMinutes(1).create();
  console.log('Triggers instalados: edición del Sheet y cambios de la app cada minuto.');
}

/** Compatibilidad con la instalación anterior. */
function instalarTriggerDeEdicion() { instalarTriggers(); }
