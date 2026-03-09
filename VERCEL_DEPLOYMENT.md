# Vercel Deployment Setup Guide - MANUAL DEPLOYMENT

## Overview

SmartInvest is configured for **manual full-stack deployment to Vercel**. You control when deployments happen via Vercel CLI or dashboard.

**Note:** Automatic CI/CD deployment has been disabled in this guide. You can optionally enable GitHub push-to-deploy in Vercel project settings if preferred.

## Architecture

- **Frontend**: Static HTML dashboards (30 files), CSS, JavaScript controllers
- **Backend**: Express.js server running as Node.js serverless functions on Vercel
- **Database**: Prisma ORM with PostgreSQL (Supabase recommended)
- **Deployment**: Manual via Vercel CLI or dashboard - you control when to deploy

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **GitHub Integration** (Optional): Connect your Vercel account to GitHub for one-click deploy via dashboard
3. **Vercel CLI** (Recommended): `npm install -g vercel`
4. **Project Created on Vercel**: At https://vercel.com/dashboard, create a new project linked to this repository

## Setup Steps (5 Minutes)

### 1. Create Vercel Project

Visit https://vercel.com/dashboard:
1. Click "New Project"
2. Import your GitHub repository
3. Leave "Build & Development Settings" on auto-detect
4. Click "Deploy"

### 2. Add Environment Variables (Production)

In Vercel project settings (`Settings → Environment Variables`), add:

**Required Variables:**

```
# JWT & Auth
JWT_SECRET=<generate-strong-32+-char-secret>
ADMIN_USER=<admin-email>
ADMIN_PASS=<strong-admin-password>

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?ssl=require
DIRECT_URL=postgresql://user:password@host/database?ssl=require

# Email (SMTP via Gmail)
SMTP_USER=smartinvestsi254@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=SmartInvest <smartinvestsi254@gmail.com>

# Payment Gateway - M-Pesa
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_business_shortcode
MPESA_PASSKEY=your_mpesa_passkey
MPESA_CALLBACK_SECRET=4aKurUuqnHH2BGcsP/jk3GYBHPB7skXOSzuGzhX+yZ4=
MPESA_CALLBACK_URL=https://yourdomain.com/api/pochi/callback

# Payment Gateway - PayPal
PAYPAL_CLIENT_ID=your_paypal_live_client_id
PAYPAL_CLIENT_SECRET=your_paypal_live_client_secret

# Payment Gateway - KCB
KCB_ACCOUNT_NAME=ELIJAH MUSYOKA DANIEL
KCB_ACCOUNT_NUMBER=your_kcb_account_number
KCB_BRANCH_CODE=your_kcb_branch_code

# Application URLs
APP_URL=https://your-production-domain.com
ALLOWED_ORIGINS=https://your-production-domain.com,https://www.your-production-domain.com

# Node Environment
NODE_ENV=production
PORT=3000
```

### 3. Configure Database (PostgreSQL with Supabase)

1. Create a Supabase project at https://supabase.com
2. Copy the connection string (connection pooling) and set as `DATABASE_URL`
3. Copy the direct connection string and set as `DIRECT_URL`
4. Run migrations: `npm run prisma:migrate:deploy`

## Deployment Workflow

### Manual Deployment - Your Control

You can deploy using either:

1. **Vercel CLI** (Local command-line)
2. **Vercel Dashboard** (Web UI)
3. **Push-to-Deploy** (Optional GitHub integration)

**Option 1: Deploy via Vercel CLI (Recommended)**

```bash
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Deploy to production
vercel deploy --prod

# Deploy to preview (staging)
vercel deploy

# View deployment
vercel --version
vercel help
```

**Option 2: Deploy via Vercel Dashboard**

1. Visit https://vercel.com/dashboard
2. Select your SmartInvest project
3. View recent commits and deployment options
4. Click "Deploy" next to the commit you want
5. Vercel builds and deploys automatically

**Option 3: Enable Push-to-Deploy (Optional)**

For automatic deployments on every push:
1. In Vercel project settings, enable "Automatically deploy on push"
2. Future pushes to main will auto-deploy (disable this setting to maintain manual control)

### ✅ Verification After Deploy

```bash
# Check deployment status
vercel deploy --confirm

# View live logs
vercel logs

# Test endpoint
curl https://your-domain.com/health
```

## Monitoring Deployments

### Vercel Dashboard
- Visit: https://vercel.com/dashboard
- View deployment history, logs, and real-time analytics
- Configure custom domains and SSL certificates
- View build logs and deployment details

## Troubleshooting

### Deployment Failed

1. **Check Vercel logs**: In Vercel dashboard, view deployment logs for detailed errors
2. **Verify environment variables**: Ensure all required variables are set in Vercel project settings
3. **Check database connection**: Test Prisma connection with `npm run prisma:generate`
4. **Test locally first**: Run `npm install && npm run build && npm start` to validate locally

### Build Issues

```bash
# Local testing before pushing
npm install
npm run build
npm start
```

### Database Migration Issues

```bash
# Generate Prisma client
npm run prisma:generate

# Run pending migrations
npm run prisma:migrate:deploy

# Reset database (⚠️ WARNING: Deletes all data)
npm run prisma:migrate:reset
```

## Commands

```bash
# Development
npm start           # Run locally at http://localhost:3000

# Build for production
npm run build       # Vercel runs this automatically

# Database
npm run prisma:generate          # Generate Prisma client
npm run prisma:migrate:dev       # Create/run migration locally
npm run prisma:migrate:deploy    # Run migrations on production database

# Testing
npm test           # Run test suite
npm run lint       # Run ESLint

# View local logs
npm start -- --log
```

## Project Structure

```
/
├── server.js                     # Main Express server
├── src/
│   ├── server.ts                # TypeScript Express server (alternative)
│   ├── routes/                  # API route handlers
│   ├── services/                # Business logic (email, payments, etc)
│   ├── workflows/               # Content workflow engine
│   └── incidents/               # Incident management
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── public/                       # Static assets (CSS, JS, images)
├── wwwroot/                      # wwwroot assets
├── *.html                        # Dashboard HTML files (30+ files)
├── vercel.json                  # Vercel configuration
└── .env.example                 # Environment variables template
```

## Next Steps

1. ✅ Create Vercel account at https://vercel.com
2. ✅ Create project and import this GitHub repository
3. ✅ Set up Supabase PostgreSQL database
4. ✅ Add environment variables to Vercel project settings
5. ✅ Run initial migration: `npm run prisma:migrate:deploy`
6. 🚀 Deploy when ready via `vercel deploy --prod` or Vercel dashboard

## Support

For issues or questions:
- Review Vercel dashboard deployment logs for build and runtime errors
- Test locally before deploying: `npm install && npm run build && npm start`
- Check environment variables are correctly set in Vercel project settings
