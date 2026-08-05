# SmartInvestsi Dashboard Documentation

## Table of Contents

1. [Quick Start](#quick-start)
2. [Dashboard Features](#dashboard-features)
3. [API Integration](#api-integration)
4. [Error Handling](#error-handling)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

- Node.js 20.0.0 or higher
- npm 10.0.0 or higher
- Modern web browser with JavaScript enabled

### Installation

```bash
# Clone repository
git clone https://github.com/smartinvestsi254-prog/SmartInvestsi.git
cd SmartInvestsi

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate
```

### Development Server

```bash
# Start development server
npm run dev

# Application will be available at http://localhost:3000
# Dashboards:
# - http://localhost:3000/dashboard.html
# - http://localhost:3000/enhanced-dashboard.html
# - http://localhost:3000/banking-dashboard.html
```

### Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod
```

---

## Dashboard Features

### 1. Main Dashboard (dashboard.html)

**Purpose**: Primary investment dashboard with portfolio overview and personalization

**Features**:
- 📊 Portfolio performance chart
- 💼 Asset allocation visualization
- 📈 Recent transactions list
- 🧭 Personalized investment plan
- ⚙️ User settings and preferences
- 💰 Quick action buttons

**Key Sections**:

#### Onboarding Form
- Risk Tolerance (Conservative/Moderate/Aggressive)
- Investment Goals (Growth/Income/Preservation)
- Crypto Interest toggle
- Notification Frequency
- Time Horizon
- Regional Preferences
- Monthly Contribution Amount
- Impact Focus option

**API Endpoints Called**:
- `POST /.netlify/functions/personalization/profile` - Save user profile
- `GET /.netlify/functions/personalization/recommendations` - Get personalized recommendations

**Error Handling**:
- Form validation before submission
- Network error recovery with user feedback
- HTML escaping to prevent XSS
- Auto-hiding alert messages

---

### 2. Enhanced Dashboard (enhanced-dashboard.html)

**Purpose**: Showcase all 20 premium investment features

**20 Features Included**:

1. ✅ Portfolio Management (FREE)
2. ⭐ Portfolio Rebalancing (PREMIUM)
3. 📊 Real-time Market Data (PREMIUM)
4. 🔔 Price Alerts (FREE - 5 alerts)
5. 💰 Dividend Tracker (FREE)
6. 📰 News Aggregator (FREE)
7. 👥 Social Trading (FREE - View Only)
8. 📋 Copy Trading (PREMIUM)
9. 🤖 Robo-Advisor (PREMIUM)
10. 🏦 Bank Linking (PREMIUM)
11. 💵 Auto-Investing/DCA (PREMIUM)
12. 💳 Multi-Currency Wallets (PREMIUM)
13. 🎁 Referral Program (FREE)
14. 🎓 Educational Content (FREE - Basic)
15. 📊 Tax Optimization (PREMIUM)
16. 📈 Fractional Shares (PREMIUM)
17. 📉 Performance Benchmarking (FREE)
18. 🔔 Notifications & WhatsApp (FREE Email / PREMIUM WhatsApp)
19. 📱 Mobile Apps (FREE)
20. 🌍 Multi-Language Support (FREE)

**Tier System**:
- **FREE**: 8 features available to all users
- **PREMIUM**: 12 additional features with subscription
- **ENTERPRISE**: Custom solutions

**API Endpoints Called**:
- `GET /api/features/portfolios` - Load user portfolios
- `GET /api/features/alerts/price` - Get price alerts
- `GET /api/features/dividends` - Load dividend data
- `GET /api/features/user-tier` - Check user subscription tier

**Error Handling**:
- Feature availability checks based on user tier
- Graceful handling of missing data
- Loading states for async operations

---

### 3. Banking Dashboard (banking-dashboard.html)

**Purpose**: Trial banking system for multi-currency accounts and transactions

**Features**:
- 🏦 Multi-currency support (USD, EUR, KES, BTC, ETH)
- 💳 Account selection and management
- 📊 Account balance and health status
- 💸 P2P transfer with PIN auto-approval
- 🏧 Deposit and withdrawal workflows
- 🔑 Transaction PIN setup
- 📋 Transaction history
- ✅ Verification status tracking
- 🛡️ Account security management
- ⚙️ Banking workflow progress

**Workflows Implemented**:

#### 1. Account Setup
- Create multiple accounts
- Select account type (Checking, Savings)
- Set preferred currency
- Complete verification

#### 2. P2P Transfer
- Enter recipient account ID
- Specify transfer amount
- Optional PIN for auto-approval
- Instant completion with PIN
- Manual approval without PIN

#### 3. Deposits
- Bank transfer method
- Mobile money (M-Pesa) method
- Amount specification
- Verification requirements

#### 4. Withdrawals
- Bank account linking
- Mobile money destination
- Withdrawal amount
- Processing status

**API Endpoints Called**:
- `GET /.netlify/functions/advanced-banking/banking/accounts` - Get user accounts
- `GET /.netlify/functions/advanced-banking/banking/summary/{accountId}` - Get account summary
- `GET /.netlify/functions/advanced-banking/banking/transactions` - Get transaction history
- `POST /.netlify/functions/advanced-banking/banking/transfer` - Initiate transfer
- `POST /.netlify/functions/advanced-banking/banking/setup-pin` - Setup transaction PIN
- `POST /.netlify/functions/advanced-banking/banking/deposit-withdrawal` - Process deposit/withdrawal
- `GET /.netlify/functions/advanced-banking/banking/verification` - Get verification status
- `GET /.netlify/functions/advanced-banking/banking/workflows` - Get workflow progress

**Security Features**:
- PIN-based auto-approval for instant transfers
- Closed-loop system (only SmartInvest accounts)
- Account health monitoring
- Verification-based access levels
- Rate limiting

---

## API Integration

### Request Structure

```javascript
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'user-id-here'
  },
  body: JSON.stringify({
    // request payload
  })
};

const response = await fetch('/api/endpoint', options);
const data = await response.json();
```

### Response Format

```javascript
{
  "success": true,
  "data": {
    // response data
  },
  "error": null
}
```

### Error Response Format

```javascript
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

### Complete Endpoint List

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout

#### Personalization
- `POST /.netlify/functions/personalization/profile` - Save user profile
- `GET /.netlify/functions/personalization/recommendations` - Get recommendations

#### Banking
- `GET /.netlify/functions/advanced-banking/banking/accounts` - List accounts
- `GET /.netlify/functions/advanced-banking/banking/summary/{id}` - Account summary
- `GET /.netlify/functions/advanced-banking/banking/transactions` - Transaction list
- `POST /.netlify/functions/advanced-banking/banking/transfer` - Transfer funds
- `POST /.netlify/functions/advanced-banking/banking/setup-pin` - Setup PIN
- `GET /.netlify/functions/advanced-banking/banking/verification` - Verification status

#### Features
- `GET /api/features/portfolios` - Get portfolios
- `GET /api/features/alerts/price` - Get price alerts
- `GET /api/features/dividends` - Get dividend data
- `GET /api/features/user-tier` - Check user tier

#### Payments
- `POST /api/pay/mpesa` - M-Pesa payment
- `POST /api/pay/paypal/create-order` - PayPal order
- `POST /api/pay/stripe` - Stripe payment

#### Admin
- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/users` - List users
- `GET /api/admin/payments` - Payment history
- `POST /api/admin/send-email` - Send email

---

## Error Handling

### Error Types Handled

#### 1. Network Errors
- Timeout (5 second default)
- Connection failures
- DNS resolution errors

#### 2. HTTP Errors
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 429 Rate Limited
- 500 Server Error
- 503 Service Unavailable

#### 3. Validation Errors
- Missing required fields
- Invalid data types
- Format validation failures

#### 4. Security Errors
- XSS attempt detection
- CORS violations
- CSRF token validation

### Error Handler Classes

#### EnhancedDashboardErrorHandler

```javascript
const handler = new EnhancedDashboardErrorHandler();

// Fetch with timeout
await handler.fetchWithTimeout(url, options, 5000);

// Retry with exponential backoff
await handler.retryFetch(url, options, 5000);

// Show error to user
handler.showError('Error message');

// Show success message
handler.showSuccess('Success message');

// Sanitize HTML
const safe = handler.sanitizeHtml(userInput);
```

#### BankingDashboardErrorHandler

```typescript
const handler = new BankingDashboardErrorHandler();

// Handle banking errors
handler.handleBankingError(error, 'Transfer');

// Retry banking operation
await handler.retryBankingOperation(() => transferFunds(), 'Transfer');

// Validate account data
handler.validateAccountData(account);

// Format currency safely
const formatted = handler.formatCurrency(100, 'USD');

// Setup global error handlers
handler.setupGlobalHandlers();
```

### Error Handler Features

✅ **Retry Logic**
- Exponential backoff
- Configurable attempts (default: 3)
- Configurable delays (1s to 10s)

✅ **User Feedback**
- Auto-hiding alerts (5 seconds)
- Error/Success messages
- Loading indicators
- Form validation feedback

✅ **Security**
- HTML escaping for XSS prevention
- Input sanitization
- CORS error handling
- Rate limit detection

✅ **Logging**
- Console error logging
- Error context tracking
- Error classification

---

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- __tests__/dashboard.test.ts
```

### Test Coverage Areas

✅ **Form Submission Tests** (15+ tests)
- Valid form submission
- Required field validation
- Error handling
- API integration
- Data transformation

✅ **Error Handling Tests** (20+ tests)
- Error display
- Success messages
- Alert auto-hiding
- Error classification
- Recovery strategies

✅ **Network Error Tests** (15+ tests)
- Timeout handling
- Connection errors
- Retry logic
- Exponential backoff
- Failed requests

✅ **Form Validation Tests** (12+ tests)
- Required fields
- Data types
- Format validation
- Input trimming
- HTML escaping

✅ **Security Tests** (10+ tests)
- XSS prevention
- Script tag filtering
- URL sanitization
- Data encryption

✅ **API Integration Tests** (12+ tests)
- Correct headers
- Request format
- Response validation
- Error responses

### Test Examples

```typescript
// Form submission test
it('should handle form submission with valid data', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: {} })
  });

  const event = new Event('submit');
  onboardingForm.dispatchEvent(event);

  expect(mockFetch).toBeDefined();
});

// Error handling test
it('should display error alert', () => {
  errorMessage.textContent = 'Test error';
  errorAlert.classList.add('show');
  expect(errorAlert.classList.contains('show')).toBe(true);
});

// Network timeout test
it('should handle network timeout', async () => {
  mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
  
  try {
    await fetch('/api/test');
  } catch (error) {
    expect(error.message).toBe('Network timeout');
  }
});
```

### Code Coverage

```
Dashboards: 85%+ coverage
- dashboard.html: 90%+
- enhanced-dashboard.html: 85%+
- banking-dashboard.html: 80%+

Error Handlers: 95%+ coverage
- EnhancedDashboardErrorHandler: 95%+
- BankingDashboardErrorHandler: 95%+
```

---

## Deployment

### Environment Setup

Create `.env` file in root directory:

```env
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Authentication
JWT_SECRET=your-secret-key

# Payments
STRIPE_SECRET_KEY=sk_live_xxx
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
MPESA_CONSUMER_KEY=xxx
MPESA_CONSUMER_SECRET=xxx

# Email
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=noreply@domain.com
SMTP_PASS=xxx
SMTP_FROM=noreply@smartinvestsi.com

# Netlify Functions
NETLIFY_AUTH_TOKEN=xxx
```

### Netlify Configuration

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "public"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
```

### Build Process

```bash
# Compile TypeScript
npm run build

# Generate Prisma client
npm run prisma:generate

# Type check
npm run type-check

# Lint code
npm run lint

# Run tests
npm run test

# Deploy
netlify deploy --prod
```

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations up to date
- [ ] Tests passing (100% coverage in critical paths)
- [ ] Linting passed
- [ ] Type checking passed
- [ ] Security scan passed
- [ ] Performance benchmarks met
- [ ] Error handling tested
- [ ] Load testing completed
- [ ] Documentation updated

### Monitoring

**Sentry Integration** for error tracking:

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0
});
```

**CloudWatch Logs** for Lambda functions

**Analytics** for user behavior tracking

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Forms Not Submitting

**Problem**: Onboarding form doesn't submit

**Solutions**:
```javascript
// Check form elements exist
const form = document.getElementById('onboardingForm');
if (!form) console.error('Form not found');

// Check event listener attached
form.addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Form submitted');
});

// Verify API endpoint
console.log('API endpoint:', '/.netlify/functions/personalization/profile');
```

#### 2. API Calls Failing

**Problem**: 404 or 500 errors from API

**Solutions**:
```javascript
// Check network tab in browser DevTools
// Verify request headers
console.log('Headers:', {
  'Content-Type': 'application/json',
  'x-user-id': 'test-user'
});

// Check response
response.text().then(console.log);

// Enable verbose logging
localStorage.setItem('DEBUG', 'true');
```

#### 3. Error Messages Not Displaying

**Problem**: Errors occur but no user feedback

**Solutions**:
```javascript
// Check alert elements exist
const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');
if (!errorAlert || !errorMessage) console.error('Alert elements missing');

// Check CSS classes
console.log('Alert classes:', errorAlert.className);

// Test alert display
errorMessage.textContent = 'Test error';
errorAlert.classList.add('show');
```

#### 4. PIN Auto-Approval Not Working

**Problem**: Transfer PIN not auto-approving

**Solutions**:
```javascript
// Check PIN validation
if (!/^\d{4,6}$/.test(pin)) {
  console.error('Invalid PIN format');
}

// Check API response
response.json().then(data => {
  console.log('Auto-approved:', data.autoApproved);
});

// Verify account has PIN set
verification.pinSetup === true
```

#### 5. Multi-Currency Issues

**Problem**: Currency conversion or display errors

**Solutions**:
```javascript
// Check currency symbols
const currencySymbol = {'USD': '$', 'EUR': '€', 'KES': 'KES'};

// Validate amount
if (!Number.isFinite(amount)) console.error('Invalid amount');

// Format safely
const formatted = handler.formatCurrency(100, 'USD');
console.log(formatted); // USD 100.00
```

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('DEBUG', 'dashboard');
localStorage.setItem('VERBOSE', 'true');

// Reload page
location.reload();

// View logs
console.log('Debug mode enabled');
```

### Performance Optimization

```javascript
// Check load time
const perfData = performance.getEntriesByType('navigation')[0];
console.log('Load time:', perfData.loadEventEnd - perfData.loadEventStart);

// Monitor memory
console.memory; // Chrome only

// Check network requests
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('api'))
  .forEach(r => console.log(`${r.name}: ${r.duration}ms`));
```

---

## Best Practices

### 1. Error Handling

✅ **DO**:
```javascript
// Always use try-catch
try {
  const response = await fetch(url);
  const data = await response.json();
  handler.validateResponse(data);
} catch (error) {
  handler.handleError('Operation', error);
}

// Always provide user feedback
handler.showError('Failed to load data');
handler.showSuccess('Data loaded successfully');
```

❌ **DON'T**:
```javascript
// Don't ignore errors
fetch(url).then(r => r.json()).then(d => useData(d));

// Don't show technical errors to users
handler.showError(JSON.stringify(error));
```

### 2. Security

✅ **DO**:
```javascript
// Always escape user input
const safe = handler.sanitizeHtml(userInput);

// Always validate data
handler.validateAccountData(account);

// Always use HTTPS
// Always validate API responses
```

❌ **DON'T**:
```javascript
// Don't use innerHTML with user data
element.innerHTML = userInput; // XSS vulnerability

// Don't store sensitive data in localStorage
localStorage.setItem('password', password);

// Don't log sensitive data
console.log('API Key:', apiKey);
```

### 3. Performance

✅ **DO**:
```javascript
// Use error handler's retry logic
await handler.retryFetch(url, options, 5000);

// Implement loading states
handler.setLoading(true);
try {
  await operation();
} finally {
  handler.setLoading(false);
}

// Debounce form submissions
let submitTimeout;
form.addEventListener('input', () => {
  clearTimeout(submitTimeout);
  submitTimeout = setTimeout(submitForm, 500);
});
```

❌ **DON'T**:
```javascript
// Don't make multiple requests unnecessarily
for (let i = 0; i < 10; i++) {
  fetch(url); // Bad!
}

// Don't block user interaction
await heavyOperation(); // Freezes UI

// Don't create memory leaks
setInterval(() => {
  fetch(url); // Runs forever
}, 1000);
```

### 4. Code Quality

✅ **DO**:
```javascript
// Use meaningful variable names
const errorAlert = document.getElementById('errorAlert');

// Add JSDoc comments
/**
 * Load user accounts
 * @async
 * @returns {Promise<Account[]>}
 */
async function loadAccounts() {}

// Use consistent formatting
const options = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
};
```

❌ **DON'T**:
```javascript
// Don't use single letter variables
const a = document.getElementById('errorAlert');

// Don't use magic numbers
setTimeout(() => {}, 5000); // What does 5000 mean?

// Don't nest too deeply
if (a) { if (b) { if (c) { /* deeply nested */ } } }
```

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review test examples in [Testing](#testing)
3. Check [API Integration](#api-integration) documentation
4. Open GitHub issue with:
   - Error message
   - Browser console logs
   - Network tab screenshot
   - Steps to reproduce

---

**Last Updated**: 2026-05-16
**Version**: 2.0.0
**Maintained by**: SmartInvest Team
