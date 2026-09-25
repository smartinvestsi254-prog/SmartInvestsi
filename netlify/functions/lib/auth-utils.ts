/**
 * Shared authentication utilities for Netlify functions.
 * Extracts and verifies the caller identity from a JWT supplied either
 * via the Authorization: Bearer header or the auth cookie.
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export interface TokenPayload {
  userId?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

// Minimal type structure matching Netlify Function Events
export interface NetlifyEvent {
  headers?: Record<string, string | undefined>;
  [key: string]: unknown;
}

/**
 * Extracts JWT token from Authorization header or HTTP-only cookies
 */
function extractToken(event: NetlifyEvent): string | null {
  if (!event || !event.headers) return null;

  // 1. Extract from Authorization Bearer Header
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Extract from Cookie Header (matches auth_token, token, authToken, or access_token)
  const cookieHeader = event.headers.cookie || event.headers.Cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)(?:auth_token|token|authToken|access_token)=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Verifies the incoming event token and returns the decoded payload
 */
export function verifyEventToken(event: NetlifyEvent): TokenPayload | null {
  if (!JWT_SECRET) {
    console.warn('[auth-utils] Missing process.env.JWT_SECRET environment variable.');
    return null;
  }

  const token = extractToken(event);
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Helper: Extract caller email address
 */
export async function getUserEmailFromEvent(event: NetlifyEvent): Promise<string | null> {
  const payload = verifyEventToken(event);
  return payload?.email ?? null;
}

/**
 * Helper: Verify if caller has Administrator privileges
 */
export async function isAdminFromEvent(event: NetlifyEvent): Promise<boolean> {
  const payload = verifyEventToken(event);
  if (!payload) return false;

  return (
    payload.isAdmin === true ||
    payload.role === 'ADMIN' ||
    payload.role === 'admin'
  );
}
