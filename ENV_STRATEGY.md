# SmartInvestsi - Environment Variables Strategy

## 🎯 Overview

This document explains which variables should be in **Netlify** vs **`.env` (repo)**. Keeping this separation prevents:
- ❌ Hardcoded secrets exposure
- ❌ Page load errors from missing env vars
- ❌ Accidental commits of sensitive data
- ✅ Clean separation of concerns
- ✅ Faster deployments

---

## 📊 Quick Reference Matrix

| Variable | Type | Location | Frontend Access | Reason |
|----------|------|----------|------------------|--------|
| `JWT_SECRET` | Secret | Netlify Only | ❌ No | Sign/verify tokens server-side only |
| `SUPABASE_ANON_KEY` | Public | Repo + Netlify | ✅ Yes | Client-side Supabase queries |
| `DATABASE_URL` | Secret | Netlify Only | ❌ No | Backend database connection |
| `PAYPAL_CLIENT_ID` | Public | Repo + Netlify | ✅ Optional | PayPal SDK initialization |
| `PAYPAL_CLIENT_SECRET` | Secret | Netlify Only | ❌ No | Backend payment processing |
| `HCAPTCHA_SITEKEY` | Public | Repo (.html) | ✅ Yes | Client-side form validation |
| `APP_URL` | Public | Repo (config) | ✅ Yes | Application domain |

---

## 🔐 NETLIFY ENVIRONMENT VARIABLES (Secret Management)

### Set in: Netlify Dashboard → Site Settings → Build & Deploy → Environment

**NEVER commit these to repository:**

```env
# 🔑 Authentication & Secrets (32+ chars each)
JWT_SECRET=your-64-hex-characters-here
JWT_REFRESH_SECRET=your-64-hex-characters-here
SESSION_SECRET=your-64-hex-characters-here

# 📊 Database (Connection String with credentials)
DATABASE_URL=postgresql://user:password@host:5432/db?schema=public
DIRECT_URL=postgresql://user:password@host:5432/db

# 🔐 Supabase (Service Role - Backend Only!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_PASSWORD=your-db-password

# 💳 Payment Processing (Secret Keys)
PAYPAL_CLIENT_SECRET=secret_key_from_paypal
PAYPAL_WEBHOOK_ID=webhook_id_from_paypal
MPESA_CONSUMER_KEY=your-key-from-safaricom
MPESA_CONSUMER_SECRET=your-secret-from-safaricom
STRIPE_SECRET_KEY=sk_live_your_stripe_secret

# 📧 Email (SMTP credentials)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend@yourdomain.com
SMTP_PASS=re_your_api_key

# 🤖 Third-party Secrets
HCAPTCHA_SECRET=your-hcaptcha-secret
CHATBASE_API_KEY=your-chatbase-api-key
SENTRY_DSN=https://your-sentry-dsn@sentry.io/id
RECAPTCHA_SECRET_KEY=your-recaptcha-secret

# 🪙 Cryptocurrency (API Secrets)
CRYPTO_OKX_API_SECRET=your-okx-secret
CRYPTO_OKX_PASSPHRASE=your-okx-passphrase

# 🔄 Cache & Queue
REDIS_URL=rediss://default:password@host:port
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
EU_CENTRAL_1_QSTASH_TOKEN=your-qstash-token
US_EAST_1_QSTASH_TOKEN=your-qstash-token

# 👤 Admin Access
ADMIN_FALLBACK_KEY=your-admin-key
ADMIN_REG_SECRET=your-admin-registration-secret
```

**Total: ~25-30 secret variables**

---

## 📂 REPOSITORY CONFIGURATION (In `.env.example` & `src/config.ts`)

### Safe to commit - public & non-sensitive:

```env
# ✅ Frontend-Safe Public Keys
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_ANON_KEY=same-as-above

# ✅ Public Payment Keys
PAYPAL_CLIENT_ID=your-public-client-id
PAYPAL_MODE=sandbox
HCAPTCHA_SITEKEY=your-public-hcaptcha-sitekey

# ✅ Configuration & URLs
NODE_ENV=development
APP_URL=https://smartinvestsi.netlify.app
LOG_LEVEL=info
PORT=3000

# ✅ Crypto Configuration (Non-secret)
CRYPTO_OKX_API_KEY=your-okx-api-key
CRYPTO_ASSET_SYMBOL=BTC,ETH,USDT
CRYPTO_CHAIN_ID=1

# ✅ Rate Limiting Defaults
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW=15

# ✅ Feature Flags
TEST_MODE=false
ENABLE_MONITORING=true
```

**Total: ~15-20 public variables**

---

## 📋 Netlify Environment Variables Checklist

