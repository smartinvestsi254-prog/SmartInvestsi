// src/server.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
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

const prisma = new PrismaClient();
const app = express();
app.set("trust proxy", 1);

// initialize MongoDB collections (async safe)
import { initializeCollections } from './lib/mongodb';
initializeCollections().catch((err) => {
<<<<<<< HEAD
  console.error('MongoDB initialization error:', err);
=======
  // Log error only in non-production or with debug enabled
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_ENABLED === 'true') {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[MongoDB Init Warning] Collection initialization failed: ${errorMsg}`);
  }
>>>>>>> ffee94f (Next commit)
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

<<<<<<< HEAD
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
=======
const ALLOWED_ORIGINS = (() => {
  const envOrigins = (process.env.ALLOWED_ORIGINS || "").trim();
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (!envOrigins) {
    if (nodeEnv === 'production') {
      throw new Error('CRITICAL: ALLOWED_ORIGINS must be set in .env for production');
    }
    // Development defaults
    if (process.env.DEBUG_ENABLED === 'true') {
      console.warn('⚠️ WARNING: ALLOWED_ORIGINS not configured — using development defaults');
    }
    return ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000'];
  }
  
  return envOrigins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
})();
>>>>>>> ffee94f (Next commit)

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, cb) => {
<<<<<<< HEAD
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("CORS not allowed"), false);
=======
      // Allow requests without origin (like mobile apps)
      if (!origin) return cb(null, true);
      
      // Check if origin is in allowlist
      if (ALLOWED_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      
      // Log blocked origins in development
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_ENABLED === 'true') {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
      }
      
      return cb(new Error("CORS policy violation"), false);
>>>>>>> ffee94f (Next commit)
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

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  const nodeEnv = process.env.NODE_ENV || 'development';
  
<<<<<<< HEAD
  // In production, REQUIRE JWT_SECRET to be set and valid
  if (nodeEnv === 'production' || process.env.ENFORCE_STRICT_JWT === 'true') {
    if (!secret) {
=======
  // In production, REQUIRE JWT_SECRET to be (only if debug enabled)
  if (!secret) {
    if (process.env.DEBUG_ENABLED === 'true') {
      console.warn('⚠️ WARNING: JWT_SECRET not set in .env — using insecure fallback (DEV ONLY)');
    }
>>>>>>> ffee94f (Next commit)
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

// ============================================
// PHASE 1 SECURITY: Input Validators
// ============================================

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

// ============================================
// PHASE 1 SECURITY: Admin Rate Limiting
// ============================================

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
  
  // Send sanitized error to client
  res.status(statusCode).json({
    error: sanitized,
    ...(process.env.NODE_ENV === 'development' && { hint: 'Run with NODE_ENV=production to hide errors' }),
  });
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

// ============================================
// ADMIN FLAG EXTRACTION MIDDLEWARE
// ============================================
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
// PRIORITY FEATURES ROUTES (All 20 Features)
// ============================================
app.use('/api/features', priorityFeaturesRouter);

// ============================================
// PAYMENT ROUTES (PayPal, Google Pay, M-Pesa, etc.)
// ============================================
app.use('/api/payments', paymentRouter);

// ---- Profile endpoints (MVP personalization) ----
app.get('/api/profile', async (req, res) => {
  const key = resolveProfileKey(req, req.body || {});
  if (!key) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { email: key }
    });
    return res.json({ success: true, profile: profile || null });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/profile', async (req, res) => {
  const key = resolveProfileKey(req, req.body || {});
  if (!key) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const allowedGoals = ['growth', 'retirement', 'education', 'business', 'income'];
  const allowedHorizon = ['0-2', '3-5', '6-10', '10+'];
  const allowedRisk = ['low', 'medium', 'high'];

  const goal = sanitizeString(req.body?.goal || '').toLowerCase();
  const horizon = sanitizeString(req.body?.horizon || '').toLowerCase();
  const risk = sanitizeString(req.body?.risk || '').toLowerCase();
  const region = sanitizeString(req.body?.region || '').toUpperCase();
  const contribution = Number(req.body?.contribution || 0);
  const impact = Boolean(req.body?.impact);

  if (!allowedGoals.includes(goal) || !allowedHorizon.includes(horizon) || !allowedRisk.includes(risk) || !region) {
    return res.status(400).json({ success: false, error: 'Invalid profile data' });
  }

  try {
    const profile = await prisma.userProfile.upsert({
      where: { email: key },
      update: {
        investmentGoal: goal,
        timeHorizon: horizon,
        riskTolerance: risk,
        preferredRegion: region,
        monthlyIncome: Number.isFinite(contribution) ? contribution : 0,
        preferences: { impact }
      },
      create: {
        email: key,
        investmentGoal: goal,
        timeHorizon: horizon,
        riskTolerance: risk,
        preferredRegion: region,
        monthlyIncome: Number.isFinite(contribution) ? contribution : 0,
        preferences: { impact }
      }
    });
    return res.json({ success: true, profile });
  } catch (error) {
    console.error('Error saving profile:', error);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ---- Analytics tracking ----
app.post('/api/analytics/track', (req, res) => {
  const payload = verifyTokenFromReq(req);
  const { event, data, timestamp } = req.body || {};
  console.log('Analytics Event:', {
    user: payload?.email || 'anonymous',
    event,
    data,
    timestamp
  });
  return res.json({ success: true });
});

// ---- Workflow endpoints ----
app.post("/api/workflows/submit", async (req, res) => {
  try {
    const actorId = requireUser(req);
    const { contentId } = req.body;
    const out = await submitForReview({ contentId, actorId });
    res.json(out);
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: e.message });
  }
});

app.post("/api/workflows/decision", async (req, res) => {
  try {
    const actorId = requireUser(req);
    const { workflowId, decision, notes } = req.body;
    const out = await recordReviewDecision({
      workflowId,
      actorId,
      decision,
      notes,
    });
    res.json(out);
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: e.message });
  }
});

app.post("/api/workflows/publish", async (req, res) => {
  try {
    const actorId = requireUser(req);
    const { contentId } = req.body;
    const out = await publishContent({ contentId, actorId });
    res.json(out);
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: e.message });
  }
});

// ---- Incident endpoints ----
app.post("/api/incidents", async (req, res) => {
  try {
    const reporterId = requireUser(req);
    const { title, summary, severity, runbookKey } = req.body;
    const out = await createIncident({ reporterId, title, summary, severity, runbookKey });
    res.json(out);
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: e.message });
  }
});

app.post("/api/incidents/:id/status", async (req, res) => {
  try {
    const actorId = requireUser(req);
    const incidentId = req.params.id;
    const { status, publicNote, internalNote } = req.body;
    const out = await updateIncidentStatus({ actorId, incidentId, status, publicNote, internalNote });
    res.json(out);
  } catch (e: any) {
    res.status(e.statusCode || 400).json({ error: e.message });
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

const port = process.env.PORT || 3001;
const server = app.listen(port, () => console.log(`Server on :${port}`));

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
