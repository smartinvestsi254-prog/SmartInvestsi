# SmartInvestsi - Troubleshooting & Common Issues

## 🔍 General Issues

### Issue: "Cannot find module" errors

**Symptoms:**
- `Error: Cannot find module 'express'`
- `Error: Cannot find module '@prisma/client'`

**Solutions:**
```bash
# Option 1: Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install

# Option 2: Install specific package
npm install express

# Option 3: Check if dependencies are listed in package.json
cat package.json | grep '"dependencies"' -A 30

# Option 4: Ensure all packages have compatible versions
npm list --depth=0
```

---

### Issue: "EACCES: permission denied" on Linux/macOS

**Symptoms:**
- `npm ERR! EACCES: permission denied`
- Permission issues during npm install

**Solutions:**
```bash
# Option 1: Fix npm permissions (Recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc

# Option 2: Use sudo (Not recommended)
sudo npm install -g --save-dev

# Option 3: Change npm directory permissions
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

---

## 💾 Database Issues

### Issue: "connect ECONNREFUSED" - Database connection failed

**Symptoms:**
- `Error: connect ECONNREFUSED 127.0.0.1:5432`
- Cannot connect to PostgreSQL

**Solutions:**
```bash
# Check if PostgreSQL is running
# macOS:
brew services list | grep postgres

# Linux:
sudo systemctl status postgresql

# Windows:
Get-Service PostgreSQL* | Select Name, Status

# Start PostgreSQL if not running
# macOS:
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

---

### Issue: "no such table" after migration

**Symptoms:**
- `error: relation "User" does not exist`
- Database schema not created

**Solutions:**
```bash
# Run migrations
npm run prisma:migrate:dev

# Reset database (⚠️ Deletes all data!)
npm run prisma:migrate:reset

# Verify schema was created
npm run prisma:studio  # Opens GUI to verify tables

# Check migration status
npx prisma migrate status
```

---

### Issue: Prisma Client generation fails

**Symptoms:**
- `Error: @prisma/client' not found`
- TypeScript compilation errors related to Prisma

**Solutions:**
```bash
# Regenerate Prisma Client
npm run prisma:generate

# Or manually:
npx prisma generate

# Clear Prisma cache
rm -rf node_modules/.prisma

# Reinstall with postinstall
npm install

# Verify schema.prisma is valid
npx prisma validate
```

---

## 🔐 Environment Variables Issues

### Issue: "Cannot find environment variable" errors

**Symptoms:**
- `Error: JWT_SECRET is not defined`
- Undefined environment variables

**Solutions:**
```bash
# Check .env file exists
ls -la .env

# Verify all required variables are set
cat .env | grep -E '^[A-Z_]+=' | wc -l

# Test specific variable
echo $JWT_SECRET

# Make sure .env is not in .gitignore interfering
grep '.env' .gitignore

# Ensure NODE_ENV is set
echo $NODE_ENV
export NODE_ENV=development
```

---

### Issue: .env not being loaded

**Symptoms:**
- Process.env variables are undefined
- Even though .env file exists

**Solutions:**
```bash
# Ensure dotenv is imported first in main file
// At TOP of src/server.ts
import dotenv from 'dotenv';
dotenv.config();

// Then import everything else
import express from 'express';

# Verify dotenv is installed
npm list dotenv

# Check for .env.local taking precedence
ls -la .env*
```

---

## 🏗️ Build Issues

### Issue: TypeScript compilation errors

**Symptoms:**
- `error TS7006: Parameter has an implicit 'any' type`
- Build fails with type errors

**Solutions:**
```bash
# Type check to see all errors
npm run type-check

# Generate Prisma types
npm run prisma:generate

# Update TypeScript definitions
npm install --save-dev @types/node@latest

# Fix type errors
npm run lint:fix

# Force rebuild
npm run build -- --force
```

---

### Issue: ESLint/Prettier conflicts

**Symptoms:**
- Code fails linting but Prettier wants to format differently
- Inconsistent formatting

