import type { Handler } from '@netlify/functions';
import logger from './logger';
import { getCorsHeaders } from './lib/cors';
import { getUserEmailFromEvent } from './lib/auth-utils';

export const handler: Handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = { 'Content-Type': 'application/json', ...getCorsHeaders(origin) };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    const userEmail = await getUserEmailFromEvent(event);
    if (!userEmail) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Authentication required' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const plan = String(body.plan || 'standard').trim();

    logger.info('Ad subscription request', { userEmail, plan });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        subscription: { userEmail, plan, status: 'active', subscribedAt: new Date().toISOString() },
      }),
    };
  } catch (error) {
    logger.error('Ad subscribe error', { error: (error as Error).message });
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Internal server error' }),
    };
  }
};
