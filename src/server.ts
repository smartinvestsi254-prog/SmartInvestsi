// src/server.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import {
  submitForReview,
  recordReviewDecision,
  publishContent,
} from "./workflows/engine";
import { createIncident, updateIncidentStatus } from "./incidents/service";
import { checkEntitlementAndLog } from "./licensing/entitlements";

// Import new feature services
import { PortfolioService } from "./services/PortfolioService";
import { MarketDataService } from "./services/MarketDataService";
import { PriceAlertService } from "./services/PriceAlertService";
import { SocialTradingService } from "./services/SocialTradingService";
import { RoboAdvisorService } from "./services/RoboAdvisorService";
import { ReferralService } from "./services/ReferralService";
import { EducationService } from "./services/EducationService";
import { TaxService } from "./services/TaxService";
import { BankingService } from "./services/BankingService";
import { WalletService } from "./services/WalletService";
import { NotificationService } from "./services/NotificationService";
import { AutoInvestService } from "./services/AutoInvestService";
import priorityFeaturesRouter from "./routes/priority-features";
import paymentRouter from "./routes/payment-routes";


import { autoReconcileTransactions, handleFailedTransaction } from "./utils/reconciliation-error-handler";
import { sendEmail } from "./utils/mailer";

const prisma = new PrismaClient();
const app = express();
app.set("trust proxy", 1);

// initialize MongoDB collections (async safe)
import { initializeCollections } from './lib/mongodb';
initializeCollections().catch((err) => {

});

// Initialize feature services
const portfolioService = new PortfolioService();
const marketDataService = new MarketDataService();
const priceAlertService = new PriceAlertService();
const socialTradingService = new SocialTradingService();
const roboAdvisorService = new RoboAdvisorService();
const referralService = new ReferralService();
const educationService = new EducationService();
const taxService = new TaxService();
const bankingService = new BankingService();
const walletService = new WalletService();
const notificationService = new NotificationService();
const autoInvestService = new AutoInvestService();


(async () => {
  try {
    // Run initial reconciliation on startup
    const result = await autoReconcileTransactions();
    console.log(`[Startup] Reconciliation result: ${result.reconciled} transactions reconciled`);
    if (result.errors.length > 0) {
      console.warn(`[Startup] Reconciliation errors: ${result.errors.length}`);
    }

    // Schedule hourly reconciliation checks
    const reconciliationInterval = setInterval(async () => {
      try {
        const hourlyResult = await autoReconcileTransactions();
        if (hourlyResult.reconciled > 0 || hourlyResult.errors.length > 0) {
          console.log(
            `[Reconciliation] Hourly check: ${hourlyResult.reconciled} reconciled, ${hourlyResult.errors.length} errors`
          );
        }
      } catch (err) {
        console.error('[Reconciliation] Hourly check failed:', err);
        // Don't throw; let server continue
      }
    }, 60 * 60 * 1000); // Run every hour

    // Graceful cleanup on shutdown
    process.on('SIGINT', () => clearInterval(reconciliationInterval));
    process.on('SIGTERM', () => clearInterval(reconciliationInterval));
  } catch (err) {
    console.error('[Startup] Failed to start reconciliation scheduler:', err);
    // Don't halt startup; log and continue
  }
})();

const ALLOWED_ORIGINS = (() => {
  const envOrigins = (process.env.ALLOWED_ORIGINS || "").trim();
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (!envOrigins) {
    if (nodeEnv === 'production') {
      throw new Error('CRITICAL: ALLOWED_ORIGINS must be set in .env for production');
    }
    // Development defaults

    return ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000'];
  }
  
  return envOrigins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
})();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests without origin (like mobile apps)
      if (!origin) return cb(null, true);
      
      // Check if origin is in allowlist
      if (ALLOWED_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      
      // Log blocked origins in development

      
      return cb(new Error("CORS policy violation"), false);
    },
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
  })
);

import * as path from 'path';
import * as fs from 'fs';

// Limit request body size to prevent DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(express.raw({ limit: '1mb' }));
app.use(cookieParser());

// Chat support integration
// @ts-ignore
const chatModule = require('../chat-support');
const ChatManager = chatModule.ChatManager;
const chatManager = new ChatManager();

app.use('/api/support', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many chat requests"
}));

