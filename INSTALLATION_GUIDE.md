# SmartInvestsi - Complete Setup & Installation Guide

## 📋 Prerequisites

- **Node.js**: >= 20.0.0 ([Download](https://nodejs.org/))
- **npm**: >= 10.0.0 (comes with Node.js)
- **Git**: Latest version
- **Database**: PostgreSQL or Supabase account
- **Text Editor**: VSCode or similar

## 🚀 Quick Start (5 minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/smartinvestsi254-prog/SmartInvestsi.git
cd SmartInvestsi
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install Netlify Functions dependencies
cd netlify/functions
npm install
cd ../..

# Install trading service dependencies (optional)
cd trading-service
npm install
cd ..
```

### 3. Setup Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit with your values
nano .env
# or
code .env
```

### 4. Generate Prisma Client
```bash
npm run prisma:generate
```

### 5. Setup Database
```bash
# For PostgreSQL/Supabase
npm run prisma:migrate:dev
```

### 6. Start Development Server
```bash
npm run dev
```

Your app is now running at `http://localhost:3000`

---

## 📦 All Dependencies

### Root Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@netlify/functions` | ^2.0.0 | Netlify serverless functions |
| `@prisma/client` | ^7.5.0 | Database ORM |
| `@sentry/node` | ^8.28.0 | Error tracking |
| `axios` | ^1.4.0 | HTTP client |
| `bcrypt` | ^5.1.1 | Password hashing |
| `ccxt` | ^4.5.45 | Crypto exchange API |
| `cookie-parser` | ^1.4.6 | Cookie parsing |
| `cors` | ^2.8.5 | CORS middleware |
| `dotenv` | ^16.6.1 | Environment variables |
| `express` | ^4.18.2 | Web framework |
| `express-rate-limit` | ^7.1.0 | Rate limiting |
| `helmet` | ^7.0.0 | Security headers |
| `jsonwebtoken` | ^9.0.0 | JWT authentication |
| `node-cron` | ^3.0.2 | Scheduled tasks |
| `nodemailer` | ^8.0.4 | Email service |
| `prisma` | ^7.5.0 | Database toolkit |
| `winston` | ^3.13.1 | Logging |
| `zod` | ^3.24.2 | Data validation |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/*` | Latest | TypeScript type definitions |
| `@typescript-eslint/*` | ^7.4.0 | TypeScript linting |
| `eslint` | ^8.50.0 | Code linting |
| `jest` | ^29.7.0 | Testing framework |
| `prettier` | ^3.1.1 | Code formatting |
| `ts-jest` | ^29.2.5 | Jest TypeScript support |
| `tsx` | ^4.7.2 | TypeScript execution |
| `typescript` | ^5.6.3 | TypeScript compiler |

### Frontend Dependencies (CDN - No install needed)

- **Bootstrap** 5.3.2
- **Font Awesome** 6.4
- **Chart.js** (latest)

---

## ⚙️ Environment Variables Setup

### 🔐 Generate Security Keys

```bash
# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET"

# Generate JWT_REFRESH_SECRET
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"

# Generate SESSION_SECRET
SESSION_SECRET=$(openssl rand -hex 32)
echo "SESSION_SECRET=$SESSION_SECRET"
```

### 📊 Database Setup

#### Option 1: PostgreSQL (Local)
```bash
# Install PostgreSQL if not present
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql
# Windows: Download from postgresql.org

# Start PostgreSQL service
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Create database
createdb smartinvest

# Set DATABASE_URL
DATABASE_URL="postgresql://postgres:password@localhost:5432/smartinvest?schema=public"
```

#### Option 2: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get connection string from Settings → Database
4. Set as `DATABASE_URL` in .env

#### Option 3: PlanetScale/Neon
Follow their documentation to get connection string

### 🔐 Supabase Configuration

```bash
# Get from Supabase Dashboard → Settings → API

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 📧 Email Service (Choose one)

#### Resend (Recommended)
```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend@yourdomain.com
SMTP_PASS=your-api-key
```

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password
```

### 💳 Payment Processing

#### PayPal
1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Create app → Copy Client ID & Secret
```bash
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-secret
PAYPAL_MODE=sandbox  # Change to 'live' for production
```

#### M-Pesa (Safaricom)
1. Register at [Daraja](https://developer.safaricom.co.ke)
2. Create app → Copy credentials
```bash
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
```

#### Stripe
```bash
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

### 🔐 hCaptcha
1. Go to [hcaptcha.com](https://hcaptcha.com)
2. Create site → Copy keys
```bash
HCAPTCHA_SITEKEY=your-sitekey
HCAPTCHA_SECRET=your-secret
```

### 🪙 Cryptocurrency (OKX)
```bash
CRYPTO_OKX_API_KEY=your-api-key
CRYPTO_OKX_API_SECRET=your-api-secret
CRYPTO_OKX_PASSPHRASE=your-passphrase
```

---

## 📥 Installation Steps (Detailed)

### Step 1: Install Node Modules
```bash
# Main project
npm install

# Netlify Functions (if using serverless)
cd netlify/functions
npm install
cd ../..

# Trading Service (optional microservice)
cd trading-service
npm install
cd ..
```

### Step 2: Setup Prisma
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:dev

# Optional: Seed database
npm run prisma:seed
```

### Step 3: Configure Environment
```bash
# Copy template
cp .env.example .env

# Edit .env with your actual values
# Minimum required:
# - JWT_SECRET, SESSION_SECRET
# - DATABASE_URL
# - Supabase keys (if using)
# - Email credentials
# - Payment API keys (PayPal, M-Pesa, etc.)
```

### Step 4: Build TypeScript
```bash
# Type check
npm run type-check

# Build project
npm run build

# Build functions
npm run build:functions
```

### Step 5: Run Tests (Optional but Recommended)
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run Netlify Functions tests
npm run test:functions
```

### Step 6: Start Development
```bash
# Watch mode (auto-reload on changes)
npm run dev

# Or production mode
npm run build
npm start
```

---

## 🔧 NPM Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build TypeScript & functions |
| `npm run start` | Start production server |
| `npm test` | Run tests |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm run validate` | Run lint, type-check, tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate:dev` | Create & run migration |
| `npm run prisma:migrate:deploy` | Deploy migrations (prod) |
| `npm run prisma:studio` | Open Prisma Studio (GUI) |
| `npm run prisma:seed` | Seed database |

---

## 🐳 Docker Setup (Optional)

### Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/smartinvest
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: smartinvest
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Run with Docker
```bash
docker-compose up
```

---

## 🚀 Deployment

### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Or connect GitHub for auto-deploy
```

### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main
```

### AWS Lambda / DigitalOcean / Render
See deployment docs for each platform

---

## ✅ Verification Checklist

- [ ] Node.js >= 20 installed
- [ ] npm installed and updated
- [ ] Git installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with all required variables
- [ ] Database connection tested
- [ ] Prisma migrations ran (`npm run prisma:migrate:dev`)
- [ ] Development server starts (`npm run dev`)
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run type-check`)

---

## 🐛 Troubleshooting

### Issue: `npm install` fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: Database connection error

**Solution:**
```bash
# Check DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin < /dev/null

# Or use Prisma Studio to verify
npm run prisma:studio
```

### Issue: TypeScript compilation errors

**Solution:**
```bash
# Regenerate types
npm run prisma:generate

# Type check
npm run type-check

# Update TypeScript
npm install typescript@latest --save-dev
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Kill process on port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell):
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
PORT=3001 npm run dev
```

### Issue: Netlify Functions not working

**Solution:**
```bash
# Ensure netlify.toml exists
# Rebuild functions
npm run build:functions

# Deploy
netlify deploy --prod
```

---

## 📚 Additional Resources

- [Express Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Netlify Functions](https://www.netlify.com/products/functions/)
- [Supabase Documentation](https://supabase.com/docs)
- [PayPal API](https://developer.paypal.com/docs/api/)

---

## 🆘 Getting Help

1. Check existing [issues](https://github.com/smartinvestsi254-prog/SmartInvestsi/issues)
2. Review [documentation files](./docs/)
3. Contact support: support@smartinvestsi.netlify.app

---

**Last Updated**: June 2026  
**Maintainer**: SmartInvestsi Team
