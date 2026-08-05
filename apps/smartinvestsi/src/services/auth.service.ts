import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import {
  hashPassword,
  verifyPassword,
  TotpService,
  encryptToken,
  decryptToken,
  deviceFingerprint,
} from "../../../packages/shared-security/src/index";
import type { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  plan: "BASIC" | "PREMIUM" | "ENTERPRISE";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const totp = new TotpService();

/** Resolve the user's current plan from their active subscription. */
export async function getUserPlan(userId: string): Promise<"BASIC" | "PREMIUM" | "ENTERPRISE"> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return "BASIC";
  const name = sub.plan.name.toUpperCase();
  return name === "PREMIUM" || name === "ENTERPRISE" || name === "BASIC"
    ? (name as "BASIC" | "PREMIUM" | "ENTERPRISE")
    : "BASIC";
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function registerUser(input: {
  email: string;
  password: string;
  phone?: string;
  role?: string;
  adminSecret?: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    const err = new Error("Email already registered") as Error & { statusCode?: number };
    err.statusCode = 409;
    throw err;
  }

  let role = "USER";
  if (input.role === "ADMIN") {
    const isBootstrap = (await prisma.user.count()) === 0;
    const validSecret = env.ADMIN_REG_SECRET && input.adminSecret === env.ADMIN_REG_SECRET;
    if (!isBootstrap && !validSecret) {
      const err = new Error("Cannot create admin account") as Error & { statusCode?: number };
      err.statusCode = 403;
      throw err;
    }
    role = "ADMIN";
  }

  const passwordHash = hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: role as any,
      phone: input.phone,
      profile: { create: { email } },
    },
  });

  return user;
}

export async function authenticateUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    const err = new Error("Invalid credentials") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }
  if (!user.isActive) {
    const err = new Error("Account is disabled") as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }
  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    const err = new Error("Invalid credentials") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }
  return user;
}

function signAccessToken(user: { id: string; email: string; role: string; plan: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, plan: user.plan },
    env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

/** Create a new session (access + refresh) and store the refresh token in DB. */
export async function createSession(
  user: { id: string; email: string; role: string; plan: string },
  req: Request
): Promise<TokenPair> {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user.id);
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const encrypted = encryptToken(refreshToken, env.JWT_REFRESH_SECRET);

  const fp = deviceFingerprint(req);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId: user.id,
      refreshToken: refreshTokenHash,
      deviceId: fp,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]?.slice(0, 255),
      expiresAt,
    },
  });

  // Update last login metadata
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: req.ip,
      lastLoginUserAgent: req.headers["user-agent"]?.slice(0, 255),
    },
  });

  return { accessToken, refreshToken, expiresIn: 900 };
}

/** Rotate refresh token: revoke old, issue new. */
export async function rotateRefreshToken(refreshToken: string, req: Request): Promise<TokenPair> {
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const session = await prisma.authSession.findUnique({ where: { refreshToken: hash } });
  if (!session || session.isRevoked || session.expiresAt < new Date()) {
    const err = new Error("Invalid refresh token") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }

  // Verify JWT signature
  let payload: { userId: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    const err = new Error("Invalid refresh token") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) {
    const err = new Error("User not found") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }

  // Revoke old session
  await prisma.authSession.update({
    where: { id: session.id },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  const plan = await getUserPlan(user.id);
  const authUser = { id: user.id, email: user.email, role: user.role as string, plan };
  return createSession(authUser, req);
}

/** Revoke all sessions for a user (logout everywhere / session revocation). */
export async function revokeAllSessions(userId: string) {
  await prisma.authSession.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}

/** Revoke a single session by refresh token. */
export async function revokeSession(refreshToken: string) {
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await prisma.authSession.updateMany({
    where: { refreshToken: hash, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}

// ------------------------------------------------------------
// TOTP 2FA
// ------------------------------------------------------------

export async function enable2fa(userId: string) {
  const secret = totp.generateSecret();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: true },
  });
  return {
    secret,
    otpauthUrl: totp.generateUri(secret, user.email),
  };
}

export async function verify2fa(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) return false;
  const ok = totp.verify(code, user.twoFactorSecret);
  if (ok) {
    await prisma.user.update({
      where: { id: userId },
      data: { totpVerifiedAt: new Date() },
    });
  }
  return ok;
}

// ------------------------------------------------------------
// Auth middleware
// ------------------------------------------------------------

export function authRequired(req: Request, res: any, next: () => void) {
  const header = req.headers.authorization || "";
  let token: string | null = null;
  if (header.startsWith("Bearer ")) token = header.slice(7);
  if (!token && req.cookies?.si_access) token = req.cookies.si_access;
  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
      plan: string;
    };
    (req as any).user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      plan: payload.plan,
    };
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

export function adminRequired(req: Request, res: any, next: () => void) {
  const user = (req as any).user;
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }
  next();
}

export { deviceFingerprint }; // re-export for convenience