app.post('/api/support/chat/create', (req, res) => {
  try {
    const { userId, email, category = 'general' } = req.body;
    if (!req.userId || !req.userEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }
    const chat = chatManager.createChat(userId, email, category);
    res.json({ success: true, chat: chat.toJSON(false) });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to create chat' });
  }
});

app.get('/api/support/chat/my-chats', (req, res) => {
  try {
    if (!req.userEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const chats = chatManager.getUserChats(req.userEmail);
    res.json({ success: true, chats: chats.map(c => c.toJSON(false)) });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch chats' });
  }
});

app.get('/api/support/chat/:conversationId', (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const chat = chatManager.getChat(req.params.conversationId);
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    res.json({ success: true, chat: chat.toJSON(true) });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
});

app.post('/api/support/chat/:conversationId/message', (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { content, attachments = [] } = req.body;
    if (!content || typeof content !== 'string' || content.length > 4000) {
      return res.status(400).json({ success: false, error: 'Invalid message content' });
    }
    const message = chatManager.addMessage(req.params.conversationId, 'user', content, attachments);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    res.json({ success: true, message });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

app.get('/api/support/admin/chats', requireAdmin, (req, res) => {
  try {
    const chats = chatManager.getOpenChats();
    res.json({ success: true, chats: chats.map(c => c.toJSON(false)) });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch admin chats' });
  }
});

app.post('/api/support/admin/:conversationId/assign', requireAdmin, (req, res) => {
  try {
    const { adminEmail } = req.body;
    const success = chatManager.assignChat(req.params.conversationId, adminEmail);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to assign chat' });
  }
});

app.post('/api/support/admin/:conversationId/close', requireAdmin, (req, res) => {
  try {
    const { resolution, note } = req.body;
    const success = chatManager.closeChat(req.params.conversationId, resolution, note);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to close chat' });
  }
});

app.get('/api/support/admin/stats', requireAdmin, (req, res) => {
  try {
    const stats = chatManager.getStatistics();
    res.json({ success: true, stats });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

app.get('/api/support/admin/search', requireAdmin, (req, res) => {
  try {
    const { query } = req.query;
    const chats = chatManager.searchChats(query as string);
    res.json({ success: true, chats: chats.map(c => c.toJSON(false)) });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to search chats' });
  }
});

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // In production, REQUIRE JWT_SECRET to be set and valid
  if (nodeEnv === 'production' || process.env.ENFORCE_STRICT_JWT === 'true') {
    if (!secret) {
      throw new Error('CRITICAL: JWT_SECRET must be set in .env for production');
    }
    if (secret === 'INSECURE-DEV-SECRET-CHANGE-ME' || secret.length < 32) {
      throw new Error('CRITICAL: JWT_SECRET must be at least 32 random characters and not be the default value');
    }
    return secret;
  }
  
  // In development, allow fallback but warn
  if (!secret) {
    console.warn('⚠️ WARNING: JWT_SECRET not set in .env — using insecure fallback (DEV ONLY)');
    return 'INSECURE-DEV-SECRET-CHANGE-ME';
  }
  
  return secret;
})();

interface JWTPayload {
  userId: string;
  email: string;
  admin?: boolean;
}



function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 254 && emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return typeof phone === 'string' && phoneRegex.test(phone);
}

function sanitizeString(str: string, maxLength = 1000): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>\"'`]/g, '').substring(0, maxLength);
}

function sanitizeError(error: any): string {
  if (typeof error === 'string') return sanitizeString(error, 200);
  if (error instanceof Error) return sanitizeString(error.message, 200);
  return 'An error occurred';
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}



const failedAdminAttempts = new Map<string, { count: number; resetTime: number }>();

// Admin rate limiter
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 requests per window
  keyGenerator: (req) => {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 login attempts per window
  keyGenerator: (req) => {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

function resolveProfileKey(req: any, body: any): string | null {
  if (req.userEmail) return String(req.userEmail).toLowerCase();
  const email = body?.email;
  if (typeof email === 'string' && email.includes('@')) return email.toLowerCase();
  return null;
}

function verifyTokenFromReq(req: express.Request): JWTPayload | null {
  const auth = (req.headers.authorization || "").toString();
  let token: string | null = null;
  if (auth && auth.startsWith("Bearer ")) token = auth.split(" ")[1];
  if (!token && (req as any).cookies?.si_token) token = (req as any).cookies.si_token;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (e) {
    return null;
  }
}

app.use(async (req, _res, next) => {
  const payload = verifyTokenFromReq(req);
  (req as any).userId = payload?.userId || null;
  (req as any).userEmail = payload?.email || null;
  (req as any).isAdmin = payload?.admin || false;
  next();
});

// ============================================
// PHASE 1 SECURITY: Error Sanitization Middleware
// ============================================
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = err.statusCode || 500;
  const sanitized = sanitizeError(err);
  
  // Log actual error internally (don't send to client)
  console.error('[ERROR]', err);
  
  // notify admin once for first crash
  reportCrisis('error', `${err.message || err}`).catch(e => console.error('reportCrisis failed', e));
  
  // Send sanitized error to client
  res.status(statusCode).json({
    error: sanitized,
})  
});

function requireUser(req: any) {
  if (!req.userId) {
    const err = new Error("Unauthorized: missing or invalid auth token");
    (err as any).statusCode = 401;
    throw err;
  }
  return req.userId as string;
}

function requireAdmin(req: any) {
  if (!req.isAdmin) {
    const err = new Error("Unauthorized: admin access required");
    (err as any).statusCode = 401;
    throw err;
  }
}

// ============================================
// PHASE 1 SECURITY: Apply Admin Rate Limiter
// ============================================
app.use('/api/admin', adminLimiter);
app.use('/api/diplomacy/missions', adminLimiter);
app.use('/api/diplomacy/treaties', adminLimiter);
app.use('/api/diplomacy/delegations', adminLimiter);
app.use('/api/diplomacy/documents', adminLimiter);
app.use('/api/auth/login', loginLimiter);

// ============================================
// ADMIN FLAG EXTRACTION MIDDLEWARE
// ============================================
// monitor request durations in case of slowness
const SLOW_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '2000');
app.use((req: any, res: any, next: any) => {
  const start = Date.now();
  res.on('finish', async () => {
    const dur = Date.now() - start;
    if (dur > SLOW_THRESHOLD_MS) {
      reportCrisis('slow', `${req.method} ${req.path} took ${dur}ms`)
        .catch(e => console.error('failed to report slow crisis', e));
    }
  });
  next();
});

app.use((req: any, res: any, next: any) => {
  // Extract admin flag from various sources
  const adminHeader = req.headers['x-admin'] || req.headers['X-Admin'];
  const adminFromAuth = req.user?.admin;
  const adminFromBody = req.body?.admin;

  if (adminHeader === 'true' || adminFromAuth || adminFromBody) {
    req.isAdmin = true;
  }

  next();
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// POST /api/auth/signup - User registration
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, acceptTerms } = req.body || {};
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters' 
      });
    }
    
    const normalizedEmail = email.toLowerCase();
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email already registered. Please login or use another email.' 
      });
    }
    
    // Hash password
    const passwordHash = hashPassword(password);
    
    // determine role for potential admin creation
    let userRole = 'user';
    const wantAdmin = req.body?.admin;
    const providedSecret = req.body?.adminSecret;
    const adminEnvSecret = process.env.ADMIN_REG_SECRET;
    const count = await prisma.user.count();
    if (wantAdmin) {
      if (req.isAdmin || (adminEnvSecret && providedSecret === adminEnvSecret) || count === 0) {
        userRole = 'admin';
      } else {
        return res.status(403).json({ success: false, error: 'Cannot create admin account' });
      }
    }
    
    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: passwordHash,
        role: userRole,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      }
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, admin: userRole === 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // generate and save email confirmation token
    try {
      const confirmToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 3600 * 1000);
      await prisma.user.update({
        where: { id: newUser.id },
        data: { confirmToken, confirmExpires: expires }
      });
      const link = `${process.env.BASE_URL || ''}/confirm-email.html?token=${confirmToken}`;
      await sendEmail(newUser.email, 'Confirm your email', `Please confirm your email: ${link}`);
    } catch (e) {
      console.warn('email confirmation setup failed', e);
    }

    // Set HttpOnly cookie
    res.cookie('si_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: newUser.id,
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Registration failed. Please try again.' 
    });
  }
});

