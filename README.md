HEAD
# SmartInvest

Investment Management Platform with split architecture:
- **Frontend**: Static HTML/JS pages served via Netlify
- **Netlify Functions**: Serverless Node.js/TypeScript functions for API endpoints
- **Backend API**: ASP.NET Core API deployed separately

## Features

### Core Features
- **Investment Calculators**: Multiple calculators for financial planning
- **Portfolio Management**: Track and manage investment portfolios
- **Trading Platform**: Real-time trading with market data
- **Payment Processing**: Integrated payments (PayPal, M-Pesa, Stripe)
- **User Authentication**: Secure login and registration
- **Admin Dashboard**: User and system management

### AI Chat Support
- **Chatbase Integration**: AI-powered receptionist for user support
- **Feedback Analysis**: Analyzes user questions for improvement insights
- **Service Usage Tracking**: Monitors most-used services and features

### Banking Trial System
- **P2P Transactions**: Secure peer-to-peer money transfers
- **Multi-Currency Support**: USD, EUR, KES, BTC, ETH
- **Withdrawal System**: Bank transfer, mobile money, crypto withdrawals
- **Self-Updating**: Automatic balance updates and interest accrual
- **Unique User IDs**: Clear, discernible trial account IDs (SI-TRIAL-XXXXX)

### Security & Compliance
- **Fraud Detection**: Real-time transaction and login monitoring
- **Geolocation Enforcement**: Country-specific banking rules
- **Rate Limiting**: API rate limiting and abuse prevention
- **Data Encryption**: Secure data handling and storage

## API Endpoints

### Netlify Functions
- `/api/payments-api` - Payment processing and subscriptions
- `/api/crypto-payments` - Cryptocurrency payments and wallets
- `/api/crypto-trading` - Trading engine and market data
- `/api/admin-api` - Admin management and premium access
- `/api/fraud-api` - Fraud detection and security monitoring
- `/api/geo-api` - Geolocation and compliance
- `/api/banking-academy` - Educational content and courses
- `/api/app-settings` - User preferences and settings
- `/api/fintech-programs` - Programs and partnerships
- `/api/notifications-api` - Notifications and alerts
- `/api/chat-receptionist` - AI chat support
- `/api/banking-trial` - Trial banking system

## Environment Variables

### Netlify Functions
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` - PayPal integration
- `PAYPAL_MODE` - 'sandbox' or 'live'
- `CHATBASE_API_KEY`, `CHATBASE_BOT_ID` - Chatbase AI integration
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` - M-Pesa integration
- `STRIPE_SECRET_KEY` - Stripe payment processing
- `TEST_MODE` - 'true' for testing
- `APP_URL` - Application URL

### Backend API
- Database connection strings
- JWT secrets
- Email SMTP settings
- Other service configurations

## Build & Deploy

### Netlify Functions
```bash
npm run build  # Compiles TypeScript functions
```

### Backend API
```bash
cd backend
dotnet build
dotnet publish -c Release
```

## Testing

Run tests for Netlify functions:
```bash
npm test
```

## Monitoring

- Functions use Winston logger for structured logging
- Errors are tracked with detailed context
- Logs available in Netlify dashboard

## Development Workflow

### Pre-commit Hooks
This project uses pre-commit hooks for code quality and security:

- **Security scanning**: Detects hardcoded secrets, API keys, and credentials
- **Code linting**: ESLint with TypeScript and security rules
- **Formatting**: Prettier for consistent code style
- **File validation**: JSON, YAML, TOML syntax checking
- **.NET formatting**: dotnet-format for C# code

#### Setup
```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Or using npm script
npm run pre-commit:install
```

#### Manual Checks
```bash
# Run all checks
npm run pre-commit:run

# Update secrets baseline (after reviewing changes)
npm run secrets:baseline

# Lint and fix code
npm run lint:fix

# Format code
npm run format
```

### CI/CD Pipeline
GitHub Actions automatically runs:
- Pre-commit checks on all files
- Unit tests for Netlify functions
- Security scanning
- Build verification
- Preview deployments for PRs

### Security Considerations
- Never commit secrets or credentials
- Use environment variables for sensitive data
- Review pre-commit failures before committing
- Update `.secrets.baseline` only after verifying false positives
=======
# SmartInvestsi-
1a4d332fd9093ba63c5a11c69a175eeadac13578
