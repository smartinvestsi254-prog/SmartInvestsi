/**
 * Rate Limiting Edge Function for SmartInvest
 * Limits API requests to prevent abuse (100/min per IP)
 * Netlify Edge deployment recommended
 */

export default async (request: Request, context: EdgeContext) => {
  const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  
  // Rate limit storage (use KV/Redis in production)
  const RATE_LIMIT_KEY = `rate_limit:${clientIP}`;
  const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  const RATE_LIMIT_MAX = 100; // 100 requests per minute

  // Get current count
  const currentCount = context.store.get(RATE_LIMIT_KEY) || 0;
  
  if (currentCount >= RATE_LIMIT_MAX) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Rate limit exceeded. Please try again later.' 
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60'
      }
    });
  }

  // Increment count
  context.store.set(RATE_LIMIT_KEY, currentCount + 1, { ttl: RATE_LIMIT_WINDOW });

  // Forward to origin
  return fetch(request);
};

export const config = {
  path: '/api/*'
};

