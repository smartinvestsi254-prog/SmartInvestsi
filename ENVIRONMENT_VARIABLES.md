# Environment Variables Documentation# Environment Variables Setup Guide


















































































































































































































































































































































































































































































































































Last Updated: February 2026---- [ ] Secrets not committed to version control- [ ] File permissions are correct (`.env` not in git)- [ ] Database connection is working- [ ] Payment gateways are in production mode- [ ] Email SMTP is configured and tested- [ ] URLs are valid HTTPS in production- [ ] API keys are valid and from correct environment- [ ] Passwords are strong (12+ characters)- [ ] All required variables are set## ✅ Validation Checklist---```# ... all other production keys- FRONTEND_URL=https://yourdomain.com- APP_URL=https://yourdomain.com- DATABASE_URL=<production db>- STRIPE_LIVE_API_KEY=sk_live_*- PAYPAL_MODE=live- PAYPAL_ENV=production- MPESA_ENV=production- ADMIN_PASS=<strong password>- ADMIN_USER=<production admin>- JWT_SECRET=<generate strong key>- PORT=3000- NODE_ENV=production# Edit .env with:cp .env.example .env```bash### Production Setup```- SUPPORT_PHONE=+1234567890- SUPPORT_EMAIL=support@example.com- ADMIN_PASS=<strong password>- ADMIN_USER=admin@example.com- JWT_SECRET=<generate strong key>- NODE_ENV=development# Edit .env with:cp .env.example .env```bash### Development Setup## 🚀 Quick Setup---- **Description**: Account lockout duration after max attempts- **Default**: `15`- **Type**: Number### `LOCKOUT_DURATION_MINUTES`- **Description**: Maximum login attempts before lockout- **Default**: `5`- **Type**: Number### `MAX_LOGIN_ATTEMPTS`- **Description**: Enable two-factor authentication- **Type**: Boolean### `ENABLE_2FA_AUTHENTICATION`- **Description**: Geolocation cache update interval- **Default**: `5`- **Type**: Number### `GEOLOCATION_UPDATE_INTERVAL_MINUTES`- **Description**: Geolocation service provider- **Options**: `ip-api`, `maxmind`, `geolite`- **Type**: String### `GEOLOCATION_API`- **Description**: Enable ML-based fraud detection- **Type**: Boolean### `FEATURE_ADVANCED_FRAUD_DETECTION`- **Description**: Enable third-party API integrations- **Type**: Boolean### `FEATURE_API_INTEGRATIONS`- **Description**: Enable investor report generation- **Type**: Boolean### `FEATURE_INVESTOR_REPORTS`- **Description**: Enable geolocation-based shipping- **Type**: Boolean (`true` | `false`)### `FEATURE_GEOLOCATION_SHIPPING`- **Example**: `0.0065` = 1 KES = 0.0065 USD- **Description**: KES to USD exchange rate- **Default**: `0.0065`- **Type**: Number (decimal)### `EXCHANGE_RATE_KES_USD`## Additional Features---- **Example**: `30` = payment must complete within 30 minutes- **Description**: Payment timeout in minutes- **Default**: `30`- **Type**: Number### `CRYPTO_PAYMENT_TTL_MINUTES`- **Example**: `2`, `6`, `12`- **Description**: Required block confirmations for payment confirmation- **Default**: `2`- **Type**: Number### `CRYPTO_REQUIRED_CONFIRMATIONS`- **Description**: Blockchain RPC endpoint- **Example**: `https://mainnet.infura.io/v3/your_project_id`- **Required**: ✅ For crypto payments- **Type**: URL### `CRYPTO_RPC_URL`- **Example**: `3200` = $3200 per ETH- **Description**: Current asset to USD exchange rate- **Default**: `3200`- **Type**: Number (decimal)### `CRYPTO_USD_RATE`- **Description**: Token decimals (most tokens use 18)- **Default**: `18`- **Type**: Number### `CRYPTO_NATIVE_DECIMALS`- **Examples**: `ETH`, `BNB`, `MATIC`- **Description**: Primary cryptocurrency symbol- **Default**: `ETH`- **Type**: String### `CRYPTO_ASSET_SYMBOL`  - `56` = Binance Smart Chain  - `137` = Polygon mainnet  - `1` = Ethereum mainnet- **Examples**: - **Description**: Blockchain chain ID- **Default**: `1` (Ethereum mainnet)- **Type**: Number### `CRYPTO_CHAIN_ID`- **Description**: Treasury wallet address for crypto deposits- **Required**: ✅ For crypto payments- **Type**: Ethereum address (`0x...`)### `CRYPTO_TREASURY_ADDRESS`## Cryptocurrency Payments---- **Example**: `100` = 100 requests per 15 minutes- **Description**: Maximum requests per window- **Default**: `100`- **Type**: Number### `RATE_LIMIT_MAX_REQUESTS`- **Example**: `900000` = 15 min, `3600000` = 1 hour- **Description**: Rate limit window duration- **Default**: `900000` (15 minutes)- **Type**: Number (milliseconds)### `RATE_LIMIT_WINDOW_MS`## Rate Limiting---- **Example**: `5242880` = 5MB, `10485760` = 10MB- **Description**: Maximum file upload size- **Default**: `5242880` (5MB)- **Type**: Number (bytes)### `MAX_FILE_SIZE`- **Example**: `https://yourdomain.com,https://app.yourdomain.com,http://localhost:3000`- **Format**: Full URLs with protocol- **Description**: Comma-separated list of allowed CORS origins- **Default**: `https://yourdomain.com,http://localhost:3000`- **Type**: CSV String### `ALLOWED_ORIGINS`## CORS & File Upload---- **Example**: `30`, `60`- **Description**: Session timeout in minutes- **Default**: `30`- **Type**: Number### `SESSION_TIMEOUT_MINUTES`- **Production**: Use `warn` or `error`- **Description**: Application logging level- **Options**: `error`, `warn`, `info`, `debug`, `trace`- **Default**: `info`- **Type**: String### `LOG_LEVEL`## Logging & Session---- **Example**: `your_session_secret_at_least_32_characters_long`- **Security**: Must be strong and kept confidential- **Description**: Secret key for session encryption- **Required**: ✅ Yes- **Type**: String (32+ characters)### `SESSION_SECRET`- **Example**: `your_cookie_secret_key_at_least_32_characters_long`- **Security**: Must be strong and kept confidential- **Description**: Secret key for cookie encryption- **Required**: ✅ Yes- **Type**: String (32+ characters)### `COOKIE_SECRET`## Security---- **Production**: Must use HTTPS- **Example**: `https://yourdomain.com`- **Description**: Frontend application URL- **Required**: ✅ Yes- **Type**: URL### `FRONTEND_URL`- **Production**: Must use HTTPS- **Example**: `https://yourdomain.com`- **Description**: Public application URL- **Required**: ✅ Yes- **Type**: URL### `APP_URL`## Application URLs---- **Example**: `postgresql://admin:password@db.example.com:5432/smartinvest`- **Alternatives**: MySQL, SQL Server supported- **Format**: `postgresql://user:password@localhost:5432/smartinvest`- **Required**: ✅ Yes (if using database)- **Type**: Connection string### `DATABASE_URL`## Database Configuration---- **Example**: `SmartInvest Support`- **Description**: Sender display name- **Default**: `SmartInvest`- **Type**: String### `EMAIL_FROM_NAME`- **Example**: `noreply@smartinvest.com`- **Description**: Sender email address- **Default**: `noreply@smartinvest.com`- **Type**: Email String### `EMAIL_FROM`- **Note**: Use app-specific password for Gmail- **Description**: SMTP password or app-specific password- **Required**: ✅ Yes- **Type**: String### `EMAIL_PASSWORD`- **Example**: `your-email@gmail.com`- **Description**: SMTP username/email- **Required**: ✅ Yes- **Type**: Email String### `EMAIL_USER`- **Common**: `587` (TLS), `465` (SSL)- **Description**: SMTP port (TLS)- **Default**: `587`- **Type**: Number### `EMAIL_PORT`- **Example**: `smtp.gmail.com`, `smtp.sendgrid.net`- **Description**: SMTP email server address- **Default**: `smtp.gmail.com`- **Type**: String (SMTP hostname)### `EMAIL_HOST`## Email Configuration---- **Example**: `your_kcb_branch_code`- **Description**: Bank branch code- **Type**: String### `KCB_BRANCH_CODE`- **Example**: `your_kcb_branch_name`- **Description**: Bank branch name- **Type**: String### `KCB_BRANCH_NAME`- **Example**: `your_kcb_account_number`- **Visibility**: Public on payment page- **Description**: Bank account number- **Type**: String### `KCB_ACCOUNT_NUMBER`- **Visibility**: Public on payment page- **Description**: Account holder name- **Default**: `ELIJAH MUSYOKA DANIEL`- **Type**: String### `KCB_ACCOUNT_NAME`- **Description**: Bank name for manual payments- **Default**: `Kenya Commercial Bank`- **Type**: String### `KCB_BANK_NAME`## Bank Details---- **Description**: Stripe live secret key (alias)- **Required**: ✅ For Stripe payments- **Type**: String (`sk_live_*`)#### `STRIPE_LIVE_SECRET_KEY`- **Note**: Only `sk_live_*` keys allowed in production- **Description**: Stripe live secret key- **Source**: Stripe Dashboard- **Required**: ✅ For Stripe payments- **Type**: String (`sk_live_*`)#### `STRIPE_LIVE_API_KEY`### Stripe Configuration- **Description**: URL to return to if PayPal payment cancelled- **Example**: `https://yourdomain.com/paypal/cancel`- **Type**: URL#### `PAYPAL_CANCEL_URL`- **Description**: URL to return to after PayPal approval- **Example**: `https://yourdomain.com/paypal/return`- **Type**: URL#### `PAYPAL_RETURN_URL`- **Description**: PayPal mode (same as PAYPAL_ENV)- **Default**: `production`- **Type**: String (`sandbox` | `live`)#### `PAYPAL_MODE`- **⚠️ Critical**: Must be `production` for live payments- **Default**: `production`- **Type**: String (`sandbox` | `production`)#### `PAYPAL_ENV`- **Description**: PayPal client secret- **Source**: PayPal Developer Dashboard- **Required**: ✅ For PayPal payments- **Type**: String#### `PAYPAL_CLIENT_SECRET`- **Description**: PayPal client ID- **Source**: PayPal Developer Dashboard- **Required**: ✅ For PayPal payments- **Type**: String#### `PAYPAL_CLIENT_ID`### PayPal Configuration- **Description**: Account reference for M-Pesa transactions- **Default**: `SmartInvest`- **Type**: String#### `MPESA_ACCOUNT_REF`- **Description**: Callback endpoint for M-Pesa confirmation- **Example**: `https://yourdomain.com/api/pochi/callback`- **Required**: ✅ For M-Pesa- **Type**: URL#### `MPESA_CALLBACK_URL`- **Description**: Business display name for Pochi payments- **Default**: `SmartInvest`- **Type**: String#### `MPESA_POCHI_NAME`- **Description**: M-Pesa passkey for API requests- **Source**: Safaricom Daraja Portal- **Required**: ✅ For M-Pesa- **Type**: String (64 characters)#### `MPESA_PASSKEY`- **Example**: `your_paybill_number`- **Description**: Paybill number for manual payments- **Type**: String (4-6 digits)#### `MPESA_PAYBILL`- **Example**: `174379`- **Description**: Business short code (same as MPESA_NUMBER)- **Type**: String (4-6 digits)#### `MPESA_SHORTCODE`- **Example**: `171414`, `174379`- **Description**: Your business short code- **Required**: ✅ For M-Pesa- **Type**: String (4-6 digits)#### `MPESA_NUMBER`- **⚠️ Critical**: Must be `production` for live payments- **Description**: M-Pesa environment mode- **Default**: `production`- **Type**: String (`sandbox` | `production`)#### `MPESA_ENV`- **Description**: Safaricom API consumer secret- **Source**: https://developer.safaricom.co.ke- **Required**: ✅ For production payments- **Type**: String#### `MPESA_CONSUMER_SECRET`- **Description**: Safaricom API consumer key- **Source**: https://developer.safaricom.co.ke- **Required**: ✅ For production payments- **Type**: String#### `MPESA_CONSUMER_KEY`### M-Pesa Configuration## Payment Gateways---- **Visibility**: Public on contact page- **Format**: International format with country code- **Example**: `+254700000000`- **Description**: Public support phone number- **Required**: ✅ Yes- **Type**: String (E.164 format)### `SUPPORT_PHONE`- **Visibility**: Public on contact page- **Example**: `support@yourdomain.com`- **Description**: Public support email displayed on website- **Required**: ✅ Yes- **Type**: Email String### `SUPPORT_EMAIL`## Contact Information---- **Example**: `change_this_secure_password`- **Security**: Minimum 8 characters, change after first login- **Description**: Admin password for initial login- **Required**: ✅ Yes- **Type**: String (strong password)### `ADMIN_PASS`- **Note**: Must be valid email format- **Example**: `admin@example.com`- **Description**: Primary admin email address- **Required**: ✅ Yes- **Type**: Email String### `ADMIN_USER`## Admin Credentials---- **Example**: `12h`, `24 hours`, `7 days`- **Formats**: `12h`, `24h`, `7d`- **Description**: JWT token expiration time- **Default**: `12h`- **Type**: String (time format)### `JWT_EXPIRES`- **Example**: `your_super_secret_jwt_key_minimum_32_characters_long_change_in_production`- **Security**: Must be strong and kept confidential- **Description**: Secret key for signing JWT tokens- **Required**: ✅ Yes- **Type**: String (32+ characters recommended)### `JWT_SECRET`## Authentication & JWT---- **Example**: `3000`, `3001`, `8080`- **Description**: Server port to run on- **Default**: `3000`- **Type**: Number### `PORT`- **Production**: Must be `production`- **Description**: Application environment mode- **Default**: `development`- **Type**: String (`development` | `production`)### `NODE_ENV`## Server Configuration---15. [Additional Features](#additional-features)14. [Cryptocurrency Payments](#cryptocurrency-payments)13. [Rate Limiting](#rate-limiting)12. [CORS & File Upload](#cors--file-upload)11. [Logging & Session](#logging--session)10. [Security](#security)9. [Application URLs](#application-urls)8. [Database Configuration](#database-configuration)7. [Email Configuration](#email-configuration)6. [Bank Details](#bank-details)5. [Payment Gateways](#payment-gateways)4. [Contact Information](#contact-information)3. [Admin Credentials](#admin-credentials)2. [Authentication & JWT](#authentication--jwt)1. [Server Configuration](#server-configuration)## 📋 Table of Contents---Complete reference for all SmartInvest environment configuration variables.
## Quick Start

