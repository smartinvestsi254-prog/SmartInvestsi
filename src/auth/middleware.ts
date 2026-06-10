/**
 * Express authentication middleware for SmartInvestsi
 * Verifies JWT tokens from cookies or Authorization header
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const PROTECTED_ROUTES = ['/admin', '/api/admin', '/api/diplomacy'];

interface TokenPayload {
  userId: string;
  email: string;
  admin?: boolean;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const sessionToken = req.cookies?.si_token;
    const authHeader = req.headers.authorization;

    if (!sessionToken && !authHeader) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = sessionToken || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Invalid authentication token' });
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ success: false, error: 'Server configuration error' });
      }
      const payload = jwt.verify(token, secret) as TokenPayload;
      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.isAdmin = payload.admin || false;
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  }

  next();
}
