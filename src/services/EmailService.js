const { sendMail } = require("../utils/email");
const { info, error } = require("../utils/logger");

/**
 * SmartInvest: Email Service Implementation
 * Handles sending emails for user notifications and confirmations
 * @module services/EmailService
 */

class EmailService {
  /**
   * Initialize email service
   * @param {Object} config - Email configuration
   * @param {string} config.smtpHost - SMTP server hostname
   * @param {number} config.smtpPort - SMTP port
   * @param {string} config.smtpUser - SMTP username
   * @param {string} config.smtpPass - SMTP password
   * @param {string} config.senderEmail - From email address
   */
  constructor(config = {}) {
    this.smtpHost = config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    this.smtpPort = config.smtpPort || process.env.SMTP_PORT || 587;
    this.smtpUser = config.smtpUser || process.env.SMTP_USER;
    this.smtpPass = config.smtpPass || process.env.SMTP_PASS;
    this.senderEmail = config.senderEmail || process.env.SMTP_FROM || 'noreply@smartinvest.example.com';
    this.isConfigured = !!(this.smtpUser && this.smtpPass);
  }

  /**
   * Send payment confirmation email
   * @param {Object} params - Email parameters
   * @param {string} params.toEmail - Recipient email
   * @param {string} params.amount - Payment amount
   * @param {string} params.receipt - M-Pesa receipt number
   * @param {string} params.currency - Currency code (default: KES)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendPaymentConfirmation(params) {
    const { toEmail, amount, receipt, currency = 'KES' } = params;

    if (!toEmail || !amount || !receipt) {
      return { success: false, error: 'Missing required parameters' };
    }

    if (!this.isConfigured) {
      console.log(`[EMAIL-STUB] Payment confirmation to ${toEmail}: ${amount} ${currency} (${receipt})`);
      return { success: true, messageId: 'stub-' + Date.now() };
    }

    const subject = `SmartInvest Payment Confirmation - ${receipt}`;
    const htmlBody = `<p>Payment of ${amount} ${currency} has been received. Receipt: ${receipt}</p>`;

    try {
      const result = await sendMail({
        from: this.senderEmail,
        to: toEmail,
        subject,
        html: htmlBody,
      });
      if (!result.success) throw result.error;
      info(`[EMAIL] Payment confirmation to ${toEmail}`);
      return { success: true, messageId: result.info?.messageId || 'email-' + Date.now() };
    } catch (err) {
      error('Email send error:', err);
      return { success: false, error: err.message || err };
    }
  }

  /**
   * Send payment failure notification
   * @param {Object} params - Email parameters
   * @param {string} params.toEmail - Recipient email
   * @param {string} params.reason - Failure reason
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendPaymentFailure(params) {
    const { toEmail, reason } = params;

    if (!toEmail || !reason) {
      return { success: false, error: 'Missing required parameters' };
    }

    if (!this.isConfigured) {
      console.log(`[EMAIL-STUB] Payment failure to ${toEmail}: ${reason}`);
      return { success: true, messageId: 'stub-' + Date.now() };
    }

    const subject = 'SmartInvest Payment Failed - Action Required';
    const htmlBody = `<p>Payment failure: ${reason}</p>`;
    try {
      const result = await sendMail({
        from: this.senderEmail,
        to: toEmail,
        subject,
        html: htmlBody,
      });
      if (!result.success) throw result.error;
      info(`[EMAIL] Payment failure notification to ${toEmail}`);
      return { success: true, messageId: result.info?.messageId || 'email-' + Date.now() };
    } catch (err) {
      error('Email send error:', err);
      return { success: false, error: err.message || err };
    }
  }

  /**
   * Send premium access granted notification
   * @param {Object} params - Email parameters
   * @param {string} params.toEmail - Recipient email
   * @param {Date} params.expiresAt - Expiration date
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendPremiumAccessGranted(params) {
    const { toEmail, expiresAt } = params;

    if (!toEmail) {
      return { success: false, error: 'Missing email address' };
    }

    if (!this.isConfigured) {
      console.log(`[EMAIL-STUB] Premium access granted to ${toEmail}`);
      return { success: true, messageId: 'stub-' + Date.now() };
    }

    const expireDate = expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Unlimited';
    try {
      const result = await sendMail({
        from: this.senderEmail,
        to: toEmail,
        subject: 'Your SmartInvest Premium Access is Active',
        html: `<p>Your premium access is valid until ${expireDate}.</p>`,
      });
      if (!result.success) throw result.error;
      info(`[EMAIL] Premium access notification to ${toEmail}`);
      return { success: true, messageId: result.info?.messageId || 'email-' + Date.now() };
    } catch (err) {
      error('Email send error:', err);
      return { success: false, error: err.message || err };
    }
  }

  /**
   * Send reset password email
   * @param {Object} params - Email parameters
   * @param {string} params.toEmail - Recipient email
   * @param {string} params.resetLink - Password reset URL
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendPasswordReset(params) {
    const { toEmail, resetLink } = params;

    if (!toEmail || !resetLink) {
      return { success: false, error: 'Missing required parameters' };
    }

    if (!this.isConfigured) {
      console.log(`[EMAIL-STUB] Password reset link to ${toEmail}`);
      return { success: true, messageId: 'stub-' + Date.now() };
    }

    try {
      const result = await sendMail({
        from: this.senderEmail,
        to: toEmail,
        subject: 'SmartInvest Password Reset',
        html: `<p>Please reset your password using the following link: <a href="${resetLink}">${resetLink}</a></p>`,
      });
      if (!result.success) throw result.error;
      info(`[EMAIL] Password reset sent to ${toEmail}`);
      return { success: true, messageId: result.info?.messageId || 'email-' + Date.now() };
    } catch (err) {
      error('Email send error:', err);
      return { success: false, error: err.message || err };
    }
  }
}

module.exports = EmailService;