// helper to read/write app configuration
async function getAppSetting(key: string): Promise<string | null> {
  const entry = await prisma.appSetting.findUnique({ where: { key } });
  return entry ? entry.value : null;
}
async function setAppSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

// generic crisis reporter - sends email once per type until cleared
async function reportCrisis(type: string, message: string) {
  const flagKey = `crisis_${type}`;
  const already = await getAppSetting(flagKey);
  if (already === 'true') return; // one-time notification
  await setAppSetting(flagKey, 'true');
  const adminEmail = process.env.ADMIN_USER || process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail(
      adminEmail,
      `🚨 Crisis detected: ${type}`,
      `A crisis of type '${type}' occurred:\n${message}\nTime: ${new Date().toISOString()}`
    );
  }
}

async function clearCrisisFlags() {
  await setAppSetting('crisis_error', 'false');
  await setAppSetting('crisis_slow', 'false');
  await setAppSetting('crisis_authFallbackRequested', 'false'); // retain older key
}

// helper to determine whether supabase fallback is currently enabled
async function isFallbackEnabled(): Promise<boolean> {
  const val = await getAppSetting('authFallbackEnabled');
  return val === 'true';
}

// attempt login against Supabase auth REST API (returns user object or throws)
async function attemptSupabaseLogin(email: string, password: string) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials not configured');
  }
  const resp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY!
    },
    body: JSON.stringify({ email, password })
  });
  const data = await resp.json();
  if (!resp.ok || !data.user) {
    throw new Error(data.error_description || data.error || 'Supabase login failed');
  }
  return data;
}

