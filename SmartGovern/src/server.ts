// SmartGovern - src/server.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  sendDefaultPii: true,
  enabled: !!process.env.SENTRY_DSN,
});

import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

// Import SmartGovern services
import { createIncident, updateIncidentStatus } from "./incidents/service";
import { submitForReview, recordReviewDecision, publishContent } from "./workflows/engine";
import { checkEntitlementAndLog } from "./licensing/entitlements";

const prisma = new PrismaClient();
const app = express();
app.set("trust proxy", 1);

// Extend Express Request types
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

const ALLOWED_ORIGINS = (() => {
  const envOrigins = (process.env.ALLOWED_ORIGINS || "").trim();
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (!envOrigins) {
    if (nodeEnv === 'production') {
      throw new Error('CRITICAL: ALLOWED_ORIGINS must be set in .env for production');
    }
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
      if (!origin) return cb(null, true);
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

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(cookieParser());

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
    throw new Error('JWT_SECRET required');
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
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
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
    res.status(429).json({ success: false, error: 'Too many login attempts. Please try again later.' });
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

// Apply rate limiters
app.use('/api/admin', adminLimiter);
app.use('/api/diplomacy', adminLimiter);
app.use('/api/auth/login', loginLimiter);

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// POST /api/auth/signup - User registration
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    
    const normalizedEmail = email.toLowerCase();
    
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already registered. Please login or use another email.' });
    }
    
    const passwordHash = hashPassword(password);
    
    let userRole = 'VIEWER';
    const wantAdmin = req.body?.admin;
    const providedSecret = req.body?.adminSecret;
    const adminEnvSecret = process.env.ADMIN_REG_SECRET;
    const count = await prisma.user.count();
    
    if (wantAdmin) {
      if (req.isAdmin || (adminEnvSecret && providedSecret === adminEnvSecret) || count === 0) {
        userRole = 'ADMIN';
      } else {
        return res.status(403).json({ success: false, error: 'Cannot create admin account' });
      }
    }
    
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: passwordHash,
        role: userRole as any,
      },
      select: { id: true, email: true, createdAt: true }
    });
    
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, admin: userRole === 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
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

// POST /api/auth/login - User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    
    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    const hashedInput = hashPassword(password);
    if (user.passwordHash !== hashedInput) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, admin: user.role === 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.cookie('si_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    return res.json({
      success: true,
      message: 'Login successful',
      userId: user.id,
      token,
      role: user.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'An internal error occurred' });
  }
});

// ============================================
// INCIDENT MANAGEMENT ROUTES
// ============================================

app.post('/api/incidents', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { title, summary, severity, runbookKey } = req.body;
    if (!title || !summary || !severity) {
      return res.status(400).json({ success: false, error: 'title, summary, and severity are required' });
    }
    const result = await createIncident({
      reporterId: req.userId,
      title,
      summary,
      severity,
      runbookKey,
    });
    res.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to create incident' });
  }
});

app.get('/api/incidents', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reportedBy: { select: { id: true, email: true } },
        owner: { select: { id: true, email: true } },
        timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
        updates: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    res.json({ success: true, incidents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/incidents/:id', async (req, res) => {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: {
        reportedBy: { select: { id: true, email: true, role: true } },
        owner: { select: { id: true, email: true, role: true } },
        timeline: { orderBy: { createdAt: 'asc' } },
        updates: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }
    res.json({ success: true, incident });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/incidents/:id/status', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { status, publicNote, internalNote } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }
    const result = await updateIncidentStatus({
      actorId: req.userId,
      incidentId: req.params.id,
      status,
      publicNote,
      internalNote,
    });
    res.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to update incident status' });
  }
});

// ============================================
// WORKFLOW MANAGEMENT ROUTES
// ============================================

app.post('/api/workflows/submit', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { contentId } = req.body;
    if (!contentId) {
      return res.status(400).json({ success: false, error: 'contentId is required' });
    }
    const result = await submitForReview({ contentId, actorId: req.userId });
    res.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to submit for review' });
  }
});

app.post('/api/workflows/review', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { workflowId, decision, notes } = req.body;
    if (!workflowId || !decision) {
      return res.status(400).json({ success: false, error: 'workflowId and decision are required' });
    }
    const result = await recordReviewDecision({ workflowId, actorId: req.userId, decision, notes });
    res.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to record review' });
  }
});

