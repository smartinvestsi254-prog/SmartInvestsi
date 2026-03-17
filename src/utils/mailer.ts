import nodemailer from 'nodemailer';

// simple wrapper that sends email if SMTP is configured, otherwise logs to console
export async function sendEmail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || user,
        to,
        subject,
        text,
      });
      return;
    } catch (e) {
      console.warn('mailer send failed, falling back to console', e);
    }
  }

  // fallback
  console.log('=== email ===');
  console.log('to:', to);
  console.log('subject:', subject);
  console.log(text);
  console.log('=============
');
}
