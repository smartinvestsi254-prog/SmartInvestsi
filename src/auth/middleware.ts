import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to allow custom auth properties
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  isAdmin?: boolean;
  cookies: { [key: string]: string };
}

interface TokenPayload {
  userId: string;
  email: string;
  admin?: boolean;
}

const PROTECTED_ROUTES = ['/admin', '/api/admin', '/api/diplomacy'];

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const host = req.headers.host || 'localhost';
  const { pathname } = new URL(req.url, `http://${host}`);

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    const sessionToken = req.cookies?.si_token;
    const authHeader = req.headers.authorization;

    if (!sessionToken && !authHeader) {
      return res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
    }

    const token =
      sessionToken ||
      (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: 'Invalid authentication token' });
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res
          .status(500)
          .json({ success: false, error: 'Server configuration error' });
      }

      const payload = jwt.verify(token, secret) as TokenPayload;
      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.isAdmin = payload.admin || false;
    } catch {
      return res
        .status(401)
        .json({ success: false, error: 'Invalid or expired token' });
    }
  }

  return next();
}

export function protectedRouteMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const isProtected = PROTECTED_ROUTES.some((route) =>
    req.path.startsWith(route)
  );

  if (!isProtected) return next();
  if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });

  return next();
}
