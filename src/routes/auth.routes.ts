import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-in-prod';
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';

// Helper: Verify hCaptcha Token
async function verifyCaptcha(token: string): Promise<boolean> {
  if (!HCAPTCHA_SECRET) return true; // Bypass in dev if no secret is set
  if (!token) return false;

  try {
    const params = new URLSearchParams();
    params.append('secret', HCAPTCHA_SECRET);
    params.append('response', token);

    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('hCaptcha Verification Error:', error);
    return false;
  }
}

// Helper: Set Secure Auth Cookie
function setAuthCookie(res: Response, token: string) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
    path: '/',
  });
}

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      country,
      bankName,
      accountNumber,
      acceptTerms,
      captchaToken,
    } = req.body;

    // 1. Validate required fields
    if (!email || !password || !fullName || !phone || !country || !bankName || !accountNumber) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!acceptTerms) {
      return res.status(400).json({ error: 'You must accept the Terms and Privacy Policy.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // 2. Verify hCaptcha Token
    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid) {
      return res.status(400).json({ error: 'Invalid or expired CAPTCHA verification.' });
    }

    // 3. Check for Existing User
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // 4. Hash Password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Create User in Database
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        fullName,
        phone,
        country,
        bankName,
        accountNumber,
        acceptTerms: Boolean(acceptTerms),
      },
    });

    // 6. Issue JWT & Set HTTP-Only Cookie
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, isAdmin: newUser.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    setAuthCookie(res, token);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        isAdmin: newUser.isAdmin,
      },
    });
  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * POST /api/auth/login (or /signin)
 * Authenticate existing user
 */
router.post(['/login', '/signin'], async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // 1. Fetch User
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // 2. Validate Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // 3. Issue JWT & Set Cookie
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    setAuthCookie(res, token);

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * GET /api/auth/me
 * Check current user session (used by auth.js)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.auth_token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, fullName: true, isAdmin: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
});

/**
 * POST /api/auth/logout
 * Clear session cookie
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.json({ message: 'Logged out successfully' });
});

export default router;