**Solutions:**
```bash
# Format code properly
npm run format

# Then lint
npm run lint:fix

# Check configuration files
cat .eslintrc
cat .prettierrc

# Clear caches
rm -rf .eslintcache

# Reinstall dev dependencies
npm install --save-dev eslint prettier
```

---

## 🌐 Port & Network Issues

### Issue: "Port 3000 is already in use"

**Symptoms:**
- `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**
```bash
# Find and kill process on port 3000
# macOS/Linux:
lsof -i :3000
kill -9 <PID>

# Or:
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or use different port
PORT=3001 npm run dev

# Add to .env:
PORT=3001
```

---

### Issue: CORS errors in development

**Symptoms:**
- `Access to XMLHttpRequest has been blocked by CORS policy`
- Frontend can't reach backend

**Solutions:**
```bash
# Check CORS is configured in server
// In src/server.ts
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));

# Verify ALLOWED_ORIGINS in .env
grep ALLOWED_ORIGINS .env

# For development, allow localhost
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Restart server for changes to take effect
npm run dev
```

---

## 🔑 Authentication Issues

### Issue: JWT token validation fails

**Symptoms:**
- `Error: JsonWebTokenError: invalid token`
- Authentication always fails

**Solutions:**
```bash
# Verify JWT_SECRET is set and strong
echo $JWT_SECRET | wc -c  # Should be 64+ characters

# Regenerate if needed
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET" >> .env

# Check token in headers
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api

# Debug token creation
npm run dev  # Add console logs to auth functions
```

---

### Issue: Session cookies not persisting

**Symptoms:**
- User logs out after page refresh
- Session not saved

**Solutions:**
```bash
# Ensure SESSION_SECRET is set
echo $SESSION_SECRET

# Verify cookie-parser is configured
// In src/server.ts
import cookieParser from 'cookie-parser';
app.use(cookieParser(process.env.SESSION_SECRET));

# Check cookie settings
// Cookies must be configured for HTTPS in production
app.use(session({
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict'
}));

# Test in dev mode
NODE_ENV=development npm run dev
```

---

## 📧 Email Issues

### Issue: Emails not sending

**Symptoms:**
- `Error: connect ECONNREFUSED` for SMTP
- Emails appear to send but never arrive

**Solutions:**
```bash
# Verify SMTP credentials
grep SMTP .env

# Test SMTP connection
telnet smtp.resend.com 587

# Check Nodemailer configuration
// src/lib/mailer.ts
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

# Verify email isn't in spam
# Check SMTP provider dashboard (Resend, SendGrid, etc.)

# Add debugging
transporter.verify((error, success) => {
  if (error) console.error('SMTP Error:', error);
  else console.log('SMTP Ready:', success);
});
```

---

## 💳 Payment Processing Issues

### Issue: PayPal webhook not receiving events

**Symptoms:**
- Payment completes but no webhook callback
- Order status not updated

**Solutions:**
```bash
# Verify PAYPAL_MODE and URLs
grep PAYPAL .env

# Check webhook is registered
# Login to PayPal Developer Dashboard
# Settings → Webhooks → Verify your endpoint

# Ensure callback URL is accessible
# PAYPAL_RETURN_URL and PAYPAL_CANCEL_URL should be valid

# Enable logging
// netlify/functions/paypalWebhook.ts
console.log('Webhook received:', event);

# Test with ngrok (for local testing)
npm install -g ngrok
ngrok http 3000
# Use ngrok URL in PayPal webhook settings
```

---

### Issue: M-Pesa payment failures

**Symptoms:**
- `Error: Consumer key or secret invalid`
- Payment requests rejected

**Solutions:**
```bash
# Verify Safaricom credentials
grep MPESA .env

# Check credentials are valid
# Login to Daraja Developer Portal
# Apps → Your App → Copy credentials

# Verify API endpoint
# Sandbox: https://sandbox.safaricom.co.ke
# Production: https://api.safaricom.co.ke

