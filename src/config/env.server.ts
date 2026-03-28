import { env } from "./env";

/**
 * Ensure this file is never imported in frontend bundles
 */
if (typeof window !== "undefined") {
  throw new Error("❌ env.server.ts should not be used in the browser");
}

export { env };
