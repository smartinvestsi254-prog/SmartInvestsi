/**
 * HOW TO INTEGRATE SECURITY INTO server.js
 * 
 * This file shows the exact line numbers and code to add.
 * Copy sections below and paste into server.js
 */

// ============================================================
// SECTION 1: ADD TO TOP OF server.js (after line 6)
// ============================================================
// After:   const crypto = require('crypto');
// Add these lines:

const fs = require('fs');
const path = require('path');

// Import security modules
const {
  DataCompartment,
  UserDataProtection,
  AccessRequest,
  SecurityFirewall,
  PrivacyControl,
  SecureCache,
  DataBreachPrevention
} = require('./data-protection');

const { ChatManager } = require('./chat-support');
const securityIntegration = require('./security-integration');


// ============================================================
// SECTION 2: INITIALIZE SECURITY (after line 10, after: app.use(bodyParser.json());)
// ============================================================

// Initialize security modules
const firewall = new SecurityFirewall();
const privacyControl = new PrivacyControl();
const cache = new SecureCache();
const breachPrevention = new DataBreachPrevention();
const chatManager = new ChatManager();

// Apply firewall globally - MUST BE EARLY IN MIDDLEWARE CHAIN
app.use(firewall.middleware());


// ============================================================
// SECTION 3: ENHANCE signup ENDPOINT (around line 400-450)
// ============================================================
// Find the signup endpoint and update it to check for duplicate emails:

app.post('/api/auth/signup', bodyParser.json(), (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  // ★ ADD THIS CHECK:
  const users = readUserData();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already registered. Please login or use another email.' });
  }
  // ★ END ADD

  // Continue with existing signup code...
});


// ============================================================
// SECTION 4: INITIALIZE ALL ENDPOINTS (before app.listen())
// ============================================================
// Add this section right before app.listen(PORT, ...)

// -------- Helper functions for file I/O --------
const readFilesMeta = () => {
  try {
    return JSON.parse(fs.readFileSync('./data/files.json', 'utf8')) || [];
  } catch {
    return [];
  }
};

const writeFilesMeta = (files) => {
  fs.writeFileSync('./data/files.json', JSON.stringify(files, null, 2));
};

// -------- Register all security endpoints --------
securityIntegration.initChatEndpoints(app, adminAuth, bodyParser);
securityIntegration.initAccessRequestEndpoints(app, adminAuth, bodyParser);
securityIntegration.initSecurityEndpoints(app, adminAuth, bodyParser);
securityIntegration.initCatalogPDFEndpoints(app, adminAuth, bodyParser, readFilesMeta, writeFilesMeta);

// -------- Optional: Add health check endpoint --------
app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// ============================================================
// SECTION 5: CREATE DATA/CHATS.JSON FILE
// ============================================================
// Run this in terminal to initialize the chats storage:
// 
// cat > /workspaces/SmartInvest-/data/chats.json << 'EOF'
// []
// EOF
//
// Or add this code after app.use(firewall.middleware()):
// 
const initDataFiles = () => {
  const dataDir = './data';
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  const chatsFile = path.join(dataDir, 'chats.json');
  if (!fs.existsSync(chatsFile)) {
    fs.writeFileSync(chatsFile, JSON.stringify([], null, 2));
  }
};
initDataFiles();
//
// End optional code


// ============================================================
// SUMMARY: What Gets Added
// ============================================================

/*
✅ Data Protection (from data-protection.js):
   - DataCompartment: Encrypted storage with access logs
   - UserDataProtection: User data wrapper (sanitized vs admin views)
   - AccessRequest: Request-based approval system
   - SecurityFirewall: IP/email rate limiting (100 global, 50 per user)
   - PrivacyControl: Sensitive field hiding, non-tracking
   - SecureCache: TTL cache with role-based access
   - DataBreachPrevention: Audit trail + anomaly detection

✅ Chat Support (from chat-support.js):
   - User can create support conversations
   - Admin can assign, reply, close, search chats
   - Persistent storage + real-time notifications
   - 8 new endpoints

✅ Access Requests:
   - Users request access to sensitive data
   - Admin approves (24-hr access) or denies
   - Full audit trail
   - 5 new endpoints

✅ Security & Firewall:
   - Admin can block/unblock IPs and emails
   - View breach alerts and audit logs
   - Security status dashboard
   - 5 new endpoints

✅ Catalog PDF Metadata:
   - Admin adds PDF info to catalog items
   - Public API shows catalog with PDF details
   - 2 new endpoints

✅ Privacy & Non-Tracking:
   - All responses auto-sanitized
   - IPs anonymized (192.168.x.x → 192.168.0.0)
   - Emails hashed in logs
   - No tracking pixels/headers
   - Sensitive fields always hidden from users

✅ Enforcement:
   - Single email per user (checked at signup)
   - Data access requires admin approval
   - Firewall blocks suspicious activity automatically
   - 15-minute lockout on rate limit violations


TOTAL NEW ENDPOINTS: 23
- Chat: 8 endpoints
- Access Requests: 5 endpoints
- Security: 5 endpoints
- Catalog PDFs: 2 endpoints
- Health: 1 endpoint
- Admin/Misc: 2 endpoints
*/

// ============================================================
// VERIFICATION
// ============================================================
// After making changes, verify with:
//
// 1. Syntax check:
//    node --check server.js
//
// 2. Start server and test:
//    npm start
//    
// 3. Test endpoints:
//    curl http://localhost:3000/api/health
//    curl http://localhost:3000/api/catalog-with-pdfs
//
// 4. Test firewall (should block after 100 reqs):
//    for i in {1..105}; do curl http://localhost:3000/api/health; done | tail -5