```bash
cp .env.example .env
```

Then fill in the values below in your `.env` file.

---

## Required Environment Variables

### 1. Server Configuration

```env
NODE_ENV=development        # development, staging, or production
PORT=3000                   # Server port
```

### 2. JWT Authentication

```env
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long_change_in_production
JWT_EXPIRES=12h             # Token expiration time
```

**⚠️ Important**: 
- Minimum 32 characters for production
- Change this value in production
- Never commit this to version control

### 3. Admin Authentication

```env
ADMIN_USER=smartinvestsi254@gmail.com
ADMIN_PASS=ELIJAH-41168990
ADMIN_EMAIL=smartinvestsi254@gmail.com
```

### 4. Application URLs

```env
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
```

### 5. M-Pesa Payment Integration (Safaricom Daraja)

Get credentials from: https://developer.safaricom.co.ke

```env
MPESA_CONSUMER_KEY=your_mpesa_consumer_key_here
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret_here
MPESA_ENV=production                    # sandbox or production
MPESA_NUMBER=your_business_shortcode
MPESA_SHORTCODE=your_business_shortcode
MPESA_PAYBILL=your_paybill_number
MPESA_PASSKEY=your_mpesa_passkey_from_safaricom
MPESA_POCHI_NAME=SmartInvest
MPESA_CALLBACK_URL=https://yourdomain.com/api/pochi/callback
MPESA_ACCOUNT_REF=SmartInvest
```

