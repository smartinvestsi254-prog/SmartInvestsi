# Complete SmartInvestsi Environment Variables

**Netlify Dashboard > Site settings > Environment variables**

```
# Database
DATABASE_URL=postgresql://user:pass@host/db?pgbouncer=true

# CAPTCHA
HCAPTCHA_SITEKEY=your-sitekey
HCAPTCHA_SECRET=your-secret

# Email
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=no-reply@domain.com
SMTP_PASS=re_xxxxxx
SMTP_FROM=no-reply@smartinvestsi.com

# Auth
JWT_SECRET=64-random-hex-openssl-rand-hex-32

# Payments
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Redis (optional rate limit)
REDIS_URL=rediss://default:pass@upstash.io:6379

# Fraud (optional)
FRAUD_API_KEY=...

# Admin (optional)
ADMIN_IPS=203.0.113.0/24,198.51.100.0/24
```

**Setup Steps:**
1. Get keys from services
2. Add to Netlify
3. Replace `YOUR_HCAPTCHA_SITEKEY` in HTML
4. `npm i dependencies`
5. `netlify deploy --prod`

No duplicates, all required for 100% security!

