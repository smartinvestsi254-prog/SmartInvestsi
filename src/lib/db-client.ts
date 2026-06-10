// src/lib/db-client.ts - Prisma v7 Singleton + Failover
// Compatible: Netlify Functions + Render Backend + Edge Runtime

import { PrismaClient } from '@prisma/client';

declare global {
  var __db__: PrismaClient | undefined;
}

type DbMode = 'primary' | 'fallback';

interface DbStatus {
  mode: DbMode;
  primaryConfigured: boolean;
  fallbackConfigured: boolean;
  activeUrlConfigured: boolean;
  healthy: boolean;
  error?: string;
}

interface PrismaClientSingleton {
  getClient(): PrismaClient;
  $disconnect(): Promise<void>;
  getStatus(): Promise<DbStatus>;
  setMode(mode: DbMode): Promise<void>;
}

const globalForPrisma = globalThis as unknown as {
  __db__: PrismaClientSingleton;
};

function resolveUrl(mode: DbMode): string | undefined {
  if (mode === 'fallback') {
    return process.env.NETLIFY_DB_URL || process.env.DATABASE_URL || undefined;
  }
  return process.env.DATABASE_URL || undefined;
}

function createSingleton(): PrismaClientSingleton {
  let mode: DbMode = 'primary';
  let client: PrismaClient | null = null;

  function build(): PrismaClient {
    const url = resolveUrl(mode);
    const c = new PrismaClient({
      log: ['warn', 'error'],
      datasources: { db: { url: url as string } },
    });
    if (process.env.NODE_ENV === 'production') c.$connect();
    return c;
  }

  return {
    getClient() {
      if (!client) client = build();
      return client;
    },
    async $disconnect() {
      if (client) await client.$disconnect();
      client = null;
    },
    async getStatus(): Promise<DbStatus> {
      const base: DbStatus = {
        mode,
        primaryConfigured: Boolean(process.env.DATABASE_URL),
        fallbackConfigured: Boolean(process.env.NETLIFY_DB_URL),
        activeUrlConfigured: Boolean(resolveUrl(mode)),
        healthy: false,
      };
      try {
        await this.getClient().$queryRaw`SELECT 1`;
        return { ...base, healthy: true };
      } catch (error) {
        return { ...base, healthy: false, error: (error as Error).message };
      }
    },
    async setMode(next: DbMode): Promise<void> {
      if (next === mode) return;
      mode = next;
      if (client) {
        try { await client.$disconnect(); } catch { /* ignore */ }
      }
      client = build();
    },
  };
}

export const dbClient: PrismaClientSingleton = globalForPrisma.__db__ ?? createSingleton();

if (!process.env.VERCEL && !process.env.NETLIFY) {
  globalForPrisma.__db__ = dbClient;
}

// Export for direct use + singleton
export const prisma = dbClient.getClient();
export default dbClient;

// Health check
export async function dbHealth(): Promise<{ status: 'healthy' | 'error'; error?: string }> {
  try {
    await dbClient.getClient().$queryRaw`SELECT 1`;
    return { status: 'healthy' };
  } catch (error: any) {
    return { 
      status: 'error' as const, 
      error: error.message 
    };
  }
}
