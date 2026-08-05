import { defineConfig } from "@prisma/config";

/**
 * Root Prisma configuration.
 *
 * NOTE: The repository has been split into two production-grade products:
 *   - apps/smartinvestsi (fintech) -> prisma/schemas/smartinvestsi.prisma
 *   - apps/smartgovern (governance) -> prisma/schemas/smartgovern.prisma
 *
 * Each app owns its own prisma.config.ts (see apps/*/prisma.config.ts).
 * This root config targets the primary (SmartInvestsi) schema for
 * root-level tools and legacy backward compatibility.
 */
const databaseUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? databaseUrl;

export default defineConfig({
  datasource: {
    url: databaseUrl,
    directUrl,
  },
  schema: "./prisma/schemas/smartinvestsi.prisma",
  log: ["query", "warn", "error"],
  migrate: {
    datasource: {
      url: databaseUrl,
    },
  },
});


