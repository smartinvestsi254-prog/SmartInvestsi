import rateLimit from 'express-rate-limit';

// Strict limiter for authentication endpoints (login, signup)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  // Skip rate limiting in development or test environments if needed
  skip: (_req) => process.env.NODE_ENV === 'test',
});

// General limiter for lighter endpoints like checking session (/me) or logout
export const generalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Up to 100 requests every 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
  },
});
