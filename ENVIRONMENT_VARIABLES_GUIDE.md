# Environment Variables Management Guide for SmartInvest

## Overview
This file provides a **complete, centralized reference** for all environment variables used in the SmartInvest project. It specifies:

- **What**: Each variable's purpose and usage
- **Where**: Exact location to set it (Netlify, .env.local, etc.)
- **Type**: Expected format/value type
- **Required**: Mandatory for production
- **Default**: Fallback value (if any)
- **Source Files**: Where it's referenced in code

Variables are grouped by **category** for easy management.

## 1. Database & Prisma (Critical)
Set in **Netlify Dashboard** (all environments) + `.env.local` for local dev.

| Variable | Type | Required | Default | Purpose | Files |
|----------|------|----------|---------|---------|-------|
| `DATABASE_URL` | String (PostgreSQL URL) | ✅ Yes | None | Prisma/Supabase primary DB connection | `prisma/schema.prisma`, `src/lib/db-client.ts`, `prisma/prisma.config.ts` |
| `DIRECT_URL` | String (PostgreSQL direct URL) | ❌ Optional | None | Prisma direct connection (bypasses connection pool) | `prisma/prisma.config.ts` |
| `NETLIFY_DB_URL` | String | ❌ Fallback | None | Netlify DB fallback (Supabase/Postgres) | `src/config.ts` |

**Local Setup**:
```
# .env.local
DATABASE_URL=\"postgresql://user:pass@localhost:5432/smartinvest?schema=public\"
DIRECT_URL=\"postgresql://user:pass@localhost:5432/smartinvest\"
```

## 2. Authentication & Security (Critical)
Set in **Netlify Dashboard** (all environments) + `.env.local`.

| Variable | Type | Required | Default | Purpose | Files |
|----------|------|----------|---------|---------|-------|
| `JWT_SECRET` | String (64+ hex chars) | ✅ Yes | `fallback-secret-change-in-prod` (INVALID for prod) | JWT signing/refresh tokens | `netlify/functions/auth.ts`, `src/server.ts` |
| `JWT_REFRESH_SECRET` | String (64+ hex chars) | ✅ Yes | Throws error | Refresh token signing | `netlify/functions/auth.ts` |
| `SESSION_SECRET` | String (64+ hex chars) | ✅ Yes | None | Session encryption | Existing docs (ENV_VARS.md) |
| `ADMIN_REG_SECRET` | String | ❌ Optional | None | Admin user registration override | `src/server.ts` |
| `ADMIN_FALLBACK_KEY` | String | ❌ Crisis | None | Emergency auth fallback | `src/server.ts` |

**Generate Secrets**:
```bash
openssl rand -hex 32  # For JWT_SECRET
```

## 3. Payments (Critical for Features)
Set in **Netlify Dashboard** + service dashboards (PayPal, etc.).

| Variable | Type | Required | Default | Purpose | Files |
|----------|------|----------|---------|---------|-------|
| `PAYPAL_CLIENT_ID` | String | ✅ For PayPal | Test mode | PayPal app ID | `netlify/functions/createOrder.ts` |
| `PAYPAL_CLIENT_SECRET` | String | ✅ For PayPal | Test mode | PayPal app secret | `netlify/functions/createOrder.ts` |
| `PAYPAL_MODE` | `sandbox`/`live` | ❌ | `sandbox` | PayPal environment | `src/config.ts` |
| `MPESA_CONSUMER_KEY` | String | ✅ For M-Pesa | None | Safaricom Daraja key | Docs (inferred) |
| `MPESA_CONSUMER_SECRET` | String | ✅ For M-Pesa | None | Safaricom Daraja secret | Docs (inferred) |

## 4. Email & Notifications
Set in **Netlify Dashboard** + email provider dashboard.

| Variable | Type | Required | Default | Purpose | Files |
|----------|------|----------|---------|---------|-------|
| `SMTP_HOST` | String | ✅ Email | None | SMTP server (Resend/SendGrid) | `ENV_VARS.md` |
| `SMTP_PORT` | Number (587) | ✅ Email | None | SMTP port | `ENV_VARS.md` |
| `SMTP_USER` | String | ✅ Email | None | SMTP username | `ENV_VARS.md` |
| `SMTP_PASS` | String | ✅ Email | None | SMTP password/app key | `ENV_VARS.md` |
| `SMTP_FROM` | Email | ✅ Email | None | From address | `ENV_VARS.md` |

