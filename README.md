# SmartInvestsi - Fintech Investment Platform

**Modern, secure fintech SaaS platform** built for **Netlify** with **Supabase (PostgreSQL)** primary backend and **MongoDB** fallback.

> Investment Management | Trading | Portfolio Analytics | Payment Processing | AI Support

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for Netlify
npm run build

# Run tests
npm run validate
```

## 📋 Stack Overview

| Component | Technology | Purpose |
|-----------|-----------|----------|
| **Hosting** | Netlify Functions | Serverless backend |
| **Primary DB** | Supabase (PostgreSQL) | User data, portfolios, transactions |
| **Fallback DB** | MongoDB | Cache, sessions, real-time data |
| **Frontend** | HTML/CSS/JS/TypeScript | SPA dashboard |
| **ORM** | Prisma | Type-safe database access |
| **Auth** | JWT + Supabase Auth | User authentication |
| **Payments** | PayPal, M-Pesa, Stripe | Payment processing |
| **Trading** | CCXT | Live market data |
| **Logging** | Winston | Structured logging |
| **Monitoring** | Sentry | Error tracking |

## 📁 Project Structure

```
SmartInvestsi/
├── netlify/
│   ├── functions/          # Netlify serverless functions
│   │   ├── auth.ts         # Authentication (JWT, login, register)
│   │   ├── portfolio-api.ts # Portfolio management
│   │   ├── market-data-api.ts
│   │   ├── spot-api.ts     # Live trading (CCXT)
│   │   ├── earn-api.ts     # Staking/earning products
│   │   ├── ai-signals.ts   # AI trading signals
│   │   └── chat-*.ts       # Chat support
│   └── tsconfig.json       # Strict TypeScript config
├── src/
│   ├── server.ts           # Local dev Express server
│   ├── config/
│   │   └── env.ts          # Environment validation
│   └── routes/
├── prisma/
│   ├── schema.prisma       # Database schema (Supabase + MongoDB fallback)
│   └── migrations/         # Database migrations
├── public/
│   ├── *.html              # SPA pages
│   ├── css/                # Stylesheets
│   └── js/                 # Client scripts
├── __tests__/              # Jest test suites
├── .env.example            # Environment template
├── netlify.toml            # Netlify configuration
├── tsconfig.json           # TypeScript strict mode
├── jest.config.ts          # Jest testing config
└── package.json            # Dependencies & scripts
```

## 🔧 Environment Setup

### 1. Copy environment template
```bash
cp .env.example .env
```

### 2. Required variables (Supabase primary)
```env
# Database - Supabase PostgreSQL
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
DIRECT_URL=postgresql://user:password@db.supabase.co:5432/postgres

# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-key

# JWT (generate with: openssl rand -hex 32)
JWT_SECRET=your-64-char-secret
JWT_REFRESH_SECRET=your-64-char-secret
SESSION_SECRET=your-64-char-secret
```

### 3. Optional (MongoDB fallback for caching/sessions)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smartinvest
```

### 4. Payments
```env
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
MPESA_CONSUMER_KEY=xxx
MPESA_CONSUMER_SECRET=xxx
STRIPE_SECRET_KEY=sk_test_xxx
```

## 🏗️ Architecture

### Request Flow
```
Client (Browser)
    ↓
Netlify CDN (Static HTML/CSS/JS)
    ↓
Netlify Functions (API Gateway)
    ↓
Prisma ORM
    ↓
├─→ Supabase (PostgreSQL) [Primary]
└─→ MongoDB [Fallback Cache]
```

### Authentication
- JWT tokens stored in HttpOnly cookies
- Supabase handles email verification
- Role-based access control (USER, ADMIN, PREMIUM)
- Rate limiting on login attempts

### Data Flow
1. **Write Operations**: Always go to Supabase PostgreSQL
2. **Read Operations**: Try MongoDB cache first, fall back to Supabase
3. **Real-time Data**: Direct CCXT API for market prices

## 📦 Build & Deployment

### Local Development
```bash
# Watch TypeScript and rebuild
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint:fix

# Format code
npm run format
```

### Build for Netlify
```bash
npm run build
```

This runs:
1. `npm run clean` - Remove old dist/
2. `prisma generate` - Generate Prisma client
3. `tsc` - Compile TypeScript (strict mode)
4. `tsc -p netlify/tsconfig.json` - Compile Netlify functions

### Deploy to Netlify
```bash
# Connect GitHub repo in Netlify dashboard
# Set environment variables
# Push to main branch - auto-deploys!
git push origin main
```

## 🧪 Testing & Validation

```bash
# Run all tests
npm run validate

# This runs:
# - npm run lint        (ESLint)
# - npm run type-check  (TypeScript strict)
# - npm run test        (Jest)

# Individual commands
npm test
npm run lint
npm run type-check
```

## 🔐 Security Checklist

- ✅ Strict TypeScript mode (no `any` types)
- ✅ ESLint security plugin enabled
- ✅ Pre-commit secret detection
- ✅ Environment variables validated at startup
- ✅ JWT token refresh strategy
- ✅ Rate limiting on APIs
- ✅ CORS properly configured
- ✅ Helmet security headers
- ✅ SQL injection prevention (Prisma)
- ✅ CSRF protection via SameSite cookies

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/verify-email` - Verify email

### Portfolios
- `GET /api/portfolio` - List user portfolios
- `POST /api/portfolio` - Create portfolio
- `GET /api/portfolio/:id` - Get portfolio details
- `PUT /api/portfolio/:id` - Update portfolio
- `GET /api/portfolio/:id/analytics` - Portfolio analytics

### Markets
- `GET /api/market/quote/:symbol` - Get current price
- `GET /api/market/history/:symbol` - Historical data
- `GET /api/market/orderbook/:symbol` - Live orderbook
- `GET /api/market/indices` - Market indices

### Trading
- `POST /api/spot/order` - Place spot order
- `GET /api/spot/orders` - Order history
- `POST /api/spot/cancel/:orderId` - Cancel order

### Earning
- `GET /api/earn/products` - Staking products
- `POST /api/earn/subscribe` - Subscribe to earn
- `GET /api/earn/rewards` - View rewards

### Chat
- `POST /api/chat/create` - Start chat
- `GET /api/chat/:chatId/messages` - Get messages
- `POST /api/chat/:chatId/messages` - Send message

## 🐛 Troubleshooting

### Build fails with "Cannot find module"
```bash
# Regenerate Prisma client
npm run prisma:generate

# Clean and rebuild
npm run clean && npm run build
```

### Environment variable error
```bash
# Check all required vars are set
echo $DATABASE_URL
echo $JWT_SECRET

# Validate config
npm run type-check
```

### Type errors in strict mode
- Use `as const` for literal types
- Return explicit types from functions
- Use `satisfies` for type inference
- Check tsconfig.json strict settings

## 📚 Documentation

- **API Docs**: See `API_DOCUMENTATION.md`
- **Architecture**: See `ARCHITECTURE_OVERVIEW.md`
- **Deployment**: See Netlify dashboard
- **Database**: See `prisma/schema.prisma`

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test: `npm run validate`
3. Format code: `npm run format`
4. Push and create PR
5. CI/CD runs tests automatically

## 📄 License

MIT - See LICENSE file

## 👥 Support

- Email: support@smartinvestsi.com
- Chat: In-app chat support
- Docs: https://docs.smartinvestsi.com
