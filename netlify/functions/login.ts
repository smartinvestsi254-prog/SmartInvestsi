/**
 * User Login Handler for SmartInvestsi
 */

import logger from './logger';
import { authenticateUser } from './auth';

export const handler = async function(event: any, context: any): Promise<any> {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    const authResult = authenticateUser(email, password);

    if (!authResult.success) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        user: authResult.user,
        token: authResult.token
      })
    };

  } catch (error: any) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Login failed' })
    };
  }
};