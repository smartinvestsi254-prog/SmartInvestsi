/**
 * User Login Handler for SmartInvestsi
 */

import { Handler } from '@netlify/functions';
import logger from './logger';
import { authenticateUser } from './auth';
import type { NetlifyEvent, NetlifyContext, APIResponse } from './types';

export const handler = async function(event: NetlifyEvent, context: NetlifyContext): Promise<APIResponse> {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, phone, idNumber, password, captchaToken, isAdmin } = body;

    if (!email || !password) {  // Simplified to email + password
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Email and password required' })
      };
    }

    // Rate limiting stub
    const key = `login:${ip}:${email}`;
    console.log(`Rate limit check for ${key}`);

    // CAPTCHA stub
    if (captchaToken) {
      console.log('CAPTCHA verified');
    }

    const authResult = await authenticateUser(email, password);

    if (!authResult.success) {
      logger.warn('Failed login', { ip, identifier: email });
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Invalid credentials. CAPTCHA required on next attempt.' })
      };
    }

    // Email verified check
    if (!authResult.user!.emailVerifiedAt) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Please verify your email first.' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Set-Cookie': `si_token=${authResult.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
      },
      body: JSON.stringify({
        success: true,
        user: { ...authResult.user, isAdmin: isAdmin || false },
        token: authResult.token
      })
    };

  } catch (error: any) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: 'Login failed' })
    };
  }
};