// POST /api/auth/login - User login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase();

  // ensure required fields are present
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    // primary authentication flow
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.password) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    const token = jwt.sign({ userId: user.id, email: user.email, admin: isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('si_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ success: true, message: 'Login successful', user: { id: user.id, email: user.email, isAdmin }, token });
  } catch (error) {
    console.error('Primary login error:', error);
    // if primary flow crashes and fallback is enabled, try Supabase
    if (await isFallbackEnabled()) {
      try {
        const supa = await attemptSupabaseLogin(normalizedEmail, password);
        // record crisis request only once
        const already = await getAppSetting('authFallbackRequested');
        if (!already) {
          await setAppSetting('authFallbackRequested', 'true');
          const adminEmail = process.env.ADMIN_USER || process.env.ADMIN_EMAIL;
          if (adminEmail) {
            await sendEmail(
              adminEmail,
              '🚨 Crisis auth fallback triggered',
              `Primary authentication failed and fallback to Supabase was invoked at ${new Date().toISOString()}. Please investigate and disable fallback when resolved.`
            );
          }
        }

        // upsert user locally so token generation works
        let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
          user = await prisma.user.create({ data: { email: normalizedEmail, password: '', emailVerified: true } });
        }
        const isAdmin = user.role === 'admin' || user.role === 'superadmin';
        const token = jwt.sign({ userId: user.id, email: user.email, admin: isAdmin }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('si_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.json({ success: true, message: 'Login successful (fallback)', user: { id: user.id, email: user.email, isAdmin }, token });
      } catch (fbErr) {
        console.error('Fallback login error:', fbErr);
      }
    }
    return res.status(500).json({ success: false, error: 'Login failed due to server error' });
  }
});



// new endpoints to manage supabase fallback
app.get('/api/auth/fallback', async (req, res) => {
  try {
    requireAdmin(req);
    const enabled = await isFallbackEnabled();
    const requested = await getAppSetting('authFallbackRequested');
    return res.json({ success: true, enabled, crisisRequested: requested === 'true' });
  } catch (e) {
    return res.status(401).json({ success: false, error: e.message });
  }
});

app.post('/api/auth/fallback/enable', async (req, res) => {
  try {
    requireAdmin(req);
    await setAppSetting('authFallbackEnabled', 'true');
    return res.json({ success: true, enabled: true });
  } catch (e) {
    return res.status(401).json({ success: false, error: e.message });
  }
});

app.post('/api/auth/fallback/disable', async (req, res) => {
  try {
    requireAdmin(req);
    await setAppSetting('authFallbackEnabled', 'false');
    // clear any outstanding crisis request so it can be re-issued later
    await setAppSetting('authFallbackRequested', 'false');
    return res.json({ success: true, enabled: false });
  } catch (e) {
    return res.status(401).json({ success: false, error: e.message });
  }
});

// ---------------------------------------------------
// GENERAL CRISIS STATUS ENDPOINTS (for admin panel)
// ---------------------------------------------------
app.get('/api/crisis', async (req, res) => {
  try {
    requireAdmin(req);
    const errorFlag = await getAppSetting('crisis_error') === 'true';
    const slowFlag = await getAppSetting('crisis_slow') === 'true';
    const fallbackReq = await getAppSetting('authFallbackRequested') === 'true';
    return res.json({ success: true, errorFlag, slowFlag, fallbackReq });
  } catch (e) {
    return res.status(401).json({ success: false, error: e.message });
  }
});

app.post('/api/crisis/clear', async (req, res) => {
  try {
    requireAdmin(req);
    await clearCrisisFlags();
    return res.json({ success: true });
  } catch (e) {
    return res.status(401).json({ success: false, error: e.message });
  }
});




import { sendEmail } from './utils/mailer';

// GET /api/auth/me - return current user info based on token
app.get('/api/auth/me', (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  res.json({
    success: true,
    user: {
      id: req.userId,
      email: req.userEmail,
      isAdmin: req.isAdmin,
    },
  });
});

// client‑side error reports (no auth required)
app.post('/api/monitor/client-error', async (req, res) => {
  try {
    const { message, stack, filename, lineno, colno } = req.body || {};
    console.warn('Client error reported', { message, filename, lineno, colno, stack });
    await reportCrisis('client', message || 'unknown');
    res.json({ success: true });
  } catch (e) {
    console.error('monitor endpoint error', e);
    res.status(500).json({ success: false, error: 'monitor failed' });
  }
});

// POST /api/auth/password-reset - start password reset flow (persisted)
app.post('/api/auth/password-reset', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }
    const normalized = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return res.json({ success: true, message: 'If that account exists, a reset link was sent.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetExpires: expires },
    });
    // send email
    const link = `${process.env.BASE_URL || ''}/reset-password.html?token=${token}`;
    await sendEmail(user.email, 'Password reset request', `Click here to reset your password: ${link}`);
    return res.json({ success: true, message: 'Password reset link sent if account exists.' });
  } catch (e: any) {
    console.error('password-reset error', e);
    return res.status(500).json({ success: false, error: 'Failed to generate reset link' });
  }
});

