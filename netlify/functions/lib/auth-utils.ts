/**
 * Shared authentication utilities for Netlify functions.
 * Extracts and verifies the caller identity from a JWT supplied either
 * via the Authorization: Bearer header or the auth cookie.
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

interface TokenPayload {
  userId?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

function extractToken(event: any): string | null {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)(?:token|authToken|access_token)=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export function verifyEventToken(event: any): TokenPayload | null {
  if (!JWT_SECRET) return null;
  const token = extractToken(event);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getUserEmailFromEvent(event: any): Promise<string | null> {
  const payload = verifyEventToken(event);
  return payload?.email ?? null;
}

export async function isAdminFromEvent(event: any): Promise<boolean> {
  const payload = verifyEventToken(event);
  return payload?.role === 'ADMIN' || payload?.role === 'admin';
}
