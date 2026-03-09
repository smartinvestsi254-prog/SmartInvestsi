// email.js - shared helpers for sending email with retry and transporter setup
const nodemailer = require('nodemailer');
const { smtpConfig } = require('../config');
const { warn, info, error } = require('./logger');

let transporter;

function createTransporter() {
  if (transporter) {
    return transporter;
  }

  const cfg = smtpConfig();
  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  transporter.verify().then(() => {
    info('📤 Email transporter ready');
  }).catch(err => {
    warn('⚠️ Email transporter verification failed:', err.message);
  });

  return transporter;
}

async function sendMail(options, retries = 3) {
  const t = createTransporter();
  let attempt = 0;

  while (attempt < retries) {
    attempt++;
    try {
      const infoRes = await t.sendMail(options);
      info(`📧 Email sent (attempt ${attempt})`);
      return { success: true, info: infoRes };
    } catch (err) {
      warn(`Email send failed (attempt ${attempt}):`, err.message);
      if (attempt >= retries) {
        error('Failed to send email after', retries, 'attempts');
        return { success: false, error: err };
      }
      // exponential backoff
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

module.exports = {
  sendMail,
  createTransporter,
};