# Check callback URL
# Must be publicly accessible HTTPS URL

# Test endpoint manually
curl -X POST https://sandbox.safaricom.co.ke/oauth/v1/generate \
  -u "YOUR_CONSUMER_KEY:YOUR_CONSUMER_SECRET"
```

---

## 🚀 Netlify Deployment Issues

### Issue: Functions not deploying

**Symptoms:**
- `Error: Could not find a valid build cache`
- Functions folder not recognized

**Solutions:**
```bash
# Ensure netlify.toml exists
ls -la netlify.toml

# Verify functions directory structure
ls -la netlify/functions/

# Build functions locally
npm run build:functions

# Check for TypeScript errors
npm run type-check

# Deploy with verbose output
netlify deploy --prod --debug

# Check Netlify build logs
# In Netlify Dashboard → Deploys → View deploy log
```

---

### Issue: Environment variables not available in functions

**Symptoms:**
- `process.env.DATABASE_URL is undefined` in functions
- Environment variables work locally but not on Netlify

**Solutions:**
```bash
# Ensure variables are set in Netlify
# Netlify Dashboard → Site Settings → Build & Deploy → Environment

# Or via CLI
netlify env:set JWT_SECRET "your-secret"
netlify env:list

# Verify secrets in netlify.toml
# Ensure they're NOT in toml (should be in Netlify dashboard)

# Redeploy after setting variables
netlify deploy --prod

# Check function can access variables
// netlify/functions/myFunction.ts
console.log('DATABASE_URL:', process.env.DATABASE_URL);
```

---

## 🧪 Testing Issues

### Issue: Tests fail with "Cannot find module"

**Symptoms:**
- `Cannot find module when running jest`
- `SyntaxError: Unexpected token`

**Solutions:**
```bash
# Install test dependencies
npm install --save-dev jest ts-jest @types/jest

# Create jest.config.js if missing
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
};

# Run specific test file
npm test -- src/__tests__/example.test.ts

# Run with verbose output
npm test -- --verbose

# Run with coverage
npm test -- --coverage
```

---

## 🔧 Development Tools

### Quick Diagnostic Script

```bash
#!/bin/bash
# save as diagnosis.sh

echo "=== SmartInvestsi Health Check ==="
echo ""

echo "1. Node Version:"
node --version

echo "2. npm Version:"
npm --version

echo "3. Git Status:"
git status

echo "4. Environment:"
echo "NODE_ENV=$NODE_ENV"
echo "PORT=$PORT"

echo "5. Database:"
echo "Testing database connection..."
npx prisma db execute --stdin < /dev/null && echo "✅ Database OK" || echo "❌ Database Error"

echo "6. TypeScript:"
npm run type-check 2>&1 | head -20

echo "7. Dependencies:"
npm list --depth=0 | head -20

echo "8. Environment Variables (counts):"
echo "Critical vars: $(grep -E '^(JWT|SESSION|DATABASE|SUPABASE|PAYPAL|MPESA)' .env | wc -l)"

echo ""
echo "=== Diagnostics Complete ==="
```

Run with:
```bash
chmod +x diagnosis.sh
./diagnosis.sh
```

---

## 📞 Getting More Help

1. **Check GitHub Issues**: https://github.com/smartinvestsi254-prog/SmartInvestsi/issues
2. **Read Documentation**: Review all `.md` files in repository
3. **Email Support**: support@smartinvestsi.netlify.app
4. **Stack Overflow**: Tag questions with `smartinvestsi`

---

## 🐛 Reporting Issues

When reporting a bug, include:

1. **Error message** (full stack trace)
2. **Steps to reproduce**
3. **Your environment:**
   ```bash
   node --version
   npm --version
   echo $NODE_ENV
   cat package.json | head -20
   ```
4. **Relevant logs** from console
5. **Screenshots** if applicable

---

**Last Updated**: June 2026  
**Version**: 1.0