// POST /api/auth/password-reset/confirm - apply new password
app.post('/api/auth/password-reset/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Invalid token or password' });
    }
    const user = await prisma.user.findFirst({ where: { resetToken: token } });
    if (!user || !user.resetExpires || user.resetExpires < new Date()) {
      return res.status(400).json({ success: false, error: 'Token expired or invalid' });
    }
    const passwordHash = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash, resetToken: null, resetExpires: null },
    });
    return res.json({ success: true, message: 'Password updated' });
  } catch (e: any) {
    console.error('reset-confirm error', e);
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// POST /api/auth/confirm-email - mark email as verified
app.post('/api/auth/confirm-email', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing token' });
    }
    const user = await prisma.user.findFirst({ where: { confirmToken: token } });
    if (!user || !user.confirmExpires || user.confirmExpires < new Date()) {
      return res.status(400).json({ success: false, error: 'Token expired or invalid' });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, confirmToken: null, confirmExpires: null },
    });
    return res.json({ success: true, message: 'Email confirmed' });
  } catch (e: any) {
    console.error('confirm-email error', e);
    return res.status(500).json({ success: false, error: 'Failed to confirm email' });
  }
});

// ---- Diplomacy portal endpoints ----
app.get("/api/diplomacy/missions", async (_req, res) => {
  const missions = await prisma.diplomacyMission.findMany({ orderBy: { name: "asc" } });
  res.json({ success: true, missions });
});

app.get("/api/diplomacy/missions/:id", async (req, res) => {
  const mission = await prisma.diplomacyMission.findUnique({ where: { id: req.params.id } });
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  res.json({ success: true, mission });
});

