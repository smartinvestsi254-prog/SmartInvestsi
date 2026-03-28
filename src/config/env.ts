import { z } from "zod";

/**
 * Helper: convert CSV → string[]
 */
const csv = z
  .string()
  .transform((val) => val.split(",").map((s) => s.trim()));

/**
 * Base schema (all environments)
 */
const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Auth
  JWT_SECRET: z.string().min(64, "JWT_SECRET must be ≥64 chars"),
  JWT_REFRESH_SECRET: z.string().min(64),
  SESSION_SECRET: z.string().min(64),

  ADMIN_REG_SECRET: z.string().optional(),
  ADMIN_FALLBACK_KEY: z.string().optional(),

  // Payments
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_MODE: z.enum(["sandbox", "live"]).default("sandbox"),

  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Security
  HCAPTCHA_SITEKEY: z.string().optional(),
  HCAPTCHA_SECRET: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Network
  ALLOWED_ORIGINS: csv,
  ADMIN_IPS: csv.optional(),

  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Feature flags
  TEST_MODE: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  SLOW_REQUEST_THRESHOLD_MS: z.coerce.number().default(2000),

  // Optional services
  REDIS_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  CRYPTO_OKX_API_KEY: z.string().optional(),

  // Supabase fallback
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

/**
 * Production-only constraints
 */
const productionSchema = baseSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV === "production") {
    // Enforce strict CORS
    if (!env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ALLOWED_ORIGINS must be set in production",
      });
    }

    // Prevent test mode in live payments
    if (env.PAYPAL_MODE === "live" && env.TEST_MODE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "TEST_MODE cannot be true in PAYPAL live mode",
      });
    }

    // Email required if SMTP is partially configured
    if (env.SMTP_HOST && (!env.SMTP_USER || !env.SMTP_PASS)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Incomplete SMTP configuration",
      });
    }
  }
});

/**
 * Parse + validate
 */
function validateEnv() {
  const parsed = productionSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.format());
    throw new Error("Environment validation failed");
  }

  return parsed.data;
}

/**
 * Export typed env
 */
export const env = validateEnv();

/**
 * Type export (for autocomplete everywhere)
 */
export type Env = typeof env;