### 6. PayPal Configuration

```env
PAYPAL_CLIENT_ID=your_paypal_live_client_id
PAYPAL_CLIENT_SECRET=your_paypal_live_client_secret
PAYPAL_ENV=production                   # sandbox or production
PAYPAL_MODE=production
PAYPAL_RETURN_URL=https://yourdomain.com/paypal/return
PAYPAL_CANCEL_URL=https://yourdomain.com/paypal/cancel
# Optional address to which PayPal payments should be sent
PAYPAL_RECEIVER_EMAIL=delijah5415@gmail.com
EXCHANGE_RATE_KES_USD=0.0065
```

### 6.1 Google Pay (Optional)

```env
GOOGLE_PAY_EMAIL=delijah5415@gmail.com      # email associated with Google Pay account
GOOGLE_PAY_NUMBER=+254700000000             # payment number as referenced in pricing
```

### 7. Stripe Live API (Production Only)

```env
STRIPE_LIVE_API_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_LIVE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

### 8. Additional Payment Processors

```env
# Paystack
PAYSTACK_PUBLIC_KEY=pk_test_xxxx
PAYSTACK_SECRET_KEY=sk_test_xxxx
PAYSTACK_CALLBACK_URL=https://yourdomain.com/payment/callback

# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxx
```

### 9. KCB Bank Details (Manual Payments)

```env
KCB_BANK_NAME=Kenya Commercial Bank
KCB_ACCOUNT_NAME=ELIJAH MUSYOKA DANIEL
KCB_ACCOUNT_NUMBER=your_kcb_account_number
KCB_BRANCH_NAME=your_kcb_branch_name
KCB_BRANCH_CODE=your_kcb_branch_code
```

### 10. Email Configuration (SMTP)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM=noreply@smartinvest.com
EMAIL_FROM_NAME=SmartInvest
SUPPORT_EMAIL=support@yourdomain.com
SUPPORT_PHONE=+254700000000
```

