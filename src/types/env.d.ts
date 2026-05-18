declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: string;
    APP_URL?: string;
    ALPHAVANTAGE_API_KEY?: string;
    DATABASE_URL?: string;
    JWT_SECRET?: string;
    STRIPE_SECRET_KEY?: string;
    PAYPAL_CLIENT_ID?: string;
    PAYPAL_CLIENT_SECRET?: string;
    MPESA_CONSUMER_KEY?: string;
    MPESA_CONSUMER_SECRET?: string;
    MPESA_PASSKEY?: string;
    MPESA_SHORTCODE?: string;
    LOG_LEVEL?: string;
  }
}

export {};
