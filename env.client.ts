// src/config/env.client.ts
import { z } from "zod";

/**
 * Only expose PUBLIC_* vars
 */
const clientSchema = z.object({
  PUBLIC_HCAPTCHA_SITEKEY: z.string(),
  PUBLIC_PAYPAL_CLIENT_ID: z.string().optional(),
});

const parsed = clientSchema.safeParse({
  PUBLIC_HCAPTCHA_SITEKEY: process.env.PUBLIC_HCAPTCHA_SITEKEY,
  PUBLIC_PAYPAL_CLIENT_ID: process.env.PUBLIC_PAYPAL_CLIENT_ID,
});

if (!parsed.success) {
  console.error("❌ Invalid client env");
  throw new Error("Client env validation failed");
}

export const clientEnv = parsed.data;
