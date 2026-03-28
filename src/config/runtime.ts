export function getEnv(key: string): string | undefined {
  // Netlify Functions
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }

  // Edge Functions (fallback)
  if (typeof globalThis !== "undefined") {
    return (globalThis as any)[key];
  }

  return undefined;
}
