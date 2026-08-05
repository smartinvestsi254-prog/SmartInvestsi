import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import prisma from './lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}
const JWT_EXPIRY = '15m';

interface LoginData {
  email: string;
  password: string;
}

interface UserPayload {
  userId: string;
  email: string;
  role: string;
  tier: string;
}

interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    subscriptionTier?: string;
  };
  token?: string;
  error?: string;
}

export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.isBanned || !user.passwordHash || !bcryptjs.compare(password, user.passwordHash)) {
      return { success: false, error: 'Invalid credentials or banned' };
    }

    const payload: UserPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.subscriptionTier || 'FREE',
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      },
      token: accessToken,
    };
  } catch (error) {
    console.error('authenticateUser error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

export async function registerUser(
  email: string,
  name: string,
  password: string,
  meta: any
): Promise<AuthResult> {
  try {
    const hashedPassword = await bcryptjs.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: 'VIEWER',
        // Add other meta fields as needed
        ...meta,
      },
    });

    // Generate token for new user
    const payload: UserPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: 'FREE',
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        subscriptionTier: 'FREE',
      },
      token: accessToken,
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'User already exists' };
    }
    console.error('registerUser error:', error);
    return { success: false, error: 'Registration failed' };
  }
}

export const handler: Handler = async (event) => {
  const { httpMethod, body } = event;

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    };
  }

  if (httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    const data: LoginData = JSON.parse(body || '{}');
    
    const result = await authenticateUser(data.email, data.password);

    if (!result.success) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: result.error }),
      };
    }

    const refreshToken = jwt.sign(result.user!, REFRESH_SECRET, { expiresIn: '7d' });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Set-Cookie': `si_refresh=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
      },
      body: JSON.stringify({
        success: true,
        accessToken: result.token,
        user: result.user,
      }),
    };
  } catch (error) {
    console.error('Auth handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Internal server error' }),
    };
  }
};

