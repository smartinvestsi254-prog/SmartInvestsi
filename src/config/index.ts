// central configuration loader

export function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@smartinvest.example.com',
    to: process.env.ALERT_EMAILS || '',
  };
}

// other shared configuration getters can be added here
export function paymentServicesConfig() {
  return {
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      mode: process.env.PAYPAL_MODE as 'live' | 'sandbox' || 'sandbox',
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
      environment: (process.env.MPESA_ENV as 'production' | 'sandbox') || 'production',
    },
    // add other providers here
  };
}
