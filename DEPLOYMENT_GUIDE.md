# SmartInvestsi - Netlify + Supabase Deployment Guide

## Architecture Overview

```
┌─────────────────┐
│  Netlify CDN    │ (Static HTML/CSS/JS)
│  Functions      │ (Node.js serverless)
└────────┬────────┘
         │
         ├─────────────────────────┐
         │                         │
    ┌────▼────────┐          ┌────▼──────┐
    │  Supabase   │          │ MongoDB   │
    │ PostgreSQL  │ (Primary)│ (Fallback)│
    │  (Auth)     │          │(Cache)    │
    └─────────────┘          └───────────┘
```

## Prerequisites

1. **Netlify Account**: https://app.netlify.com
2. **Supabase Project**: https://app.supabase.com (PostgreSQL database)
3. **MongoDB Cluster** (optional): https://cloud.mongodb.com
4. **GitHub Repository**: Connected to Netlify
5. **Environment Variables**: Configure in Netlify dashboard

## Step 1: Set Up Supabase

### Create Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Select:
   - Region: Choose closest to users
   - Database Password: Generate strong password
   - Pricing: Free tier fine for MVP

### Get Connection Strings
In Supabase Project Settings → Database:
- Copy "Connection string" → DATABASE_URL
- Look for "Direct connection string" → DIRECT_URL

### Enable Auth
In Supabase Authentication:
- Enable Email/Password provider
- Set JWT expiry: 3600 seconds (1 hour)
- Set Refresh token expiry: 604800 seconds (7 days)
- Get: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

### Run Migrations
```bash
# Sync Prisma schema with Supabase
npm run prisma:migrate:deploy

# Check in Supabase dashboard → SQL Editor
```

## Step 2: Set Up MongoDB (Optional Fallback)

### Create Cluster
1. Go to https://cloud.mongodb.com
2. Click "Create" → "Deploy a Cloud Database"
3. Select Free tier
4. Choose region (same as Supabase if possible)
5. Create database user
6. Get connection string → MONGODB_URI

### Create Collections (Optional)
Mongoose will auto-create, but you can pre-create:
- `sessions` - Session storage
- `cache` - Market data cache
- `transactions` - Transaction log

## Step 3: Configure Netlify

### Connect GitHub
1. Go to https://app.netlify.com
2. Click "Connect to Git" → "GitHub"
3. Authorize and select repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

### Set Environment Variables
In Netlify:
1. Go to Site Settings → Build & Deploy → Environment
2. Add all variables from `.env.example`:

```env
# Database - Supabase
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[db]
DIRECT_URL=postgresql://[user]:[password]@[host]:5432/[db]

# Supabase Keys
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# JWT Secrets (generate with: openssl rand -hex 32)
JWT_SECRET=[64-char-random]
JWT_REFRESH_SECRET=[64-char-random]
SESSION_SECRET=[64-char-random]

# MongoDB (optional)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smartinvest

# Payments
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox

# Other services
STRIPE_SECRET_KEY=sk_test_...
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
CHATBASE_API_KEY=...
SENTRY_DSN=...

# App Config
NODE_ENV=production
LOG_LEVEL=info
ALLOWED_ORIGINS=https://yourdomain.com,https://smartinvestsi.netlify.app
```

## Step 4: Deploy

### First Deployment
```bash
# Push to main branch
git push origin main

# Netlify auto-deploys!
# Watch build in Netlify dashboard
```

### Verify Deployment
1. Check Netlify Deployments tab
2. Click live URL
3. Test API: `https://[site].netlify.app/api/market/quote/BTC
4. Check logs: Netlify → Functions → View logs

### Troubleshooting Deployment

**Build fails**
```bash
# Check local build works
npm run build

# Check env vars are set in Netlify
# Look for yellow warnings in build log
```

**Database connection error**
```bash
# Verify DATABASE_URL is correct
# Check Supabase hasn't auto-rotated credentials
# Test local: npm run dev
```

**Functions not working**
```bash
# Check netlify/functions are compiled
# Verify TS in functions are in netlify/tsconfig.json
# Check function log errors in Netlify dashboard
```

## Step 5: Post-Deployment

### Health Check
```bash
GET https://[site].netlify.app/.netlify/functions/health
# Should return: { "status": "ok" }
```

### Database Verification
1. Supabase dashboard → SQL Editor
2. Run: `SELECT * FROM "User" LIMIT 1;`
3. Should show schema tables

### Monitor Logs
1. Netlify → Functions → View logs
2. Sentry (if configured) → Issues
3. Winston logs in Netlify logs

### Enable Analytics
1. Netlify Analytics → Enable (optional, paid)
2. Watch real-time metrics

## Production Checklist

- [ ] Environment variables set in Netlify
- [ ] Database migrations applied (prisma:migrate:deploy)
- [ ] Email service configured (SMTP_*)
- [ ] Payment processors (PayPal, Stripe) in live mode
- [ ] SSL/HTTPS enabled (automatic on Netlify)
- [ ] Custom domain configured
- [ ] Sentry error tracking active
- [ ] Rate limiting enabled
- [ ] Security headers verified
- [ ] CORS properly set
- [ ] Backups configured for Supabase
- [ ] MongoDB backups enabled (if used)
- [ ] Monitoring alerts set up

## Scaling & Optimization

### Netlify
- Automatic CDN caching
- Edge Functions available (for low-latency code)
- Concurrency limits: 1000 concurrent functions

### Supabase
- Upgrade plan for more connections
- Use connection pooling (built-in)
- Monitor query performance
- Enable auto backups

### MongoDB (if used)
- Add replica set for redundancy
- Enable sharding for scale
- Index important fields

## Debugging

### View Function Logs
```bash
# Real-time
npm run dev

# Netlify dashboard
# Site → Functions → View logs
```

### Check Database
```bash
# Supabase
1. Go to SQL Editor
2. Run queries
3. View table structure

# MongoDB
npm install -g mongodb-compass
# Connect with MONGODB_URI
```

### Test API Locally
```bash
npm run dev
curl http://localhost:3000/api/market/quote/BTC
```

## Continuous Deployment

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run validate
      # Netlify auto-deploys on push
```

### Preview Deployments
Netlify auto-creates preview URLs for pull requests.

## Support & Resources

- Netlify Docs: https://docs.netlify.com
- Supabase Docs: https://supabase.com/docs
- MongoDB Docs: https://docs.mongodb.com
- Prisma Docs: https://www.prisma.io/docs
