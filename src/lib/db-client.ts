// src/lib/db-client.ts - Prisma v7 Singleton + Failover
// Compatible: Netlify Functions + Render Backend + Edge Runtime

import { PrismaClient } from '@prisma/client';

declare global {
  var __db__: PrismaClient | undefined;
}

interface PrismaClientSingleton {
  getClient(): PrismaClient;
  $disconnect(): Promise<void>;
}

const globalForPrisma = globalThis as unknown as {
  __db__: PrismaClientSingleton;
};

export const dbClient = globalForPrisma.__db__ ?? {
  getClient() {
    const client = new PrismaClient({
      log: ['warn', 'error'],
      // v7: Optimized for serverless
      datasources: {
        db: {
          url: process.env.DATABASE_URL!,
        },
      },
    });
    
    if (process.env.NODE_ENV === 'production') client.$connect();
    
    // Critical: Edge runtime - no .disconnect()
    if (process.env.VERCEL || process.env.NETLIFY) {
      return client;
    }
    
    globalForPrisma.__db__ = {
      getClient: () => client,
      $disconnect: async () => {
        await client.$disconnect();
      },
    };
    
    return client;
  },
  $disconnect: async () => {
    // Cleanup if needed
  },
};

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