app.post("/api/diplomacy/missions", async (req, res) => {
  try {
    requireAdmin(req);
    const { name, country, city, region, type, status, contactEmail, contactPhone, focusArea } = req.body || {};
    
    // Input validation
    if (!name || !country || !city || !type) {
      return res.status(400).json({ error: "Missing required fields: name, country, city, type" });
    }
    
    if (typeof name !== 'string' || name.length > 500) {
      return res.status(400).json({ error: "Invalid name: must be string ≤500 chars" });
    }
    
    if (contactEmail && !isValidEmail(contactEmail)) {
      return res.status(400).json({ error: "Invalid contact email" });
    }
    
    if (contactPhone && !isValidPhone(contactPhone)) {
      return res.status(400).json({ error: "Invalid contact phone" });
    }
    
    const mission = await prisma.diplomacyMission.create({
      data: {
        name: sanitizeString(name),
        country: sanitizeString(country),
        city: sanitizeString(city),
        region: sanitizeString(region),
        type: sanitizeString(type),
        status: sanitizeString(status),
        contactEmail: contactEmail ? sanitizeString(contactEmail) : null,
        contactPhone: contactPhone ? sanitizeString(contactPhone) : null,
        focusArea: focusArea ? sanitizeString(focusArea) : null,
      },
    });
    res.json({ success: true, mission });
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: sanitizeError(e) });
  }
});

app.get("/api/diplomacy/treaties", async (_req, res) => {
  const treaties = await prisma.diplomacyTreaty.findMany({ orderBy: { updatedAt: "desc" } });
  res.json({ success: true, treaties });
});

app.get("/api/diplomacy/treaties/:id", async (req, res) => {
  const treaty = await prisma.diplomacyTreaty.findUnique({ where: { id: req.params.id } });
  if (!treaty) return res.status(404).json({ error: "Treaty not found" });
  res.json({ success: true, treaty });
});

app.post("/api/diplomacy/treaties", async (req, res) => {
  try {
    requireAdmin(req);
    const { title, partner, sector, status, signedAt, nextMilestone, summary } = req.body || {};
    
    // Input validation
    if (!title || !partner || !sector) {
      return res.status(400).json({ error: "Missing required fields: title, partner, sector" });
    }
    
    if (typeof title !== 'string' || title.length > 500) {
      return res.status(400).json({ error: "Invalid title: must be string ≤500 chars" });
    }
    
    const treaty = await prisma.diplomacyTreaty.create({
      data: {
        title: sanitizeString(title),
        partner: sanitizeString(partner),
        sector: sanitizeString(sector),
        status: status ? sanitizeString(status) : null,
        signedAt: signedAt ? new Date(signedAt) : null,
        nextMilestone: nextMilestone ? new Date(nextMilestone) : null,
        summary: summary ? sanitizeString(summary) : null,
      },
    });
    res.json({ success: true, treaty });
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: sanitizeError(e) });
  }
});

app.get("/api/diplomacy/delegations", async (_req, res) => {
  const delegations = await prisma.diplomacyDelegation.findMany({ orderBy: { startDate: "asc" } });
  res.json({ success: true, delegations });
});

app.get("/api/diplomacy/delegations/:id", async (req, res) => {
  const delegation = await prisma.diplomacyDelegation.findUnique({ where: { id: req.params.id } });
  if (!delegation) return res.status(404).json({ error: "Delegation not found" });
  res.json({ success: true, delegation });
});

app.post("/api/diplomacy/delegations", async (req, res) => {
  try {
    requireAdmin(req);
    const { name, focus, hostCity, hostCountry, leadMinistry, status, startDate, endDate, objectives } = req.body || {};
    
    // Input validation
    if (!name || !focus || !hostCity || !hostCountry || !leadMinistry || !startDate || !endDate) {
      return res.status(400).json({ 
        error: "Missing required fields: name, focus, hostCity, hostCountry, leadMinistry, startDate, endDate" 
      });
    }
    
    if (typeof name !== 'string' || name.length > 500) {
      return res.status(400).json({ error: "Invalid name: must be string ≤500 chars" });
    }
    
    const delegation = await prisma.diplomacyDelegation.create({
      data: {
        name: sanitizeString(name),
        focus: sanitizeString(focus),
        hostCity: sanitizeString(hostCity),
        hostCountry: sanitizeString(hostCountry),
        leadMinistry: sanitizeString(leadMinistry),
        status: status ? sanitizeString(status) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        objectives: objectives ? sanitizeString(objectives) : null,
      },
    });
    res.json({ success: true, delegation });
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: sanitizeError(e) });
  }
});

app.get("/api/diplomacy/documents", async (_req, res) => {
  const documents = await prisma.diplomacyDocument.findMany({ orderBy: { updatedAt: "desc" } });
  res.json({ success: true, documents });
});

