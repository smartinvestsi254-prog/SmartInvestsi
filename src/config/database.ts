import { env } from "./env.server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function resolveDatabaseUrl(): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    // Construct Postgres URL from Supabase (if needed)
    return `${env.SUPABASE_URL}?apikey=${env.SUPABASE_SERVICE_ROLE_KEY}`;
  }

  throw new Error("❌ No valid database configuration found");
}

export const DATABASE_URL = resolveDatabaseUrl();

export async function checkDatabase() {
  try {
    // lightweight DB ping using Prisma
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    console.error('DB health check failed', e);
    return false;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // ignore
    }
  }
}
