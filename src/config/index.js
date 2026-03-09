// CommonJS config helpers compatible with JS files
function parseList(envVar, fallback) {
  if (!envVar) return fallback;
  return envVar.split(/[,;\s]+/).filter(Boolean);
}

function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@smartinvest.example.com',
    to: process.env.ALERT_EMAILS || process.env.SMTP_TO || '',
  };
}

function paymentServicesConfig() {
  return {
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      mode: process.env.PAYPAL_MODE || 'sandbox',
      returnUrl: process.env.PAYPAL_RETURN_URL || '',
      cancelUrl: process.env.PAYPAL_CANCEL_URL || '',
    },
    googlePay: {
      merchantId: process.env.GOOGLE_MERCHANT_ID || '',
      merchantName: process.env.GOOGLE_MERCHANT_NAME || 'SmartInvest',
      email: process.env.GOOGLE_PAY_EMAIL || '',
      privateKey: process.env.GOOGLE_MERCHANT_PRIVATE_KEY || '',
      enabled: process.env.GOOGLE_PAY_ENABLED === 'true',
    },
    mpesa: {
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      shortcode: process.env.MPESA_SHORTCODE || '',
      timeout: parseInt(process.env.MPESA_TRANSACTION_TIMEOUT || '3000', 10),
      environment: process.env.MPESA_ENV || 'production',
    },
  };
}

function monitorConfig() {
  return {
    URLS: parseList(process.env.URLS, [
      'https://smartinvestsi.com',
      'https://smartinvestsi.com/api',
    ]),
    RESPONSE_TIME_THRESHOLD: Number(process.env.RESPONSE_TIME_THRESHOLD) || 2000,
    ERROR_RATE_THRESHOLD: Number(process.env.ERROR_RATE_THRESHOLD) || 0.2,
    HISTORY_LIMIT: Number(process.env.HISTORY_LIMIT) || 100,
    CHECK_INTERVAL: process.env.CHECK_INTERVAL || '*/1 * * * *',
  };
}

module.exports = { smtpConfig, paymentServicesConfig, monitorConfig };