app.post('/api/workflows/publish', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { contentId } = req.body;
    if (!contentId) {
      return res.status(400).json({ success: false, error: 'contentId is required' });
    }
    const result = await publishContent({ contentId, actorId: req.userId });
    res.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to publish content' });
  }
});

app.get('/api/workflows', async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        content: true,
        lockedBy: { select: { id: true, email: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 3 },
        approvals: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
    res.json({ success: true, workflows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DIPLOMACY ROUTES
// ============================================

// Missions
app.get('/api/diplomacy/missions', async (req, res) => {
  try {
    const missions = await prisma.diplomacyMission.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, missions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/diplomacy/missions', requireAdmin, async (req, res) => {
  try {
    const { name, country, city, region, type, contactEmail, contactPhone, focusArea } = req.body;
    if (!name || !country || !city || !type) {
      return res.status(400).json({ success: false, error: 'name, country, city, and type are required' });
    }
    const mission = await prisma.diplomacyMission.create({
      data: { name, country, city, region, type, contactEmail, contactPhone, focusArea },
    });
    res.status(201).json({ success: true, mission });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Treaties
app.get('/api/diplomacy/treaties', async (req, res) => {
  try {
    const treaties = await prisma.diplomacyTreaty.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, treaties });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/diplomacy/treaties', requireAdmin, async (req, res) => {
  try {
    const { title, partner, sector, summary } = req.body;
    if (!title || !partner || !sector) {
      return res.status(400).json({ success: false, error: 'title, partner, and sector are required' });
    }
    const treaty = await prisma.diplomacyTreaty.create({
      data: { title, partner, sector, summary },
    });
    res.status(201).json({ success: true, treaty });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delegations
app.get('/api/diplomacy/delegations', async (req, res) => {
  try {
    const delegations = await prisma.diplomacyDelegation.findMany({ orderBy: { startDate: 'desc' } });
    res.json({ success: true, delegations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/diplomacy/delegations', requireAdmin, async (req, res) => {
  try {
    const { name, focus, hostCity, hostCountry, leadMinistry, startDate, endDate, objectives } = req.body;
    if (!name || !focus || !hostCity || !hostCountry || !leadMinistry || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const delegation = await prisma.diplomacyDelegation.create({
      data: { name, focus, hostCity, hostCountry, leadMinistry, startDate: new Date(startDate), endDate: new Date(endDate), objectives },
    });
    res.status(201).json({ success: true, delegation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Documents
app.get('/api/diplomacy/documents', async (req, res) => {
  try {
    const documents = await prisma.diplomacyDocument.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, documents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/diplomacy/documents', requireAdmin, async (req, res) => {
  try {
    const { title, category, classification, ownerDept, summary, linkUrl } = req.body;
    if (!title || !category || !ownerDept) {
      return res.status(400).json({ success: false, error: 'title, category, and ownerDept are required' });
    }
    const document = await prisma.diplomacyDocument.create({
      data: { title, category, classification, ownerDept, summary, linkUrl },
    });
    res.status(201).json({ success: true, document });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DATA LICENSING ROUTES
// ============================================

app.get('/api/licensing/partners', async (req, res) => {
  try {
    const partners = await prisma.partner.findMany({
      include: { licenses: { include: { entitlements: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, partners });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/licensing/check', async (req, res) => {
  try {
    const { datasetKey, purpose, actorUserId, ip, userAgent, requestMeta } = req.body;
    if (!datasetKey || !purpose) {
      return res.status(400).json({ success: false, error: 'datasetKey and purpose are required' });
    }
    const result = await checkEntitlementAndLog({
      datasetKey,
      purpose,
      actorUserId: actorUserId || req.userId,
      ip: ip || req.ip,
      userAgent: userAgent || req.headers['user-agent'],
      requestMeta,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, emailVerified: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ success: false, error: 'role is required' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    });
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [userCount, incidentCount, workflowCount, missionCount, treatyCount] = await Promise.all([
      prisma.user.count(),
      prisma.incident.count(),
      prisma.workflow.count(),
      prisma.diplomacyMission.count(),
      prisma.diplomacyTreaty.count(),
    ]);
    res.json({
      success: true,
      stats: { users: userCount, incidents: incidentCount, workflows: workflowCount, missions: missionCount, treaties: treatyCount },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'smartgovern' });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = err.statusCode || 500;
  const sanitized = sanitizeError(err);
  
  Sentry.captureException(err);
  console.error('[ERROR]', err);
  
  res.status(statusCode).json({ error: sanitized });
});

export default app;