### Step 1: Get Your Secrets
Collect from:
- PayPal Developer Dashboard
- Safaricom Daraja Portal
- Stripe Dashboard
- Supabase Dashboard
- hCaptcha Portal
- Email service provider (Resend, SendGrid, etc.)

### Step 2: Set in Netlify

```bash
# Via CLI
netlify env:set JWT_SECRET "$(openssl rand -hex 32)"
netlify env:set DATABASE_URL "your-db-url"
netlify env:set PAYPAL_CLIENT_SECRET "your-secret"
# ... continue for all secrets

# Or via Dashboard:
# 1. Go to Netlify Dashboard
# 2. Site Settings → Build & Deploy → Environment
# 3. Add each variable one by one
# 4. Click "Save"
```

### Step 3: Verify

```bash
netlify env:list
```

Should show all your secret variables (values hidden for security).

---

## 🛡️ Frontend Security

### ✅ SAFE to expose in frontend:
- `SUPABASE_ANON_KEY` (limited row-level security)
- `HCAPTCHA_SITEKEY` (public verification key)
- `PAYPAL_CLIENT_ID` (public client ID)
- `NEXT_PUBLIC_*` variables

### ❌ NEVER expose in frontend:
- JWT_SECRET
- Database passwords
- Payment SECRET keys
- API secrets
- Session secrets
- Webhook IDs
- Service role keys

---

## 🔧 Configuration File Structure

### Recommended: `src/config.ts`

```typescript
// PUBLIC - Safe for frontend
export const PUBLIC_CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  HCAPTCHA_SITEKEY: process.env.HCAPTCHA_SITEKEY,
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  APP_URL: process.env.APP_URL,
} as const;

// BACKEND ONLY - Never expose
export const SECRET_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

// Type-safe access
export const getPublicConfig = () => PUBLIC_CONFIG;
export const getSecretConfig = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Cannot access secrets from frontend!');
  }
  return SECRET_CONFIG;
};
```

---

## 📝 HTML Files - Safe Usage

### ✅ Safe in HTML:
```html
<script>
  // From Netlify env (public-facing)
  const config = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hcaptchaSitekey: document.getElementById('hcaptcha-config')?.dataset.sitekey
  };
</script>
```

### ❌ Never in HTML:
```html
<!-- DON'T DO THIS -->
<script>
  const apiSecret = 'sk_live_xxx'; // ❌ Hardcoded!
  const dbPassword = 'password123'; // ❌ Exposed!
  const jwtSecret = process.env.JWT_SECRET; // ❌ Can't access from frontend!
</script>
```

---

## 🚀 Deployment Workflow

### Local Development
```bash
# 1. Copy template
cp .env.example .env

# 2. Fill ONLY public variables
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
# ... other public vars

# 3. Secrets come from Netlify at deploy time
npm run dev
```

### Production (Netlify)
```bash
# 1. All secrets already in Netlify
# 2. Public vars in .env.example (repo)
# 3. Deploy automatically pulls both
netlify deploy --prod
```

---

## ✅ Pre-Deployment Checklist

- [ ] All sensitive variables moved to Netlify
- [ ] `.env` has ONLY public/example values
- [ ] No hardcoded API keys in JavaScript
- [ ] No database passwords in repo
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NOT in repo
- [ ] `.env.production` removed from git
- [ ] `netlify env:list` shows all secrets
- [ ] Frontend can access `NEXT_PUBLIC_*` variables
- [ ] Backend can access all variables
- [ ] Tests pass locally and in CI/CD

---

## 🔄 Rotating Secrets

When you need to rotate a secret:

```bash
# 1. Generate new secret
JWT_SECRET=$(openssl rand -hex 32)

# 2. Update in Netlify
netlify env:set JWT_SECRET "$JWT_SECRET"

# 3. Redeploy
netlify deploy --prod --build

# 4. Verify old secret no longer works
# 5. Delete old secret from service (if applicable)
```

---

## 📞 Troubleshooting

### Issue: "process.env.DATABASE_URL is undefined"
**Cause**: Variable not set in Netlify  
**Fix**: 
```bash
netlify env:set DATABASE_URL "your-url"
netlify deploy --prod
```

### Issue: Frontend can't access SUPABASE_ANON_KEY
**Cause**: Variable name missing `NEXT_PUBLIC_` prefix  
**Fix**: 
```bash
# In .env or Netlify:
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # ✅ Correct
SUPABASE_ANON_KEY=...              # ❌ Not accessible in frontend
```

### Issue: Secrets visible in source code
**Cause**: Hardcoded in JavaScript  
**Fix**: Move to environment variables and use at build/runtime

---

## 📚 References

- [Netlify Environment Variables](https://docs.netlify.com/build-release-manage/environment-variables/)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [12 Factor App - Config](https://12factor.net/config)

---

**Last Updated**: June 2026  
**Version**: 1.0
