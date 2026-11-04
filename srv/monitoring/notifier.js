/**
 * Notifier — canales de notificación.
 *
 *  1. In-app: filas en `watch.Notifications` (las crea el engine).
 *  2. Email (opcional): un correo resumen por ejecución al `notifyEmail` del Watch.
 *     Requiere SMTP_URL (ej. smtps://usuario:clave@smtp.gmail.com:465) o
 *     cds.watch.notifications.email.smtp, y el paquete `nodemailer`.
 */
const cds = require('@sap/cds');
const { getConfig } = require('./config');

const LOG = cds.log('watch-notifier');
let transporter;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function getTransporter() {
  if (transporter !== undefined) return transporter;
  const cfg = getConfig().notifications.email;
  const smtp = cfg.smtp || process.env.SMTP_URL;
  if (!cfg.enabled || !smtp) {
    transporter = null;
    return transporter;
  }
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport(smtp);
  } catch (e) {
    LOG.warn('Email deshabilitado: no se pudo cargar nodemailer.', e.message);
    transporter = null;
  }
  return transporter;
}

function renderEmail(watch, notifications) {
  const items = notifications.map((n) => `
    <li style="margin-bottom:12px">
      <strong>${escapeHtml(n.title)}</strong><br/>
      <span>${escapeHtml(n.message)}</span><br/>
      ${n.url ? `<a href="${escapeHtml(n.url)}">Ver oferta</a>` : ''}
    </li>`).join('');
  return `
    <div style="font-family:Arial,sans-serif;color:#1b2a52">
      <h2>WATCH · ${escapeHtml(watch.name)}</h2>
      <ul style="padding-left:18px">${items}</ul>
      <p style="color:#5b6178;font-size:12px">Recibes este correo porque configuraste un Watch en WATCH.</p>
    </div>`;
}

/**
 * Envía (si aplica) un email resumen y actualiza el emailStatus de las notificaciones.
 * Nunca lanza: los errores de email no deben romper el monitoreo.
 */
async function deliver(watch, notifications) {
  if (!notifications.length || !watch.notifyEmail) return 'SKIPPED';
  const tx = getTransporter();
  if (!tx) return 'SKIPPED';

  let status = 'SENT';
  try {
    await tx.sendMail({
      from: getConfig().notifications.email.from,
      to: watch.notifyEmail,
      subject: notifications.length === 1
        ? `WATCH · ${notifications[0].title}`
        : `WATCH · ${notifications.length} novedades en "${watch.name}"`,
      html: renderEmail(watch, notifications)
    });
  } catch (e) {
    LOG.error(`Error enviando email para el Watch ${watch.ID}:`, e.message);
    status = 'FAILED';
  }

  const { Notifications } = cds.entities('watch');
  await cds.tx(() => UPDATE(Notifications)
    .set({ emailStatus: status })
    .where({ ID: { in: notifications.map((n) => n.ID) } }));
  return status;
}

/** Solo para tests. */
function _setTransporter(t) {
  transporter = t;
}

module.exports = { deliver, renderEmail, _setTransporter };

