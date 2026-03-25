import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
  schema: "./prisma/schema.prisma",
  log: ['query', 'warn', 'error'],
  migrate: {
    datasource: {
      url: env("DATABASE_URL"),
    },
  },
});

