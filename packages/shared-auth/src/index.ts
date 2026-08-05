// @smartinvestsi/shared-auth
// Shared authentication utilities

import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  admin?: boolean;
}

export function verifyToken(token: string, secret: string): JWTPayload | null {
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch {
    return null;
  }
}

export function generateToken(payload: JWTPayload, secret: string, expiresIn: string = '7d'): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 254 && emailRegex.test(email);
}

export function sanitizeString(str: string, maxLength = 1000): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>\"'`]/g, '').substring(0, maxLength);
}