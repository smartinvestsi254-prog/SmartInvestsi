// Insert/replace the following sections in server.js

// 1) Top of file: add requires
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
// ... (existing requires remain)

// 2) Middle: add middleware
app.use(cookieParser());
// existing app.use(bodyParser.json()); etc.

// 3) Config (after dotenv)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '12h';

// 4) Helper: verify token from Authorization header or cookie
function verifyTokenFromReq(req) {
  const auth = (req.headers.authorization || '').toString();
  let token = null;
  if (auth && auth.startsWith('Bearer ')) token = auth.split(' ')[1];
  if (!token && req.cookies && req.cookies.si_token) token = req.cookies.si_token;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// 5) adminAuth middleware (accept Basic OR Bearer OR cookie)
function adminAuth(req, res, next) {
  const adminUserEnv = process.env.ADMIN_USER;
  const payload = verifyTokenFromReq(req);
  if (payload && payload.admin) {
    req.user = { email: payload.email, admin: true };
    return next();
  }

  // Fallback: Basic auth if ADMIN_USER configured
  const auth = (req.headers.authorization || '').toString();
  if (adminUserEnv && auth && auth.startsWith('Basic ')) {
    const creds = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
    const [user, pass] = creds.split(':');
    if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
      req.user = { email: user, admin: true };
      return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).end('Unauthorized');
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

// 6) Update requirePaidUser to accept cookie-based user email if present
function requirePaidUser(req, res, next) {
  try {
    let email = (req.headers['x-user-email'] || req.query.email || (req.body && req.body.email));
    if (!email) {
      const payload = verifyTokenFromReq(req);
      if (payload && payload.email) email = payload.email;
    }
    if (!email) return res.status(402).json({ error: 'Payment required: include purchaser email in x-user-email header or ?email= or sign in' });
    const e = String(email).toLowerCase();
    const purchases = readPurchases();
    const ok = Array.isArray(purchases) && purchases.find(p => p.email && String(p.email).toLowerCase() === e);
    if (!ok) return res.status(402).json({ error: 'No purchases found for this email' });
    req.purchaserEmail = e;
    return next();
  } catch (e) {
    console.error('requirePaidUser error', e && e.message);
    return res.status(500).json({ error: 'server error' });
  }
}

// 7) Update /api/auth/login to set HttpOnly cookie and NOT return token in body
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const users = readUsers();
    const user = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    // Determine admin flag: either explicit user.admin or match ADMIN_USER env
    const isAdmin = !!((process.env.ADMIN_USER && String(email).toLowerCase() === String(process.env.ADMIN_USER).toLowerCase()) || user.admin);

    const token = jwt.sign({ email: user.email, admin: !!isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Set HttpOnly cookie (si_token)
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      // maxAge default: 12h (match JWT_EXPIRES if needed)
      maxAge: (function() {
        // try to parse common patterns like '12h' or numeric seconds
        const m = String(JWT_EXPIRES || '12h');
        if (/^\\d+$/.test(m)) return Number(m) * 1000;
        const match = m.match(/^(\\d+)h$/);
        if (match) return Number(match[1]) * 60 * 60 * 1000;
        return 1000 * 60 * 60 * 12;
      })()
    };
    res.cookie('si_token', token, cookieOptions);

    return res.json({ success: true, email: user.email, admin: !!isAdmin });
  } catch (err) {
    console.error('login error', err && err.message);
    return res.status(500).json({ error: err && err.message });
  }
});

// 8) Logout endpoint to clear cookie
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('si_token', { path: '/' });
  return res.json({ success: true });
});

// 9) /api/auth/me endpoint reads token from header or cookie
app.get('/api/auth/me', (req, res) => {
  const payload = verifyTokenFromReq(req);
  if (!payload) return res.status(401).json({ error: 'invalid or missing token' });
  return res.json({ success: true, email: payload.email, admin: !!payload.admin });
});