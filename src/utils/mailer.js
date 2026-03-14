import nodemailer from 'nodemailer';

// create a transporter object from environment variables
// supports both SMTP_* and EMAIL_* prefixes for compatibility
const createTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = process.env.SMTP_PORT || process.env.EMAIL_PORT;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

  if (!host || !port || !user || !pass) {
    return null; // not configured
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465, // SSL for port 465
    auth: { user, pass },
  });
};

// simple wrapper that sends mail using the transporter if available,
// otherwise falls back to logging to console
export async function sendEmail(to, subject, text) {
  const transporter = createTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || (process.env.SMTP_USER || process.env.EMAIL_USER),
        to,
        subject,
        text,
      });
      return;
    } catch (err) {
      console.warn('mailer send failed, falling back to console', err);
    }
  }

  // fallback logging
  console.log('=== email ===');
  console.log('to:', to);
  console.log('subject:', subject);
  console.log(text);
  console.log('=============\n');
}

