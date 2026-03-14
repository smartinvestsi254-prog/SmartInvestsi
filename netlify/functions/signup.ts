/**
 * User Signup Handler for SmartInvestsi - TypeScript Refactored
 * No more 'any' types!
 */

import logger from './logger';
import { registerUser } from './auth';
import type {
  NetlifyEvent,
  NetlifyContext,
  APIResponse,
  SignupBody,
  SignupResult,
  HTTPStatus
} from './types';

export const handler = async function(event: NetlifyEvent, context: NetlifyContext): Promise<APIResponse<SignupResult>> {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405 as HTTPStatus,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: false, error: 'Method not allowed' } as APIResponse)
    };
  }

  try {
    let body: SignupBody;
    try {
      body = JSON.parse(event.body || '{}') as SignupBody;
    } catch (parseError: unknown) {
      return {
        statusCode: 400 as HTTPStatus,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' } as APIResponse)
      };
    }

    const { email, name, password } = body;

    if (!email || !name || !password) {
      return {
        statusCode: 400 as HTTPStatus,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ success: false, error: 'Email, name, and password are required' } as APIResponse)
      };
    }

    // Basic validation
    if (password.length < 8) {
      return {
        statusCode: 400 as HTTPStatus,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ success: false, error: 'Password must be at least 8 characters long' } as APIResponse)
      };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400 as HTTPStatus,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ success: false, error: 'Invalid email format' } as APIResponse)
      };
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return {
        statusCode: 400 as HTTPStatus,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        } as APIResponse)
      };
    }

    const authResult = await registerUser(email, name, password) as SignupResult & { success: boolean; error?: string };

    if (!authResult.success) {
      return {
        statusCode: 409 as HTTPStatus,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ success: false, error: authResult.error } as APIResponse)
      };
    }

    return {
      statusCode: 201 as HTTPStatus,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          user: authResult.user,
          token: authResult.token
        },
        message: 'Account created successfully'
      } as APIResponse<SignupResult>)
    };

  } catch (error: unknown) {
    logger.error('Signup error', { error: (error as Error).message, stack: (error as Error).stack });
    return {
      statusCode: 500 as HTTPStatus,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: false, error: 'Signup failed' } as APIResponse)
    };
  }
};
