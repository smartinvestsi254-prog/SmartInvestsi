/**
 * Supabase Client Configuration
 * Initializes connection to Supabase PostgreSQL database
 */

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'info', 'warn'],
    });
  }
  prisma = global.prisma;
}

export default prisma;
