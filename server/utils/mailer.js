const nodemailer = require('nodemailer');

function hasSmtpConfig() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!hasSmtpConfig()) return null;

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendMailSafe({ to, subject, html }) {
  try {
    const transport = getTransport();
    if (!transport) return { skipped: true, reason: 'SMTP not configured' };

    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    await transport.sendMail({ from, to, subject, html });
    return { success: true };
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendMailSafe };


