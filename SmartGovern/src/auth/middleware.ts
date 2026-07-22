// SmartGovern - src/auth/middleware.ts  
import { Request, Response, NextFunction } from 'express';  

const PROTECTED_ROUTES = ['/admin', '/api/admin', '/api/diplomacy', '/api/incidents', '/api/workflows', '/api/licensing'];  

export function protectedRouteMiddleware(req: Request, res: Response, next: NextFunction) {  
  const isProtected = PROTECTED_ROUTES.some(route => req.path.startsWith(route));  
  if (!isProtected) return next();  
  if (!(req as any).userId) return res.status(401).json({ error: 'Unauthorized' });  
  next();  
}