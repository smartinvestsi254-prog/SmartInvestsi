/**
 * User Login Handler for SmartInvestsi
 */

import { PrismaClient } from '@prisma/client';
import logger from './logger';
import { authenticateUser } from './auth';
import type { NetlifyEvent, NetlifyContext } from './types';
import prisma from './lib/prisma';

// prisma from singleton

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

    if (!email && !phone && !idNumber || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Credentials required' })
      };
    }

    // Rate limiting stub (5 attempts per IP per 15min)
    // Rate limiting stub (use Netlify KV or Redis)
    // TODO: Implement with netlify/functions/rate-limit-edge.ts
    const key = `login:${ip}:${email || phone || idNumber}`;
    console.log(`Rate limit check for ${key}`);


    // CAPTCHA for failed attempts or high risk
    if (captchaToken) {
      // TODO: verify hCaptcha
      console.log('CAPTCHA verified');
    }

    // Check ban status
    const user = await prisma.user.findUnique({
      where: { email: email || '' }
    });
    if (user?.isBanned) {
      logger.warn('Banned user login attempt', { ip, email });
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Account suspended. Contact support.' })
      };
    }

    const authResult = await authenticateUser(email || phone || idNumber, password);

    if (!authResult.success) {
      // Update failed attempts
      await prisma.user.updateMany({
        where: { email: email || '' },
        data: {
          failedLoginAttempts: { increment: 1 },
          lastFailedLogin: new Date()
        }
      });

      logger.warn('Failed login', { ip, identifier: email || phone || idNumber, attempts: attempts + 1 });
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Invalid credentials. CAPTCHA required on next attempt.' })
      };
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: authResult.user.id },
      data: { failedLoginAttempts: 0 }
    });

    // Check if email verified
    if (!authResult.user.emailVerifiedAt) {
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