### 11. Security

```env
COOKIE_SECRET=your_cookie_secret_key_at_least_32_characters_long
SESSION_SECRET=your_session_secret_at_least_32_characters_long
```

### 12. Database Configuration (Optional)

```env
DATABASE_URL=your_database_connection_string
```

### 13. Logging

```env
LOG_LEVEL=info              # debug, info, warn, error
```

### 14. File Upload

```env
MAX_FILE_SIZE=5242880       # 5MB in bytes
```

### 15. Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### 16. Crypto Payments (EVM-compatible)

```env
CRYPTO_TREASURY_ADDRESS=0xYourTreasuryAddress
CRYPTO_CHAIN_ID=1
CRYPTO_ASSET_SYMBOL=ETH
CRYPTO_NATIVE_DECIMALS=18
CRYPTO_USD_RATE=3200
CRYPTO_RPC_URL=https://mainnet.infura.io/v3/your_project_id
CRYPTO_REQUIRED_CONFIRMATIONS=2
CRYPTO_PAYMENT_TTL_MINUTES=30
```

---

## Environment Setup Steps

### Step 1: Copy the Template
```bash
cd /workspaces/SmartInvest-
cp .env.example .env
```

### Step 2: Edit the .env File
```bash
# Open in your editor and fill in the values
code .env
```

