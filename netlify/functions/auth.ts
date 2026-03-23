import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import prisma from './lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-prod';
const JWT_EXPIRY = '15m'; // Short expiry, use refresh tokens later
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-change-in-prod';

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

  try {
    if (httpMethod === 'POST') {
      const data: LoginData = JSON.parse(body || '{}');
      
      // Find user + check ban
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user || user.isBanned || bcryptjs.compare(data.password, user.passwordHash || '')) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid credentials or banned' }),
        };
      }

      // JWT payload
      const payload: UserPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tier: user.subscriptionTier || 'FREE',
      };


      const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

      return {
        statusCode
