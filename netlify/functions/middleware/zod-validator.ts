import { z, ZodSchema } from 'zod';
import { HandlerEvent } from '@netlify/functions';

export function validateInput<T>(schema: ZodSchema<T>): (event: HandlerEvent) => T {
  return (event) => {
    try {
      const data = JSON.parse(event.body || '{}');
      return schema.parse(data);
    } catch (error) {
      throw new Error(`Validation failed: ${(error as z.ZodError).message}`);
    }
  };
}

// Common schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(['KES', 'USD', 'EUR']),
  pin: z.string().length(4).or(z.string().length(6)).regex(/^\d+$/),
});

export const tradeSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  amount: z.number().positive().max(1000), // Free tier limit
});

