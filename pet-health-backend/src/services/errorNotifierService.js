import nodemailer from 'nodemailer';

let cachedTransporter = null;
const lastSentByKey = new Map();

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.ALERT_SMTP_HOST;
  const port = Number(process.env.ALERT_SMTP_PORT || 587);
  const user = process.env.ALERT_SMTP_USER;
  const pass = String(process.env.ALERT_SMTP_PASS || '').replace(/\s+/g, '');
  if (!host || !user || !pass) return null;
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cachedTransporter;
}

function shouldSendNow(code) {
  const minIntervalSeconds = Number(process.env.ALERT_MIN_INTERVAL_SECONDS || 300);
  const now = Date.now();
  const lastSentAt = lastSentByKey.get(code) || 0;
  if (now - lastSentAt < minIntervalSeconds * 1000) {
    return false;
  }
  lastSentByKey.set(code, now);
  return true;
}

export async function notifySystemError({ req, err, code, status }) {
  try {
    const to = process.env.ALERT_ERROR_TO_EMAIL;
    const from = process.env.ALERT_ERROR_FROM_EMAIL || process.env.ALERT_SMTP_USER;
    if (!to || !from) return;
    if (!shouldSendNow(code || 'INTERNAL_ERROR')) return;
    const transporter = getTransporter();
    if (!transporter) return;

    const subject = `[PetHealth] ${code || 'INTERNAL_ERROR'} (${status || 500})`;
    const body = [
      `Time: ${new Date().toISOString()}`,
      `Path: ${req.method} ${req.originalUrl}`,
      `Status: ${status || 500}`,
      `Code: ${code || 'INTERNAL_ERROR'}`,
      `User: ${req.user?.id || 'anonymous'}`,
      `IP: ${req.ip}`,
      '',
      'Error details:',
      String(err?.stack || err?.message || err),
    ].join('\n');

    await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
    });
  } catch (mailErr) {
    console.error('Error email notification failed:', mailErr);
  }
}

export async function sendTestAlertEmail({ source = 'manual-api-test' } = {}) {
  const to = process.env.ALERT_ERROR_TO_EMAIL;
  const from = process.env.ALERT_ERROR_FROM_EMAIL || process.env.ALERT_SMTP_USER;
  if (!to || !from) {
    throw new Error('Missing ALERT_ERROR_TO_EMAIL or ALERT_ERROR_FROM_EMAIL/ALERT_SMTP_USER');
  }
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('SMTP is not configured. Check ALERT_SMTP_HOST/PORT/USER/PASS');
  }
  const info = await transporter.sendMail({
    from,
    to,
    subject: '[PetHealth] Test alert email',
    text: `Test alert email sent at ${new Date().toISOString()} (source: ${source}).`,
  });
  return info?.messageId || 'sent';
}

