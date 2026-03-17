# SmartInvest Crypto/Banking Production Roadmap\n\n**Goal:** Transform 6/10 MVP to 10/10 production-ready system.\n\n## Phase 1: Security Hardening (Week 1)\n\n### 1.1 PIN Security\n```
cd netlify/functions &amp;&amp; npm i bcrypt
```\n**Edit netlify/functions/utils/pin-utils.ts:**\n```ts\nexport async function hashPin(pin: string): Promise<string> {\n  const bcrypt = require('bcrypt');\n  return bcrypt.hash(pin, 12);\n}\nexport async function verifyPin(hashedPin: string, inputPin: string): Promise<boolean> {\n  const bcrypt = require('bcrypt');\n  return bcrypt.compare(inputPin, hashedPin);\n}\n```\n\n### 1.2 Real JWT Auth\n```
npm i jsonwebtoken jose
```\n**New netlify/functions/auth.ts (full JWT):** Implement access/refresh tokens, blacklist.\n\n### 1.3 Input Validation\n```
npm i zod
```\nWrap all handlers with Zod schemas.\n\n## Phase 2: Database Migration (Week 2)\n\n### 2.1 Prisma Production\n```
npx prisma migrate dev --name init
npx prisma generate
npx prisma db push
```\n**Models to add in prisma/schema.prisma:**\n- TradingOrder, TradingPosition\n- CryptoPaymentIntent, WalletBalance\n- PaymentIntent, Subscription\n- FraudAlert, SecurityEvent\n\n### 2.2 Replace All Mocks\nFor each file:\n1. Remove mock[] arrays\n2. Add Prisma CRUD operations\n3. Add transactions for consistency\n\n## Phase 3: Payment Integrations (Week 3)\n\n### 3.1 MPESA Daraja\n**Env vars:** `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`\n```
npm i axios
```\n**Implement netlify/functions/manual-mpesa-payment.ts:** Real STK Push + C2B webhooks.\n\n### 3.2 Stripe/PayPal Live\n- Configure webhooks in dashboards\n- Replace mocks in payments-api.ts\n- Add dispute handling\n\n### 3.3 KYC/AML\nIntegrate ShuftiPro sandbox API.\n\n## Phase 4: Crypto Exchange (Week 4)\n\n### 4.1 CCXT Integration\n```
npm i ccxt
```\n**Replace crypto-trading.ts mocks:**\n```ts\nimport ccxt from 'ccxt';\nconst binance = new ccxt.binance({ apiKey: process.env.BINANCE_API_KEY });\n```\n- Live order placement\n- WebSocket streams\n\n### 4.2 Wallet Custody\nInfura RPC for ETH, Fireblocks for production.\n\n## Phase 5: Infrastructure (Week 5)\n\n### 5.1 Redis Caching/Sessions\n```
npm i ioredis upstash-redis
```\nUpstash Redis (serverless).\n\n### 5.2 Monitoring\n```
npm i @sentry/serverless
```\nSentry.init() in all handlers.\n\n### 5.3 Live Signals\nPusher/Ably WebSockets.\n\n## Phase 6: Testing & Compliance\n- 80%+ Jest coverage\n- Load testing (Artillery)\n- Security audit (Snyk)\n- Compliance docs\n\n## Deployment Checklist\n[x] Secrets in Netlify env\n[x] Prisma remote DB\n[x] CDN caching\n[ ] Staging environment\n[ ] Blue-green deploy\n\n**Expected Score After Completion: 10/10**