app.get("/api/diplomacy/documents/:id", async (req, res) => {
  const document = await prisma.diplomacyDocument.findUnique({ where: { id: req.params.id } });
  if (!document) return res.status(404).json({ error: "Document not found" });
  res.json({ success: true, document });
});

app.post("/api/diplomacy/documents", async (req, res) => {
  try {
    requireAdmin(req);
    const { title, category, classification, ownerDept, summary, linkUrl } = req.body || {};
    
    // Input validation
    if (!title || !category || !ownerDept) {
      return res.status(400).json({ error: "Missing required fields: title, category, ownerDept" });
    }
    
    if (typeof title !== 'string' || title.length > 500) {
      return res.status(400).json({ error: "Invalid title: must be string ≤500 chars" });
    }
    
    if (linkUrl && !/^https?:\/\//.test(linkUrl)) {
      return res.status(400).json({ error: "Invalid linkUrl: must be valid HTTP/HTTPS URL" });
    }
    
    const document = await prisma.diplomacyDocument.create({
      data: {
        title: sanitizeString(title),
        category: sanitizeString(category),
        classification: classification ? sanitizeString(classification) : null,
        ownerDept: sanitizeString(ownerDept),
        summary: summary ? sanitizeString(summary) : null,
        linkUrl: linkUrl ? sanitizeString(linkUrl) : null,
      },
    });
    res.json({ success: true, document });
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: sanitizeError(e) });
  }
});

// ---- Licensing check endpoint (example: market data request) ----
app.post("/api/data/request", async (req, res) => {
  try {
    const actorId = (req as any).userId || null;
    const { datasetKey, purpose, requestMeta } = req.body;

    const entitlement = await checkEntitlementAndLog({
      datasetKey,
      purpose,
      actorUserId: actorId,
      ip: req.ip,
      userAgent: req.get("user-agent") || undefined,
      requestMeta,
    });

    if (!entitlement.allowed) return res.status(403).json(entitlement);
    res.json({ ok: true, entitlement });
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: e.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// Admin endpoints for dashboard
app.get("/api/admin/users", async (req, res) => {
  try {
    requireAdmin(req);
    const { query } = req.query;
    const where = query ? { OR: [{ email: { contains: String(query) } }, { name: { contains: String(query) } }] } : {};
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, createdAt: true, role: true, updatedAt: true }, // No password
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, users });
  } catch (e) {
    res.status(401).json({ success: false, error: 'Admin access required' });
  }
});

app.get("/api/admin/dashboard-stats", async (req, res) => {
  try {
    requireAdmin(req);
    const [usersCount, premiumCount, filesCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['premium', 'enterprise'] } } }),
      prisma.file.count(),
    ]);
    const messagesCount = await prisma.message.count({ where: { repliedAt: null } });
    res.json({ 
      success: true,
      totalUsers: usersCount,
      premiumUsers: premiumCount,
      filesUploaded: filesCount,
      pendingMessages: messagesCount 
    });
  } catch (e) {
    res.status(401).json({ success: false, error: 'Admin access required' });
  }
});

app.get("/api/admin/files", async (req, res) => {
  try {
    requireAdmin(req);
    const files = await prisma.file.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, price: true, published: true, originalName: true, createdAt: true }
    });
    res.json({ success: true, files });
  } catch (e) {
    res.status(401).json({ success: false, error: 'Admin access required' });
  }
});

app.get("/api/admin/sessions", async (req, res) => {
  try {
    requireAdmin(req);
    // Mock sessions - in production, query your session store
    res.json({ success: true, sessions: [] });
  } catch (e) {
    res.status(401).json({ success: false, error: 'Admin access required' });
  }
});

const port = process.env.PORT || 3001;
const server = app.listen(port, () => console.log(`Server on :${port}`));

// WebSocket for realtime chat
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { url } = request;
  if (url.startsWith('/ws/chat/')) {
    const conversationId = url.slice('/ws/chat/'.length);
    wss.handleUpgrade(request, socket, head, (ws) => {
      chatManager.subscribe(conversationId, ws);
      ws.on('message', (message) => {
        try {
          const data = JSON.stringify(message.toString());
          chatManager.notifySubscribers(conversationId, data);
        } catch (e) {}
      });
      ws.on('close', () => {
        chatManager.unsubscribe(conversationId, ws);
      });
    });
  } else {
    socket.destroy();
  }
});

// Graceful shutdown - close Prisma connection
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
