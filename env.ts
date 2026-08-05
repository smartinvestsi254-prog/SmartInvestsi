// root env.ts - mirror of src/config/env.ts to support projects that import root env
import { z } from 'zod';

const csv = z
  .string()
  .optional()
  .default('')
  .transform((val) => (val && val.length ? val.split(',').map((s) => s.trim()).filter(Boolean) : []));

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  ADMIN_REG_SECRET: z.string().optional(),
  ADMIN_FALLBACK_KEY: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  HCAPTCHA_SITEKEY: z.string().optional(),
  HCAPTCHA_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ALLOWED_ORIGINS: csv,
  ADMIN_IPS: csv.optional(),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  TEST_MODE: z.string().optional().transform((v) => (v === 'true')),
  SLOW_REQUEST_THRESHOLD_MS: z.coerce.number().default(2000),
  REDIS_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  CRYPTO_OKX_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

const productionSchema = baseSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production') {
    if (!env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ALLOWED_ORIGINS must be set in production' });
    }
    if (env.PAYPAL_MODE === 'live' && env.TEST_MODE) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TEST_MODE cannot be true in PAYPAL live mode' });
    }
    if (env.SMTP_HOST && (!env.SMTP_USER || !env.SMTP_PASS)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Incomplete SMTP configuration' });
    }
  }
});

function validateEnv() {
  const parsed = productionSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.format());
    throw new Error('Environment validation failed');
  }
  return parsed.data;
}

export const env = validateEnv();
export type Env = typeof env;