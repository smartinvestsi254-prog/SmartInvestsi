/**
 * User Login Handler for SmartInvestsi
 * Secure login with rate limiting and CAPTCHA verification
 */

import { Handler } from '@netlify/functions';
import logger from './logger';
import { authenticateUser } from './auth';

// In-memory rate limit store (per-instance; use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // max login attempts per window

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    logger.warn('HCAPTCHA_SECRET_KEY not set — skipping CAPTCHA verification');
    return true;
  }

  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `response=${encodeURIComponent(token)}&secret=${encodeURIComponent(secret)}`,
    });
    const data = await response.json();
    return data.success === true;
  } catch (error: any) {
    logger.error('CAPTCHA verification failed', { error: error.message });
    return false;
  }
}

function getCorsOrigin(event: { headers: Record<string, string | undefined> }): string {
  const origin = event.headers['origin'] || '';
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
  return allowed.includes(origin) ? origin : '';
}

export const handler: Handler = async function(event) {
  const corsOrigin = getCorsOrigin(event);
  const secureHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Credentials': 'true',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...secureHeaders,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: secureHeaders,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password, captchaToken } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: secureHeaders,
        body: JSON.stringify({ success: false, error: 'Email and password required' }),
      };
    }

    // Rate limiting
    const rateLimitKey = `login:${ip}:${email}`;
    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      logger.warn('Rate limit exceeded', { ip, email });
      return {
        statusCode: 429,
        headers: { ...secureHeaders, 'Retry-After': '900' },
        body: JSON.stringify({ success: false, error: 'Too many login attempts. Please try again in 15 minutes.' }),
      };
    }

    // CAPTCHA verification (required if token provided)
    if (captchaToken) {
      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        return {
          statusCode: 400,
          headers: secureHeaders,
          body: JSON.stringify({ success: false, error: 'CAPTCHA verification failed. Please try again.' }),
        };
      }
    }

    const authResult = await authenticateUser(email, password);

    if (!authResult.success) {
      logger.warn('Failed login', { ip, identifier: email });
      return {
        statusCode: 401,
        headers: secureHeaders,
        body: JSON.stringify({ success: false, error: 'Invalid credentials.' }),
      };
    }

    const emailVerified = authResult.user!.emailVerified ?? false;

    return {
      statusCode: 200,
      headers: {
        ...secureHeaders,
        'Set-Cookie': `si_token=${authResult.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
      },
      body: JSON.stringify({
        success: true,
        user: authResult.user,
        emailVerified,
      }),
    };
  } catch (error: any) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    return {
      statusCode: 500,
      headers: secureHeaders,
      body: JSON.stringify({ success: false, error: 'Login failed' }),
    };
  }
};
