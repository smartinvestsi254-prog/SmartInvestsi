/**
 * Database Client Factory
 * Routes to appropriate database based on configuration
 */

import prisma from './supabase.js';

type DatabaseConfig = {
  db?: {
    url?: string;
  };
};

const config: DatabaseConfig = {
  db: {
    url: process.env.DATABASE_URL,
  },
};

// Export primary database client
export const getPrismaClient = () => prisma;

export default {
  prisma,
  config,
};
