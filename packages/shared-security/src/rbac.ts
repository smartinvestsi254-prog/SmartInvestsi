import type { NextFunction, Request, Response } from "express";

/**
 * RBAC: role-based access control middleware + permission helpers.
 */

export type Role = string;

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  [key: string]: unknown;
}

/** Verifies a user is authenticated (populated by authRequired middleware). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  next();
}

/** Restricts a route to one or more roles. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    if (!roles.includes(String(req.user.role))) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }
    next();
  };
}

/** Restricts a route to ADMIN role. */
export function adminRequired(req: Request, res: Response, next: NextFunction) {
  return requireRole("ADMIN")(req, res, next);
}

/** Permission map: role -> Set of permission strings. Extend per app. */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ["*"],
  USER: ["portfolio:read", "portfolio:write", "trade:execute", "wallet:read", "wallet:write"],
  SUPPORT: ["tickets:read", "tickets:write", "users:read"],
  ANALYST: ["market:read", "analytics:read"],
  COMPLIANCE: ["kyc:read", "kyc:write", "audit:read"],
  VIEWER: ["read"],
  MINISTER: ["workflow:read", "workflow:approve", "incident:read", "licensing:read"],
  SECRETARY: ["*"],
  REVIEWER: ["workflow:read", "workflow:approve"],
  INCIDENT_COMMANDER: ["incident:write", "incident:read"],
};

/** Permission middleware factory. */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    const role = String(req.user.role);
    const perms = ROLE_PERMISSIONS[role] ?? [];
    if (perms.includes("*") || perms.includes(permission)) {
      return next();
    }
    return res.status(403).json({ success: false, error: "Insufficient permissions" });
  };
}

/** Returns true if the authenticated user has the given role. */
export function hasRole(user: AuthUser | undefined, role: string): boolean {
  return !!user && String(user.role) === role;
}

/** Returns true if the authenticated user has a permission. */
export function hasPermission(user: AuthUser | undefined, permission: string): boolean {
  if (!user) return false;
  const perms = ROLE_PERMISSIONS[String(user.role)] ?? [];
  return perms.includes("*") || perms.includes(permission);
}
