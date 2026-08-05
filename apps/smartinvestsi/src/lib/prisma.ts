import { PrismaClient } from "@prisma/client";

/**
 * SmartInvestsi Prisma client singleton.
 * The generated client is emitted to node_modules/.prisma/smartinvestsi-client
 * via the schema generator output. We import the default @prisma/client
 * which is configured to use the SmartInvestsi schema.
 */
declare global {
  // eslint-disable-next-line no-var
  var __smartinvestsiPrisma__: PrismaClient | undefined;
}

const globalForPrisma = globalThis as unknown as { __smartinvestsiPrisma__?: PrismaClient };

export const prisma =
  globalForPrisma.__smartinvestsiPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__smartinvestsiPrisma__ = prisma;
}

export default prisma;
