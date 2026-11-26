/**
 * Notificaciones por correo del Gestor de Procesos.
 *
 * Cada minuto pide a la aplicación los avisos nuevos de la campanita
 * (asignaciones, tareas, comentarios, recordatorios) y los manda por Gmail.
 * Si a una persona le llegan varios avisos a la vez, recibe un solo correo.
 * Los correos salen desde la cuenta que instala este script.
 *
 * Instalación (una sola vez, idealmente con procesos@mayoreo.biz):
 *   1. https://script.google.com > Nuevo proyecto. Nómbralo "Notificaciones Gestor".
 *   2. Pega este archivo completo en Código.gs y guarda (Ctrl + S).
 *   3. ⚙️ Configuración del proyecto > Propiedades del script > agrega
 *      NOTIF_EMAIL_SECRET con el mismo valor del secreto en Supabase.
 *   4. Ejecuta "probarEnvio" (te manda un correo de prueba a ti) y acepta los permisos.
 *   5. Ejecuta "instalarTrigger". Desde ese momento corre solo cada minuto.
 *
 * Para pausarlo: ejecuta "desinstalarTrigger".
 */

var WEBHOOK_URL = 'https://qtxfokwwwfmovicdbtre.supabase.co/functions/v1/notificar-email';
var APP_URL = 'https://gestion-procesos-mayoreo.vercel.app';
var REMITENTE = 'Gestor de Procesos Mayoreo';

/** Corre cada minuto: manda los avisos pendientes. */
function enviarNotificaciones() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var avisos = llamar_('pendientes', null).avisos || [];
    if (avisos.length === 0) return;

    // Agrupa por destinatario.
    var porCorreo = {};
    avisos.forEach(function (a) {
      var k = String(a.email).toLowerCase();
      (porCorreo[k] = porCorreo[k] || { email: a.email, nombre: a.nombre, avisos: [] }).avisos.push(a);
    });

    var errores = [];
    Object.keys(porCorreo).forEach(function (k) {
      var g = porCorreo[k];
      try {
        enviarCorreo_(g);
      } catch (err) {
        g.avisos.forEach(function (a) { errores.push({ id: a.id, error: String(err.message || err) }); });
      }
    });
    if (errores.length) llamar_('errores', { errores: errores });
    console.log('Avisos enviados: ' + (avisos.length - errores.length) + ', con error: ' + errores.length);
  } finally {
    lock.releaseLock();
  }
}

function enviarCorreo_(g) {
  var n = g.avisos.length;
  var asunto = n === 1 ? g.avisos[0].titulo : 'Tienes ' + n + ' avisos nuevos en el Gestor de Procesos';
  var items = g.avisos.map(function (a) {
    var url = APP_URL + (a.link || '/');
    return '<tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb">' +
      '<div style="font-weight:600;font-size:15px;color:#111827">' + esc_(a.titulo) + '</div>' +
      (a.mensaje ? '<div style="font-size:14px;color:#4b5563;margin-top:4px">' + esc_(a.mensaje) + '</div>' : '') +
      '<div style="margin-top:10px"><a href="' + esc_(url) + '" style="display:inline-block;background:#0f766e;color:#ffffff;' +
      'text-decoration:none;padding:7px 14px;border-radius:6px;font-size:13px">Ver en el Gestor</a></div>' +
      '</td></tr>';
  }).join('');
  var primerNombre = String(g.nombre || '').split(' ')[0];
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111827">' +
    '<p style="font-size:15px">Hola' + (primerNombre ? ' ' + esc_(primerNombre) : '') + ',</p>' +
    '<p style="font-size:15px">' + (n === 1 ? 'Tienes un aviso nuevo' : 'Tienes ' + n + ' avisos nuevos') +
    ' en el Gestor de Procesos:</p>' +
    '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px">' + items + '</table>' +
    '<p style="font-size:12px;color:#6b7280;margin-top:18px">Este es un correo automático del Gestor de Procesos Mayoreo. ' +
    'También verás estos avisos en la campanita dentro del sistema.</p></div>';
  var texto = g.avisos.map(function (a) {
    return '• ' + a.titulo + (a.mensaje ? '\n  ' + a.mensaje : '') + '\n  ' + APP_URL + (a.link || '/');
  }).join('\n\n');

  MailApp.sendEmail({ to: g.email, subject: asunto, body: texto, htmlBody: html, name: REMITENTE });
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function llamar_(modo, cuerpo) {
  var secreto = PropertiesService.getScriptProperties().getProperty('NOTIF_EMAIL_SECRET');
  if (!secreto) throw new Error('Falta la propiedad NOTIF_EMAIL_SECRET (Configuración del proyecto).');
  var resp = UrlFetchApp.fetch(WEBHOOK_URL + '?mode=' + modo, {
    method: 'post', contentType: 'application/json',
    headers: { 'x-sync-secret': secreto },
    payload: JSON.stringify(cuerpo || {}), muteHttpExceptions: true,
  });
  var texto = resp.getContentText();
  if (resp.getResponseCode() >= 300) throw new Error('HTTP ' + resp.getResponseCode() + ': ' + texto);
  return JSON.parse(texto);
}

/** Te manda un correo de ejemplo a ti mismo (y comprueba la conexión con la app). */
function probarEnvio() {
  llamar_('errores', { errores: [] });   // valida la clave sin tomar avisos
  var yo = Session.getActiveUser().getEmail();
  enviarCorreo_({ email: yo, nombre: '', avisos: [{
    titulo: 'Correo de prueba', mensaje: 'Si lees esto, las notificaciones por correo están listas.', link: '/',
  }] });
  console.log('Correo de prueba enviado a ' + yo + '. Cupo de correos restante hoy: ' + MailApp.getRemainingDailyQuota());
}

function instalarTrigger() {
  desinstalarTrigger();
  ScriptApp.newTrigger('enviarNotificaciones').timeBased().everyMinutes(1).create();
  console.log('Listo: los avisos se mandarán por correo cada minuto.');
}

function desinstalarTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'enviarNotificaciones') ScriptApp.deleteTrigger(t);
  });
}
