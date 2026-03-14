/**
 * User Signup Handler for SmartInvestsi
 */

import logger from './logger';
import { registerUser } from './auth';

export const handler = async function(event: any, context: any): Promise<any> {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, name, password } = JSON.parse(event.body || '{}');

    if (!email || !name || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email, name, and password are required' })
      };
    }

    // Basic validation
    if (password.length < 8) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Password must be at least 8 characters long' })
      };
    }

    const authResult = registerUser(email, name, password);

    if (!authResult.success) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        user: authResult.user,
        token: authResult.token,
        message: 'Account created successfully'
      })
    };

  } catch (error: any) {
    logger.error('Signup error', { error: error.message, stack: error.stack });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Signup failed' })
    };
  }
};