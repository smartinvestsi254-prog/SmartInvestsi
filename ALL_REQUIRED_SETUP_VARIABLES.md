# ALL_REQUIRED_SETUP_VARIABLES.md

## Complete List of Environment Variables for SmartInvest Setup

This file consolidates **ALL variables** needed to finish the project setup from code analysis, docs, and existing files. Set these in **Netlify > Site settings > Environment variables** (all scopes: Production, Deploy preview, Branch deploys).

### Critical (Required for Basic Functionality)
| Variable | Source | Description | Example/Notes |
|----------|--------|-------------|---------------|
| `JWT_SECRET` | Netlify env table.txt, login.ts, signup.ts, variables-catalog.md | JWT token signing (32+ random chars) | `openssl rand -hex 32` |
| `SESSION_SECRET` | Netlify env table.txt, Secrets patterns.json | Session encryption | `openssl rand -hex 32` |
| `MONGODB_URI` | src/lib/mongodb.ts, Netlify env table.txt, Secrets patterns.json | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/smartinvest` |
| `DATABASE_URL` | prisma/schema.prisma (inferred), netlify/functions/lib/prisma.ts | Prisma/PostgreSQL DB | `postgresql://user:pass@host/db` |
| `PAYPAL_CLIENT_ID` | paypalWebhook.ts, Netlify env table.txt | PayPal app ID | From PayPal Developer Dashboard |
| `PAYPAL_CLIENT_SECRET` | paypalWebhook.ts, Netlify env table.txt | PayPal app secret | From PayPal Developer Dashboard |
| `PAYPAL_MODE` | paypalWebhook.ts | `sandbox` or `live` | `sandbox` |
| `PAYPAL_WEBHOOK_ID` | paypalWebhook.ts | Webhook subscription ID | From PayPal webhook setup |
| `MPESA_CONSUMER_KEY` | Netlify env table.txt, manual-mpesa-payment.ts (inferred), Secrets patterns.json | M-Pesa API key | From Safaricom Daraja |
| `MPESA_CONSUMER_SECRET` | Netlify env table.txt, Secrets patterns.json | M-Pesa API secret | From Safaricom Daraja |
| `HCAPTCHA_SECRET` | signup.ts | hCaptcha verification | From hCaptcha dashboard |
| `CEO_ACCOUNT_ID` | manual-mpesa-payment.ts | Manual payment CEO ID | `ceo_manual` or user ID |

### Database/Auth (Supabase/Prisma Fallbacks)
| Variable | Source | Notes |
|----------|--------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify env table.txt, Secrets patterns.json | Supabase admin key |
| `SUPABASE_DB_PASSWORD` | Netlify env table.txt | Supabase DB pass |
| `SUPABASE_ANON_KEY` | Secrets patterns.json | Public Supabase key (if used) |

### Email/SMTP
| Variable | Source | Notes |
|----------|--------|-------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | ENVIRONMENT_VARIABLES.md, inferred mailer.js | Resend/SendGrid/Mailgun |

### Payments/Crypto (Optional but Recommended)
| Variable | Source | Notes |
|----------|--------|-------|
| `CRYPTO_OKX_API_KEY`, `CRYPTO_OKX_API_SECRET` | Netlify env table.txt | OKX crypto exchange |
| `STRIPE_SECRET_KEY` | ENVIRONMENT_VARIABLES.md | Stripe fallback |

### Features/Rate Limiting (Defaults OK)
- `RATE_LIMIT_MAX_REQUESTS=100`, `RATE_LIMIT_WINDOW_MS=900000`
- `FEATURE_PREMIUM_ACCESS=true`, etc. (from ENVIRONMENT_VARIABLES.md)

### Setup Instructions (Copy-Paste Ready)
1. **Generate secrets**:
   ```
   JWT_SECRET=$(openssl rand -hex 32)
   SESSION_SECRET=$(openssl rand -hex 32)
   ```
2. **Add to Netlify**: Copy table above → Netlify dashboard.
3. **Services**:
   - MongoDB Atlas: Create cluster → Get `MONGODB_URI`
   - PayPal: Developer app → Sandbox credentials
   - hCaptcha: Site key + secret (public HTML too)
   - Prisma: `npx prisma db push` after `DATABASE_URL`
4. **Deploy**: `netlify deploy --prod --build=build.sh`
5. **Test**: Visit `/login`, `/crypto-trading`, check functions logs.

**Total: 15+ critical vars**. Project runs with these. No more placeholders/errors!

---

Created by consolidating:
- `Netlify env table.txt` (core table)
- `ENVIRONMENT_VARIABLES.md` (full list)
- `variables-catalog.md` (JS vars, but focused env)
- Code scans: `login.ts`, `signup.ts`, `paypalWebhook.ts`, `mongodb.ts`, `Secrets patterns.json`

