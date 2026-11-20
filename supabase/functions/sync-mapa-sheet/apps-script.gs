/**
 * Pegar este script dentro del Google Sheet del Mapa de Procesos
 * (Extensiones > Apps Script) para que cada edición en la pestaña "Index (dinámico)"
 * dispare automáticamente la sincronización hacia la aplicación.
 *
 * No sincroniza en cada tecla: espera ~60 segundos de calma tras la última
 * edición antes de avisarle a la aplicación, para no saturarla si alguien
 * está editando varias celdas seguidas.
 *
 * Instalación (una sola vez):
 *   1. En el Sheet: Extensiones > Apps Script.
 *   2. Borra el contenido de Code.gs y pega este archivo completo.
 *   3. Arriba, en el selector de función, elige "instalarTriggerDeEdicion" y
 *      presiona ▶ Ejecutar. Google pedirá autorizar el script la primera vez
 *      (es tuyo, solo llama a esta aplicación) — acepta los permisos.
 *   4. Listo. A partir de ahora, cualquier edición en el Sheet sincroniza el
 *      Mapa de Procesos solo, sin que nadie tenga que hacer nada más.
 *
 * IMPORTANTE: reemplaza SYNC_SECRET por el valor real (el mismo que se
 * configuró con `supabase secrets set MAPA_SYNC_SECRET=...`) antes de pegar
 * este script en Apps Script. No se guarda aquí a propósito, para no dejar
 * el secreto en el historial de git.
 */

var WEBHOOK_URL = 'https://qtxfokwwwfmovicdbtre.supabase.co/functions/v1/sync-mapa-sheet';
var SYNC_SECRET = 'REEMPLAZAR_CON_EL_SECRETO_REAL';
var DEBOUNCE_FN = 'ejecutarSincronizacionPendiente';

/** Trigger instalable de edición: se registra solo una vez desde instalarTriggerDeEdicion(). */
function onEditInstalable(e) {
  PropertiesService.getScriptProperties().setProperty('pendiente', 'true');

  var yaProgramado = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === DEBOUNCE_FN;
  });
  if (!yaProgramado) {
    ScriptApp.newTrigger(DEBOUNCE_FN).timeBased().after(60 * 1000).create();
  }
}

/** Se ejecuta ~60s después de la última edición. Llama a la aplicación una sola vez. */
function ejecutarSincronizacionPendiente() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === DEBOUNCE_FN) ScriptApp.deleteTrigger(t);
  });

  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('pendiente') !== 'true') return;
  props.setProperty('pendiente', 'false');

  try {
    var resp = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post',
      headers: { 'x-sync-secret': SYNC_SECRET },
      muteHttpExceptions: true,
    });
    console.log('Sincronización Mapa de Procesos: ' + resp.getContentText());
  } catch (err) {
    console.error('Error sincronizando Mapa de Procesos: ' + err);
  }
}

/** Ejecutar UNA VEZ manualmente para instalar el trigger de edición. */
function instalarTriggerDeEdicion() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onEditInstalable') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onEditInstalable')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  console.log('Trigger de edición instalado correctamente.');
}
