# SmartInvestSI

Complete fintech investment platform with Netlify Functions serverless architecture, real-time trading, payment processing, and intelligent portfolio management.

## Features

### Core Features
- **Investment Calculators**: Multiple financial planning tools
- **Portfolio Management**: Track and manage investment portfolios
- **Trading Platform**: Real-time trading with market data via CCXT
- **Payment Processing**: Integrated PayPal, M-Pesa, and Stripe
- **User Authentication**: Secure JWT-based login and registration
- **Admin Dashboard**: User and system management

### AI Chat Support
- **Chatbase Integration**: AI-powered receptionist
- **Feedback Analysis**: User question analysis
- **Service Usage Tracking**: Feature popularity metrics

### Banking Trial System
- **P2P Transactions**: Secure money transfers
- **Multi-Currency Support**: USD, EUR, KES, BTC, ETH
- **Self-Updating Ledger**: Automatic balance updates
- **Withdrawal System**: Bank, mobile, crypto withdrawals

### Security & Compliance
- **Fraud Detection**: Real-time transaction monitoring
- **Geolocation Enforcement**: Country-specific rules
- **Rate Limiting**: API abuse prevention
- **Data Encryption**: Secure data handling

## Architecture

### Stack
- **Frontend**: HTML/JS/CSS served via Netlify
- **Backend**: Node.js + Express + TypeScript
- **Serverless**: Netlify Functions (AWS Lambda)
- **Database**: Prisma ORM with PostgreSQL
- **Authentication**: JWT + bcrypt
- **Security**: Helmet, rate-limiting, secret detection
- **Monitoring**: Winston logger + Sentry
- **Trading**: CCXT for market data

### Directory Structure

```
SmartInvestsi/
├── src/                    TypeScript Express server
├── netlify/               Netlify Functions serverless APIs
├── public/                Static assets
├── prisma/                Database schema & migrations
├── __tests__/             Jest test suites
├── docs/                  Documentation
├── package.json          Root dependencies
├── tsconfig.json         TypeScript config (strict mode)
├── netlify.toml          Netlify deployment config
├── vercel.json           Vercel deployment config
├── .eslintrc.json        Linting rules
├── .prettierrc            Code formatting
└── README.md            This file
```

## Build & Deploy

### Prerequisites
```bash
node >= 20.11.0
npm >= 10.0.0
```

### Development
```bash
npm install
npm run dev                # Start Express server with hot reload
npm run lint:fix           # Auto-fix linting issues
npm run format             # Format code with Prettier
npm run type-check         # Check TypeScript types
```

### Build
```bash
npm run build              # Compile TypeScript & Netlify Functions
npm start                  # Run compiled server
```

### Testing & Validation
```bash
npm test                   # Run jest tests
npm run validate           # Lint + type-check + test
```

### Database
```bash
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate:dev     # Create migration
npm run prisma:migrate:deploy  # Deploy migrations
npm run prisma:studio     # Open Prisma Studio UI
```

### Deployment

**Netlify:**
```bash
git push origin main       # Auto-deploys via GitHub integration
```

**Vercel:**
```bash
git push origin main       # Auto-deploys via GitHub integration
```

Environment variables must be set in platform dashboards (Netlify/Vercel).

## Environment Variables

See `.env.example` for all required variables. Key ones:

```
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=your-secret-key
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
STRIPE_SECRET_KEY=...
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
CHATBASE_API_KEY=...
```

## Security

- Pre-commit hooks detect hardcoded secrets
- Strict TypeScript mode prevents type errors
- ESLint security plugin catches vulnerable patterns
- All secrets stored in environment variables
- Rate limiting on all API endpoints
- CORS properly configured
- Helmet headers enabled

Run security checks:
```bash
npm run pre-commit:run          # Pre-commit checks
npm run secrets:baseline        # Secret detection baseline
npm run lint                    # Security linting
```

## CI/CD

GitHub Actions runs on every push:
- Pre-commit checks
- Unit tests
- Type checking
- Security scanning
- Build verification
- Preview deployments for PRs

## Monitoring

- Winston structured logging
- Sentry error tracking
- Netlify function logs in dashboard
- Performance monitoring via platform analytics
