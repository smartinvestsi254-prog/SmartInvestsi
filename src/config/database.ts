import { env } from "./env.server";

function resolveDatabaseUrl(): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    // Construct Postgres URL from Supabase (if needed)
    return `${env.SUPABASE_URL}?apikey=${env.SUPABASE_SERVICE_ROLE_KEY}`;
  }

  throw new Error("❌ No valid database configuration found");
}

export const DATABASE_URL = resolveDatabaseUrl();

export async function checkDatabase() {
  try {
    // Placeholder - replace with actual Prisma client check
    const response = await fetch(`${DATABASE_URL}/health`, { method: 'HEAD', timeout: 5000 });
    return response.ok;
  } catch {
    return false;
  }
}
