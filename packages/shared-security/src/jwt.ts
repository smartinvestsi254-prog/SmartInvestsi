import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request } from "express";

/**
 * JWT access/refresh token helpers.
 * Access tokens are short-lived; refresh tokens are long-lived and rotated.
 */

export interface JwtConfig {
  jwtSecret: string; // access token secret
  refreshSecret: string; // refresh token secret
  accessTtl?: string; // e.g. "15m"
  refreshTtl?: string; // e.g. "30d"
}

export interface AccessPayload {
  id: string;
  email: string;
  role: string;
  plan?: string;
}

export interface RefreshPayload {
  id: string;
  jti: string;
}

export function signAccessToken(payload: AccessPayload, config: JwtConfig): string {
  return jwt.sign(
    { id: payload.id, email: payload.email, role: payload.role, plan: payload.plan },
    config.jwtSecret,
    { expiresIn: config.accessTtl ?? "15m" }
  );
}

export function signRefreshToken(userId: string, config: JwtConfig): string {
  return jwt.sign({ id: userId, jti: crypto.randomUUID() }, config.refreshSecret, {
    expiresIn: config.refreshTtl ?? "30d",
  });
}

export function verifyAccessToken(token: string, config: JwtConfig): AccessPayload {
  return jwt.verify(token, config.jwtSecret) as AccessPayload;
}

export function verifyRefreshToken(token: string, config: JwtConfig): RefreshPayload {
  return jwt.verify(token, config.refreshSecret) as RefreshPayload;
}

/** Hash a refresh token for storage (never store raw refresh tokens). */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Extract a Bearer token from the Authorization header or cookie. */
export function extractToken(req: Request, cookieName = "access_token"): string | null {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  const cookie = req.cookies?.[cookieName];
  if (cookie) return cookie;
  return null;
}

/** Express middleware that populates req.user from a valid access token. */
export function authRequired(config: JwtConfig) {
  return (req: Request, res: any, next: () => void) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    try {
      const payload = verifyAccessToken(token, config);
      req.user = { id: payload.id, email: payload.email, role: payload.role, plan: payload.plan };
      next();
    } catch {
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
  };
}
