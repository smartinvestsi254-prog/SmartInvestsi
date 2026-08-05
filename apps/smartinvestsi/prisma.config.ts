import { defineConfig } from "@prisma/config";

/**
 * SmartInvestsi — Fintech Investment Platform
 * Prisma configuration for the SmartInvestsi app.
 * Schema: ../../prisma/schemas/smartinvestsi.prisma
 */
const databaseUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? databaseUrl;

export default defineConfig({
  datasource: {
    url: databaseUrl,
    directUrl,
  },
  schema: "../../prisma/schemas/smartinvestsi.prisma",
  log: ["warn", "error"],
  migrate: {
    datasource: {
      url: databaseUrl,
    },
  },
});
