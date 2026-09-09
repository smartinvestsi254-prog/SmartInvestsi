/**
 * MongoDB Client Configuration
 * Provides fallback database support
 */

// Placeholder for MongoDB connections
// Currently using Prisma + PostgreSQL/Supabase as primary

export const getMongoDbClient = async () => {
  // Return a mock/placeholder
  return {
    connected: false,
    db: null,
  };
};

export default getMongoDbClient;
