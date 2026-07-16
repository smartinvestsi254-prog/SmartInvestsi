/**
 * Shared CORS utility for Netlify functions
 * Validates origin against ALLOWED_ORIGINS environment variable
 */

export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  const validOrigin = origin && allowedOrigins.includes(origin) ? origin : '';

  return {
    'Access-Control-Allow-Origin': validOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

export function handleOptions(origin?: string) {
  return {
    statusCode: 200,
    headers: getCorsHeaders(origin),
    body: '',
  };
}
