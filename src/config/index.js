/**
 * Configuration module helper for environment settings.
 * Compatible with CommonJS Node.js environments.
 */

// Parses delimited string lists (comma, semicolon, or space-separated)
function parseList(envVar, fallback = []) {
  if (!envVar || typeof envVar !== 'string') return fallback;
  const parsed = envVar.split(/[,;\s]+/).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

// Parses flexible boolean values (e.g. 'true', '1', 'yes')
function parseBool(envVar, fallback = false) {
  if (envVar === undefined || envVar === null) return fallback;
  return ['true', '1', 'yes'].includes(String(envVar).trim().toLowerCase());
}

/**
 * SMTP / Email Transporter Configuration
 */
function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseBool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@smartinvest.example.com',
    to: process.env.ALERT_EMAILS || process.env.SMTP_TO || '',
  };
}

/**
 * Payment Gateways & Services Configuration
 */
function paymentServicesConfig() {
  // Replace escaped newlines for RSA Private Keys if necessary
  const formattedGoogleKey = process.env.GOOGLE_MERCHANT_PRIVATE_KEY
    ? process.env.GOOGLE_MERCHANT_PRIVATE_KEY.replace(/\\n/g, '\n')
    : '';

  return {
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      mode: process.env.PAYPAL_MODE || 'sandbox', // 'sandbox' | 'live'
      returnUrl: process.env.PAYPAL_RETURN_URL || '',
      cancelUrl: process.env.PAYPAL_CANCEL_URL || '',
    },
    googlePay: {
      merchantId: process.env.GOOGLE_MERCHANT_ID || '',
      merchantName: process.env.GOOGLE_MERCHANT_NAME || 'SmartInvest',
      email: process.env.GOOGLE_PAY_EMAIL || '',
      privateKey: formattedGoogleKey,
      enabled: parseBool(process.env.GOOGLE_PAY_ENABLED, false),
    },
    mpesa: {
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      shortcode: process.env.MPESA_SHORTCODE || '',
      timeout: parseInt(process.env.MPESA_TRANSACTION_TIMEOUT || '3000', 10),
      environment: process.env.MPESA_ENV || 'production', // 'sandbox' | 'production'
    },
  };
}

/**
 * Service Health Monitoring Configuration
 */
function monitorConfig() {
  const defaultUrls = [
    'https://smartinvestsi.netlify.app',
    'https://smartinvestsi.netlify.app/api',
  ];

  return {
    URLS: parseList(process.env.URLS, defaultUrls),
    RESPONSE_TIME_THRESHOLD: Number(process.env.RESPONSE_TIME_THRESHOLD) || 2000,
    ERROR_RATE_THRESHOLD: Number(process.env.ERROR_RATE_THRESHOLD) || 0.2,
    HISTORY_LIMIT: Number(process.env.HISTORY_LIMIT) || 100,
    CHECK_INTERVAL: process.env.CHECK_INTERVAL || '*/1 * * * *',
  };
}

/**
 * Optional helper to check required secrets on server startup
 */
function validateConfig() {
  const warnings = [];
  if (!process.env.SMTP_USER && process.env.NODE_ENV === 'production') {
    warnings.push('SMTP_USER is missing.');
  }
  if (!process.env.MPESA_CONSUMER_KEY && process.env.NODE_ENV === 'production') {
    warnings.push('MPESA_CONSUMER_KEY is missing.');
  }
  
  if (warnings.length > 0) {
    console.warn('[Config Warning]: Missing required production configs:', warnings.join(', '));
  }
}

module.exports = {
  smtpConfig,
  paymentServicesConfig,
  monitorConfig,
  validateConfig,
};
    
