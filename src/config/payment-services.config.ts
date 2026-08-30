/**
 * Consolidated Payment Service Configuration
 * SmartInvestsi Payment Integration Hub
 *
 * IMPORTANT:
 * - Never put credentials, private keys, passwords, tokens, or signing secrets
 *   in source control.
 * - Required secrets must be supplied through Netlify environment variables.
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
    mode: 'production' | 'sandbox';
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

import CONFIG from '../config';

const env = (name: string): string => process.env[name]?.trim() || '';

const paymentServicesConfig: PaymentServicesConfig = {
  paypal: {
    enabled: process.env.PAYPAL_ENABLED !== 'false',
    priority: 1,
    timeout: 30000,
    retryAttempts: 3,
    clientId: env('PAYPAL_CLIENT_ID'),
    clientSecret: env('PAYPAL_CLIENT_SECRET'),
    mode: process.env.PAYPAL_MODE === 'production' ? 'production' : 'sandbox',
    receiverEmail: env('PAYPAL_RECEIVER_EMAIL'),
    returnUrl: env('PAYPAL_RETURN_URL'),
    cancelUrl: env('PAYPAL_CANCEL_URL'),
  },

  googlePay: {
    enabled: process.env.GOOGLE_PAY_ENABLED === 'true',
    priority: 2,
    timeout: 30000,
    retryAttempts: 3,
    merchantId: env('GOOGLE_MERCHANT_ID'),
    merchantName: env('GOOGLE_MERCHANT_NAME'),
    email: env('GOOGLE_PAY_EMAIL'),
    environment:
      process.env.GOOGLE_PAY_ENVIRONMENT === 'PRODUCTION'
        ? 'PRODUCTION'
        : 'TEST',
    merchantPrivateKey: env('GOOGLE_MERCHANT_PRIVATE_KEY'),
  },

  stripe: {
    enabled: process.env.STRIPE_ENABLED === 'true',
    priority: 3,
    timeout: 30000,
    retryAttempts: 3,
    apiKey: env('STRIPE_PUBLIC_API_KEY'),
    secretKey: env('STRIPE_SECRET_KEY'),
    webhookSecret: env('STRIPE_WEBHOOK_SECRET'),
  },

  mpesa: {
    enabled: process.env.MPESA_ENABLED !== 'false',
    priority: 4,
    timeout: CONFIG.MPESA.TRANSACTION_TIMEOUT,
    retryAttempts: 3,
    consumerKey: env('MPESA_CONSUMER_KEY'),
    consumerSecret: env('MPESA_CONSUMER_SECRET'),
    environment: CONFIG.MPESA.ENV,
    shortcode: env('MPESA_SHORTCODE'),
    paybill: env('MPESA_PAYBILL'),
    passkey: env('MPESA_PASSKEY'),
    callbackUrl: env('MPESA_CALLBACK_URL'),
  },

  kcbBank: {
    enabled: process.env.KCB_BANK_ENABLED === 'true',
    priority: 5,
    timeout: 60000,
    retryAttempts: 1,
    bankName: env('KCB_BANK_NAME'),
    accountName: env('KCB_ACCOUNT_NAME'),
    accountNumber: env('KCB_ACCOUNT_NUMBER'),
    branchName: env('KCB_BRANCH_NAME'),
    branchCode: env('KCB_BRANCH_CODE'),
  },
};

/**
 * Admin Configuration
 *
 * Identity and credentials are supplied exclusively through environment
 * variables. Do not add real values as fallbacks.
 */
const adminConfig = {
  email: env('ADMIN_EMAIL'),
  password: env('ADMIN_PASSWORD') || env('ADMIN_PASS'),
  accountId: env('ADMIN_ACCOUNT_ID'),
  permissions: ['full_access', 'manage_payments', 'manage_users', 'manage_audit_logs'],
};

/**
 * Security Configuration
 */
const securityConfig = {
  jwt: {
    secret: env('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES || '12h',
    enforceStrict: process.env.ENFORCE_STRICT_JWT === 'true',
  },
  session: {
    secret: env('SESSION_SECRET'),
    timeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10),
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  ipEnforcement: {
    enabled: process.env.ENABLE_IP_ENFORCEMENT === 'true',
  },
  twoFactorAuth: {
    enabled: process.env.ENABLE_TWO_FACTOR_AUTH === 'true',
  },
  loginAttempts: {
    maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10),
  },
};

/**
 * Email Configuration
 */
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  user: env('EMAIL_USER'),
  password: env('EMAIL_PASSWORD'),
  from: env('EMAIL_FROM'),
  fromName: process.env.EMAIL_FROM_NAME || 'SmartInvestsi Support',
  supportEmail: env('SUPPORT_EMAIL'),
  supportPhone: env('SUPPORT_PHONE'),
};

/**
 * Payment Processing Configuration
 */
const paymentProcessingConfig = {
  timeout: parseInt(process.env.PAYMENT_TIMEOUT || '30000', 10),
  retryAttempts: parseInt(process.env.PAYMENT_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.PAYMENT_RETRY_DELAY || '1000', 10),
  idempotencyKeyTTL: parseInt(process.env.IDEMPOTENCY_KEY_TTL || '86400', 10),
  webhooks: {
    enableVerification: process.env.WEBHOOK_ENABLE_VERIFICATION !== 'false',
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '5000', 10),
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3', 10),
  },
};

/**
 * Database Configuration
 */
const databaseConfig = {
  mongoUri: env('MONGODB_URI'),
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMs: parseInt(process.env.DB_POOL_IDLE_MS || '45000', 10),
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

export default {
  payment: paymentServicesConfig,
  admin: adminConfig,
  security: securityConfig,
  email: emailConfig,
  paymentProcessing: paymentProcessingConfig,
  database: databaseConfig,
  features: featureFlags,
  environment: {
    isProduction:
      process.env.IS_PRODUCTION === 'true' ||
      process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    appUrl: env('APP_URL'),
    frontendUrl: env('FRONTEND_URL'),
    logLevel: process.env.LOG_LEVEL || 'info',
    monitoring: {
      enabled: process.env.ENABLE_MONITORING === 'true',
      auditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
    },
  },
};