### Step 3: Verify Required Variables
Make sure these are set at minimum:
- `JWT_SECRET` (32+ characters)
- `NODE_ENV` (development/production)
- `PORT`
- `ADMIN_USER` and `ADMIN_PASS`

### Step 4: Load Environment Variables
The application automatically loads from `.env` file. No additional setup needed.

---

## Security Best Practices

✅ **DO:**
- Keep `.env` file in `.gitignore` (already configured)
- Use strong, random values for secrets
- Change all default values for production
- Use different values for each environment (dev, staging, prod)
- Rotate secrets periodically

❌ **DON'T:**
- Commit `.env` to version control
- Share `.env` file via email or chat
- Use placeholder values in production
- Hardcode secrets in source code
- Use the same secrets across environments

---

## Accessing Environment Variables in Code

### JavaScript/Node.js
```javascript
const secret = process.env.JWT_SECRET;
const port = process.env.PORT || 3000;
```

### C#/.NET
```csharp
var jwtSecret = Configuration["JWT:SecretKey"];
```

---

## Development vs Production

### Development (.env)
```env
NODE_ENV=development
MPESA_ENV=sandbox
PAYPAL_ENV=sandbox
```

### Production
```env
NODE_ENV=production
MPESA_ENV=production
PAYPAL_ENV=production
STRIPE_LIVE_API_KEY=sk_live_xxxxx        # Live keys only
```

---

## Troubleshooting

### Variables Not Loading?
1. Verify `.env` file exists in project root
2. Restart your application
3. Check for typos in variable names
4. Ensure no spaces around `=` sign

### "Cannot find environment variable"?
1. Check if variable is used before defined
2. Verify spelling matches exactly
3. Add default value: `process.env.VAR || defaultValue`

---

## Related Documentation
- See [SECRET_MANAGEMENT.md](SECRET_MANAGEMENT.md) for detailed secret management practices
- See [.env.example](.env.example) for example configurations