## 5. CAPTCHA & Fraud Prevention
| Variable | Type | Required | Default | Purpose | Files |
|----------|------|----------|---------|---------|-------|
| `HCAPTCHA_SITEKEY` | String | ✅ Login | None | Frontend hCaptcha key | HTML + docs |
| `HCAPTCHA_SECRET` | String | ✅ Login | None | Backend hCaptcha secret | `signup.ts` (inferred) |

## 6. Monitoring & Security (Recommended)
| Variable | Type | Required | Default | Purpose | Files |
|----------|------|----------|---------|---------|-------|
| `SENTRY_DSN` | URL | ❌ | Hardcoded | Sentry error tracking | `src/server.ts`, `netlify/functions/sentry-init.ts` |
| `ALLOWED_ORIGINS` | CSV origins | ✅ Prod | Localhost | CORS whitelist | `src/server.ts` |
| `ADMIN_IPS` | CSV IPs | ❌ | None | Admin IP whitelist | Docs |
| `RATE_LIMIT_MAX_REQUESTS` | Number | ❌ | 100 | Rate limiting | Docs |

## 7. Supabase Fallback (Legacy/Emergency)
| Variable | Type | Required | Default | Purpose | Files |
|----------|------|----------|---------|---------|-------|
| `SUPABASE_URL` | URL | ❌ Fallback | None | Supabase project URL | `src/server.ts` |
| `SUPABASE_ANON_KEY` | String | ❌ Fallback | None | Public anon key | `src/server.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | String | ❌ Fallback | None | Service role key | Docs |

## 8. Other Services (Optional/Feature Flags)
| Variable | Type | Required | Default | Purpose | Files |
|----------|------|----------|---------|---------|-------|
| `REDIS_URL` | URL | ❌ Redis | None | Rate limiting/caching | Docs |
| `STRIPE_SECRET_KEY` | String | ❌ Stripe | None | Stripe fallback | Docs |
| `CRYPTO_OKX_API_KEY` | String | ❌ Crypto | None | OKX exchange | Docs |
| `ADMIN_EMAIL` | Email | ❌ | `smartinvestsi254@gmail.com` | Admin notifications | `src/config.ts` |
| `TEST_MODE` | Boolean | ❌ | `false` | Disable real payments | `netlify/functions/createOrder.ts` |
| `SLOW_REQUEST_THRESHOLD_MS` | Number | ❌ | `2000` | Performance monitoring | `src/server.ts` |

## Setup Instructions

### 1. Netlify (Production/Deploy)
```
Netlify Dashboard → Site Settings → Environment Variables
→ Add ALL \"Required\" variables from tables above
→ Set scope: All scopes (Production, Preview, Branch deploys)
→ Deploy triggers automatically
```

### 2. Local Development (`.env.local`)
```
cp .env.example .env.local  # Existing file
# Fill ALL required vars above
# Use test/sandbox keys only
npm run dev  # or netlify dev
```

### 3. Verification Commands
```bash
# Check Netlify vars (CLI)
netlify env:list --context production

# Local validation script
node -e \"console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 'MISSING')\"

# Health check endpoints after deploy
curl https://your-site.netlify.app/.netlify/functions/health
curl https://your-site.netlify.app/health
```

### 4. Priority Order (If Conflicts)
1. **Netlify Dashboard** (production runtime) ← **PRIMARY**
2. `.env.local` (local dev only)
3. `.env.example` (documentation/templates only)
4. Code fallbacks (error if missing in prod)

## Security Notes
- ✅ **Never commit real values** (`.env*` in `.gitignore`)
- ✅ **Rotate on leaks**: JWT_SECRET, payment keys immediately
- ✅ **Different per env**: Dev/sandbox vs Production
- ✅ **Minimum lengths**: JWT_SECRET ≥64 chars
- ✅ **HTTPS only**: Secure cookies/tokens in prod
- ⚠️ **Audit changes**: Use pre-commit hooks for secrets scanning

## Troubleshooting
| Issue | Solution |
|-------|----------|
| `JWT_SECRET missing` | Add to Netlify + `.env.local` |
| `DATABASE_URL invalid` | Check PostgreSQL/Supabase connection |
| `PayPal 401` | Verify CLIENT_ID/SECRET in PayPal dashboard |
| `Login fails` | Check JWT_SECRET length ≥32 + no special chars |
| `CORS errors` | Add domain to `ALLOWED_ORIGINS` |

**Generated from code analysis**: `src/*`, `netlify/functions/*`, `prisma/*`, existing docs.

---

**Last Updated**: Auto-generated from codebase  
**Total Vars**: 25+ (15 critical)  
**Status**: ✅ Complete reference - no more \"where do I put this?\" questions!
