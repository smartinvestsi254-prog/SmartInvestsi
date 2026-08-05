/**
 * MongoDB Configuration - SmartInvest
 * Optimized for Node.js / Vercel Serverless
 */

import { MongoClient, ServerApiVersion, Db } from 'mongodb';

// Cached instances (important for serverless)
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

// MongoDB URI (from env variable)
const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smartinvest";

// Database name
const DB_NAME = "smartinvestsi";

/**
 * Create MongoDB client
 */
function createClient(): MongoClient {
  return new MongoClient(URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    retryWrites: true,
    w: "majority",

    // Connection Pool Settings
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 45000,
  });
}

/**
 * Connect to MongoDB (with caching)
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = createClient();

  try {
    await client.connect();

    const db = client.db(DB_NAME);

    // Verify connection
    await db.command({ ping: 1 });

    // log via centralized logger
    const { info, error } = require('../utils/logger');
    info("✓ Connected to MongoDB");

    cachedClient = client;
    cachedDb = db;

    return { client, db };

  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError("✗ MongoDB connection failed:", error);
    throw error;
  }
}

/**
 * Get DB instance (must connect first)
 */
export function getDatabase(): Db {
  if (!cachedDb) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return cachedDb;
}

/**
 * Initialize Collections & Indexes
 */
export async function initializeCollections(): Promise<void> {
  const { db } = await connectToDatabase();

  try {
    // USERS
    await db.createCollection("users").catch(() => {});
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ createdAt: -1 });

    // PAYMENTS
    await db.createCollection("payments").catch(() => {});
    await db.collection("payments").createIndex({ userId: 1 });
    await db.collection("payments").createIndex({ transactionId: 1 }, { unique: true });
    await db.collection("payments").createIndex({ status: 1 });
    await db.collection("payments").createIndex({ createdAt: -1 });

    // ORDERS
    await db.createCollection("orders").catch(() => {});
    await db.collection("orders").createIndex({ userId: 1 });
    await db.collection("orders").createIndex({ orderId: 1 }, { unique: true });
    await db.collection("orders").createIndex({ status: 1 });

    // AUDIT LOGS
    await db.createCollection("auditLogs").catch(() => {});
    await db.collection("auditLogs").createIndex({ userId: 1 });
    await db.collection("auditLogs").createIndex({ action: 1 });
    await db.collection("auditLogs").createIndex({ createdAt: -1 });

    // PAYMENT METHODS
    await db.createCollection("paymentMethods").catch(() => {});
    await db.collection("paymentMethods").createIndex({ userId: 1 });
    await db.collection("paymentMethods").createIndex({ deleted: 1 });

    // WEBHOOKS
    await db.createCollection("webhooks").catch(() => {});
    await db.collection("webhooks").createIndex({ provider: 1 });
    await db.collection("webhooks").createIndex({ reference: 1 });
    await db.collection("webhooks").createIndex({ processed: 1 });

    const { info } = require('../utils/logger');
    info("✓ Collections initialized");

  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError("✗ Initialization failed:", error);
    throw error;
  }
}

/**
 * Disconnect (ONLY for scripts, NOT for serverless)
 */
export async function disconnectDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    const { info } = require('../utils/logger');
    info("✓ MongoDB disconnected");
  }
}

/**
 * Test connection (optional utility)
 */
export async function testConnection(): Promise<void> {
  const { db } = await connectToDatabase();
  await db.command({ ping: 1 });
  const { info } = require('../utils/logger');
  info("✓ MongoDB ping successful");
}