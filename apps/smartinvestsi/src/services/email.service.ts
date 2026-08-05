import nodemailer from "nodemailer";
import { env } from "../config/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) {
    // In development, log instead of sending
    if (env.NODE_ENV !== "production") {
      console.log(`[EMAIL] To: ${params.to} | Subject: ${params.subject}`);
      return { success: true };
    }
    return { success: false, error: "SMTP not configured" };
  }

  try {
    await t.sendMail({
      from: env.SMTP_FROM ?? "noreply@smartinvestsi.com",
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const link = `${env.NODE_ENV === "production" ? "https://smartinvestsi.netlify.app" : "http://localhost:3000"}/reset-password.html?token=${resetToken}`;
  return sendEmail({
    to,
    subject: "Reset your SmartInvestsi password",
    html: `<p>Click the link below to reset your password:</p><a href="${link}">Reset Password</a><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendEmailConfirmation(to: string, confirmToken: string) {
  const link = `${env.NODE_ENV === "production" ? "https://smartinvestsi.netlify.app" : "http://localhost:3000"}/confirm-email.html?token=${confirmToken}`;
  return sendEmail({
    to,
    subject: "Confirm your SmartInvestsi email",
    html: `<p>Click the link below to confirm your email:</p><a href="${link}">Confirm Email</a><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPaymentConfirmation(to: string, amount: number, currency: string, reference: string) {
  return sendEmail({
    to,
    subject: "Payment Confirmed",
    html: `<p>Your payment of ${currency} ${amount} was successful.</p><p>Reference: ${reference}</p>`,
  });
}

export async function sendPaymentFailure(to: string, amount: number, reason: string) {
  return sendEmail({
    to,
    subject: "Payment Failed",
    html: `<p>Your payment of ${amount} could not be completed.</p><p>Reason: ${reason}</p><p>Please try again.</p>`,
  });
}

export async function sendKycStatus(to: string, status: string, notes?: string) {
  return sendEmail({
    to,
    subject: `KYC Verification ${status}`,
    html: `<p>Your KYC verification status is now <strong>${status}</strong>.</p>${notes ? `<p>${notes}</p>` : ""}`,
  });
}
