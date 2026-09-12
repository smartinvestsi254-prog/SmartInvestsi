import prisma from './supabase.js';

export interface DatabaseConfig {
  db: {
    url?: string;
  };
}

/**
 * Returns the current runtime database configuration.
 * Evaluated dynamically to prevent stale process.env reads.
 */
export const getDatabaseConfig = (): DatabaseConfig => ({
  db: {
    url: process.env.DATABASE_URL,
  },
});

/**
 * Returns the primary Prisma database client instance.
 */
export const getPrismaClient = () => prisma;

export default {
  prisma,
  getDatabaseConfig,
  getPrismaClient,
};
