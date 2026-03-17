/**
 * Non-secret configuration for SmartInvest
 * Real secrets remain in .env / Netlify environment variables
 * Saves Netlify free tier env slots
 */

export const CONFIG = {
  // Crypto receiver addresses (extracted from crypto-payments.ts mocks)
  CRYPTO_RECEIVER_ADDRESSES: {
    btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    eth: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    usdc: '0xA0b86a33E6441e88C5F2712C3E9b74F5F5F5F5F5',
  } as const,

  // MPESA config (non-secrets)
  MPESA: {
    SHORTCODE: '8038267',
    ENV: 'sandbox' as const, // or 'production'
    CALLBACK_URL: 'https://smartinvestsi.netlify.app/.netlify/functions/payments-api/mpesa/callback',
    TRANSACTION_TIMEOUT: 3000, // ms, from payment-services.config.ts fallback
    DISCOVERY_URL: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    PRODUCTION_DISCOVERY_URL: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    STK_PUSH_URL: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/push',
    PRODUCTION_STK_PUSH_URL: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/push',
    QUERY_URL: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
    PRODUCTION_QUERY_URL: 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
  } as const,

  // Paypal non-secrets
  PAYPAL: {
    MODE: 'sandbox' as const,
  },

  // App globals (frontend-safe)
  APP: {
    URL: 'https://smartinvestsi.netlify.app',
  },

  // Other non-secrets
  TEST_MODE: false,
  CEO_ACCOUNT_ID: 'ceo_main_account', // fallback
  CEO_MANUAL_ACCOUNT_ID: 'ceo_manual',
  LOG_LEVEL: 'info',
  
  DATABASE: {
    PRIMARY_URL: process.env.DATABASE_URL!,
    FALLBACK_URL: process.env.NETLIFY_DB_URL!,
    HEALTH_CHECK_INTERVAL: 30000,
    MAX_RETRIES: 3,
    ADMIN_EMAIL: 'smartinvestsi254@gmail.com',
  } as const,
} as const;

export default CONFIG;

