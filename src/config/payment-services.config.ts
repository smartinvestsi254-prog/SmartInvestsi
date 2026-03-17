/**
 * Consolidated Payment Service Configuration
 * SmartInvest Payment Integration Hub
 * Centralized configuration for all payment providers
 */

interface PaymentServiceConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  retryAttempts: number;
}

interface PaymentServicesConfig {
  paypal: PaymentServiceConfig & {
    clientId: string;
    clientSecret: string;
    mode: 'live' | 'sandbox';
    receiverEmail: string;
    returnUrl: string;
    cancelUrl: string;
  };
  googlePay: PaymentServiceConfig & {
    merchantId: string;
    merchantName: string;
    email: string;
    environment: 'PRODUCTION' | 'TEST';
    merchantPrivateKey: string;
  };
  stripe: PaymentServiceConfig & {
    apiKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  mpesa: PaymentServiceConfig & {
    consumerKey: string;
    consumerSecret: string;
    environment: 'production' | 'sandbox';
    shortcode: string;
    paybill: string;
    passkey: string;
    callbackUrl: string;
  };
  kcbBank: PaymentServiceConfig & {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchName: string;
    branchCode: string;
  };
}

import CONFIG from './config';
const paymentServicesConfig: PaymentServicesConfig = {
  paypal: {
    enabled: true,
    priority: 1,
    timeout: 30000,
    retryAttempts: 3,
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: (process.env.PAYPAL_MODE as 'live' | 'sandbox') || 'live',
    receiverEmail: process.env.PAYPAL_RECEIVER_EMAIL || 'delijah5415@gmail.com',
    returnUrl: process.env.PAYPAL_RETURN_URL || 'https://smartinvestsi.netlify.app/paypal/return',
    cancelUrl: process.env.PAYPAL_CANCEL_URL || 'https://smartinvestsi.netlify.app/paypal/cancel',
  },

  googlePay: {
    enabled: process.env.GOOGLE_PAY_ENABLED === 'true',
    priority: 2,
    timeout: 30000,
    retryAttempts: 3,
    merchantId: process.env.GOOGLE_MERCHANT_ID || '',
    merchantName: process.env.GOOGLE_MERCHANT_NAME || 'SmartInvest',
    email: process.env.GOOGLE_PAY_EMAIL || 'delijah5415@gmail.com',
    environment: (process.env.GOOGLE_PAY_ENABLED === 'true' ? 'PRODUCTION' : 'TEST') as 'PRODUCTION' | 'TEST',
    merchantPrivateKey: process.env.GOOGLE_MERCHANT_PRIVATE_KEY || '',
  },

  stripe: {
    enabled: process.env.STRIPE_MODE === 'live',
    priority: 3,
    timeout: 30000,
    retryAttempts: 3,
    apiKey: process.env.STRIPE_LIVE_API_KEY || '',
    secretKey: process.env.STRIPE_LIVE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  mpesa: {
    enabled: true,
    priority: 4,
    timeout: CONFIG.MPESA.TRANSACTION_TIMEOUT,
    retryAttempts: 3,
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    environment: CONFIG.MPESA.ENV,
    shortcode: process.env.MPESA_SHORTCODE || '',
    paybill: process.env.MPESA_PAYBILL || '',
    passkey: process.env.MPESA_PASSKEY || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://smartinvestsi.netlify.app/api/pochi/callback',
  },

  kcbBank: {
    enabled: true,
    priority: 5,
    timeout: 60000, // Manual payment verification takes longer
    retryAttempts: 1,
    bankName: process.env.KCB_BANK_NAME || 'Kenya Commercial Bank',
    accountName: process.env.KCB_ACCOUNT_NAME || 'ELIJAH MUSYOKA DANIEL',
    accountNumber: process.env.KCB_ACCOUNT_NUMBER || '',
    branchName: process.env.KCB_BRANCH_NAME || '',
    branchCode: process.env.KCB_BRANCH_CODE || '',
  },
};

/**
 * Admin Configuration
 */
const adminConfig = {
  email: process.env.ADMIN_EMAIL || 'smartinvestsi254@gmail.com',
  password: process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '',
  accountId: process.env.ADMIN_ACCOUNT_ID || 'admin-smartinvest-001',
  permissions: ['full_access', 'manage_payments', 'manage_users', 'manage_audit_logs'],
};

/**
 * Security Configuration
 */
const securityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES || '12h',
    enforceStrict: process.env.ENFORCE_STRICT_JWT === 'true',
  },
  session: {
    secret: process.env.SESSION_SECRET || '',
    timeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'),
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  ipEnforcement: {
    enabled: process.env.ENABLE_IP_ENFORCEMENT === 'true',
  },
  twoFactorAuth: {
    enabled: process.env.ENABLE_TWO_FACTOR_AUTH === 'true',
  },
  loginAttempts: {
    maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'),
  },
};

/**
 * Email Configuration
 */
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  user: process.env.EMAIL_USER || 'smartinvestsi254@gmail.com',
  password: process.env.EMAIL_PASSWORD || '',
  from: process.env.EMAIL_FROM || 'noreply@smartinvestsi.netlify.app',
  fromName: process.env.EMAIL_FROM_NAME || 'SmartInvest Support',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@smartinvestsi.netlify.app',
  supportPhone: process.env.SUPPORT_PHONE || '+254700000000',
};

/**
 * Payment Processing Configuration
 */
const paymentProcessingConfig = {
  timeout: parseInt(process.env.PAYMENT_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.PAYMENT_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.PAYMENT_RETRY_DELAY || '1000'),
  idempotencyKeyTTL: parseInt(process.env.IDEMPOTENCY_KEY_TTL || '86400'),
  webhooks: {
    enableVerification: process.env.WEBHOOK_ENABLE_VERIFICATION !== 'false',
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '5000'),
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3'),
  },
};

/**
 * Database Configuration
 */
const databaseConfig = {
  mongoUri: process.env.MONGODB_URI || '',
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idleTimeoutMs: parseInt(process.env.DB_POOL_IDLE_MS || '45000'),
  },
};

/**
 * Feature Flags
 */
const featureFlags = {
  premiumAccess: process.env.FEATURE_PREMIUM_ACCESS === 'true',
  copyTrading: process.env.FEATURE_COPY_TRADING === 'true',
  portfolioManagement: process.env.FEATURE_PORTFOLIO_MANAGEMENT === 'true',
  alerts: process.env.FEATURE_ALERTS === 'true',
};

/**
 * Get enabled payment services in priority order
 */
export function getEnabledPaymentServices() {
  return Object.entries(paymentServicesConfig)
    .filter(([, config]) => config.enabled)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([name]) => name);
}

/**
 * Get a specific payment service configuration
 */
export function getPaymentServiceConfig(serviceName: string) {
  return paymentServicesConfig[serviceName as keyof PaymentServicesConfig] || null;
}

/**
 * Default export with all configurations
 */
export default {
  payment: paymentServicesConfig,
  admin: adminConfig,
  security: securityConfig,
  email: emailConfig,
  paymentProcessing: paymentProcessingConfig,
  database: databaseConfig,
  features: featureFlags,
  environment: {
    isProduction: process.env.IS_PRODUCTION === 'true' || process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    port: parseInt(process.env.PORT || '3000'),
    appUrl: process.env.APP_URL || 'https://smartinvestsi.netlify.app',
    frontendUrl: process.env.FRONTEND_URL || 'https://smartinvestsi.netlify.app',
    logLevel: process.env.LOG_LEVEL || 'info',
    monitoring: {
      enabled: process.env.ENABLE_MONITORING === 'true',
      auditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
    },
  },
};
