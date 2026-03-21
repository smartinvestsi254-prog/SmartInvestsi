import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  log: ['query', 'warn', 'error'],  // v7: enhanced logging
  migrate: {
    datasource: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/dev',
    },
  },
});
