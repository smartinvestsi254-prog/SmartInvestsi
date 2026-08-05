import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import {
  registerUser,
  authenticateUser,
  createSession,
  rotateRefreshToken,
  revokeAllSessions,
  revokeSession,
  enable2fa,
  verify2fa,
  authRequired,
  getUserPlan,
} from "../services/auth.service";
import { sendEmailConfirmation, sendPasswordResetEmail } from "../services/email.service";
import crypto from "crypto";
import { prisma } from "../lib/prisma";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  adminSecret: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  twoFactorCode: z.string().optional(),
});

const tokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /api/auth/signup
router.post("/signup", createBodyValidator(signupSchema), async (req, res) => {
  try {
    const user = await registerUser(req.body);
    const plan = await getUserPlan(user.id);
    const tokens = await createSession(
      { id: user.id, email: user.email, role: user.role as string, plan },
      req
    );

    // Send confirmation email (non-blocking)
    try {
      const confirmToken = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: { confirmToken, confirmExpires: new Date(Date.now() + 24 * 3600 * 1000) },
      });
      await sendEmailConfirmation(user.email, confirmToken);
    } catch (e) {
      console.warn("Email confirmation setup failed", e);
    }

    res.cookie("si_access", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.status(201).json({ success: true, user: { id: user.id, email: user.email, role: user.role }, ...tokens });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/login
router.post("/login", createBodyValidator(loginSchema), async (req, res) => {
  try {
    const user = await authenticateUser(req.body.email, req.body.password);

    // If 2FA enabled, require code
    if (user.twoFactorEnabled) {
      if (!req.body.twoFactorCode) {
        return res.status(400).json({ success: false, error: "2FA code required", requires2fa: true });
      }
      const ok = await verify2fa(user.id, req.body.twoFactorCode);
      if (!ok) {
        return res.status(401).json({ success: false, error: "Invalid 2FA code" });
      }
    }

    const plan = await getUserPlan(user.id);
    const tokens = await createSession(
      { id: user.id, email: user.email, role: user.role as string, plan },
      req
    );

    res.cookie("si_access", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.json({ success: true, user: { id: user.id, email: user.email, role: user.role }, ...tokens });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/refresh
router.post("/refresh", createBodyValidator(tokenSchema), async (req, res) => {
  try {
    const tokens = await rotateRefreshToken(req.body.refreshToken, req);
    res.json({ success: true, ...tokens });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/logout
router.post("/logout", authRequired, async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (refreshToken) {
      await revokeSession(refreshToken);
    } else {
      await revokeAllSessions((req as any).user.id);
    }
    res.clearCookie("si_access");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/logout-all
router.post("/logout-all", authRequired, async (req, res) => {
  try {
    await revokeAllSessions((req as any).user.id);
    res.clearCookie("si_access");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/2fa/enable
router.post("/2fa/enable", authRequired, async (req, res) => {
  try {
    const result = await enable2fa((req as any).user.id);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/2fa/verify
router.post("/2fa/verify", authRequired, async (req, res) => {
  try {
    const { code } = req.body ?? {};
    const ok = await verify2fa((req as any).user.id, code);
    res.json({ success: ok });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email) return res.status(400).json({ success: false, error: "Email required" });
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetExpires: new Date(Date.now() + 24 * 3600 * 1000) },
      });
      await sendPasswordResetEmail(user.email, resetToken);
    }
    // Always return success to avoid user enumeration
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: "Invalid token or password" });
    }
    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetExpires || user.resetExpires < new Date()) {
      return res.status(400).json({ success: false, error: "Invalid or expired token" });
    }
    const { hashPassword } = await import("../../../packages/shared-security/src/index");
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword), resetToken: null, resetExpires: null },
    });
    await revokeAllSessions(user.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
