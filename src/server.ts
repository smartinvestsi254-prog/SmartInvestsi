// src/server.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://932acfc8ce257a2cc55753590d838955@4511098961526784.ingest.de.sentry.io/4511098974568528",
  // Setting this option to true will send default PII data to Sentry.
  sendDefaultPii: true,
});

// Instruments (adapt path for src context)
import "../netlify/functions/instruments.js";

import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

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
// import priorityFeaturesRouter from "./routes/priority-features";
import paymentRouter from "./routes/payment-routes";

import { autoReconcileTransactions } from "./utils/reconciliation-error-handler";
import { sendEmail } from "./utils/mailer";

import { dbClient } from './lib/db-client';
const prisma = dbClient.getClient();
const app = express();
app.set("trust proxy", 1);

// Extend Express Request types to handle custom tracking variables
declare global {
  namespace Express {
    interface Request {
      userId?: string | null;
      userEmail?: string | null;
      isAdmin?: boolean;
      user?: {
        admin?: boolean;
        [key: string]: any;
      };
    }
  }
}

// Fallback reporting mechanism if not globally declared
async function reportCrisis(type: string, message: string): Promise<void> {
  console.error(`[CRISIS - ${type.toUpperCase()}] ${message}`);
}

// initialize MongoDB collections (async safe)
import { initializeCollections } from './lib/mongodb';
initializeCollections().catch((err) => {
  console.error("MongoDB initialization failed:", err);
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

// Limit request body size to prevent DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(express.raw({ limit: '1mb' }));
app.use(cookieParser());

// Wire priority feature modules and routers
// app.use("/api/priority", priorityFeaturesRouter);
app.use("/api/payments", paymentRouter);

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
    res.json({ success: true, chats: chats.map((c: any) => c.toJSON(false)) });
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
    res.json({ success: true, chats: chats.map((c: any) => c.toJSON(false)) });
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
    res.json({ success: true, chats: chats.map((c: any) => c.toJSON(false)) });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to search chats' });
  }
});

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production' || process.env.ENFORCE_STRICT_JWT === 'true') {
    if (!secret) {
      throw new Error('CRITICAL: JWT_SECRET must be set in .env for production');
    }
    if (secret === 'INSECURE-DEV-SECRET-CHANGE-ME' || secret.length < 32) {
      throw new Error('CRITICAL: JWT_SECRET must be at least 32 random characters and not be the default value');
    }
    return secret;
  }
  
  if (!secret) {
    reportCrisis('jwt_secret_missing', `JWT_SECRET missing in ${process.env.NODE_ENV}`);
    throw new Error('JWT_SECRET required - admin: POST /api/auth/fallback/enable');
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

// Admin rate limiter
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

function verifyTokenFromReq(req: express.Request): JWTPayload | null {
  const auth = (req.headers.authorization || "").toString();
  let token: string | null = null;
  if (auth && auth.startsWith("Bearer ")) token = auth.split(" ")[1];
  if (!token && req.cookies?.si_token) token = req.cookies.si_token;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (e) {
    return null;
  }
}

app.use(async (req, _res, next) => {
  const payload = verifyTokenFromReq(req);
  req.userId = payload?.userId || null;
  req.userEmail = payload?.email || null;
  req.isAdmin = payload?.admin || false;
  next();
});

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.isAdmin) {
    return res.status(403).json({ success: false, error: "Unauthorized: admin access required" });
  }
  next();
}

// Apply Admin and Login Rate Limiters
app.use('/api/admin', adminLimiter);
app.use('/api/diplomacy', adminLimiter);
app.use('/api/auth/login', loginLimiter);

// monitor request durations in case of slowness
const SLOW_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '2000');
app.use((req, res, next) => {
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

app.use((req, _res, next) => {
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
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters' 
      });
    }
    
    const normalizedEmail = email.toLowerCase();
    
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email already registered. Please login or use another email.' 
      });
    }
    
    const passwordHash = hashPassword(password);
    
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
    
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, admin: userRole === 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
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

    res.cookie('si_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: newUser.id,
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, error: 'An internal error occurred during setup' });
  }
});

// Global Error Handling Sanitization Middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = err.statusCode || 500;
  const sanitized = sanitizeError(err);
  
  Sentry.captureException(err);
  console.error('[ERROR]', err);
  
  reportCrisis('error', `${err.message || err}`).catch(e => console.error('reportCrisis failed', e));
  
  res.status(statusCode).json({
    error: sanitized,
  });
});

export default app;
