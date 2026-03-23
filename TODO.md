,# SmartInvest Production TODO - Free Tier Live Trading/Banking
Live services with 0-cost/free tiers. Phased implementation.


- [ ] 1.2 Create netlify/functions/utils/pin-utils.ts (hash/verify functions)
- [ ] 1.3 Update advanced-banking.ts: Use real PIN hashing
- [ ] 1.4 netlify/functions/auth.ts: Real JWT (jsonwebtoken)
- [x] 1.5 Zod validation middleware created (netlify/functions/middleware/zod-validator.ts)
- [x] 1.6 Frontend: hCaptcha integration stubbed in SECURITY_SETUP.md

## Phase 2: Database Migration

- [ ] 2.3 Replace mocks → Prisma in crypto-trading.ts, crypto-payments.ts
- [ ] 2.4 Migrate trading-service data to Prisma

## Phase 3: Fiat Payments (MPESA/PayPal Free Tiers)
- [ ] 3.1 MPESA Sandbox → Production (get live shortcode/passkey)
- [ ] 3.2 PayPal Sandbox → Live (basic account free)
- [ ] 3.3 payment-routes.ts: Switch to live mode, webhook verification
- [ ] 3.4 Banking reconciliation cron (Netlify scheduled functions)

## Phase 4: Live Crypto Trading (Free Tiers)
- [ ] 4.1 `npm i ccxt` - Binance testnet/Alpaca paper trading
- [ ] 4.2 Update crypto-trading.ts: Real testnet orders
- [ ] 4.3 CoinGecko Pro (free tier) + websocket prices
- [ ] 4.4 CryptoWallet model + Infura ETH testnet RPC (free)
- [ ] 4.5 User wallet deposits via QR/on-chain (no custody fees)

## Phase 5: Compliance Stubs (Live-Ready Structure)
- [ ] 5.1 KYC stub (manual admin approval)
- [ ] 5.2 AML monitoring (transaction limits already in banking)
- [ ] 5.3 User terms + verification flow

## Phase 6: Infrastructure (Free)
- [ ] 6.1 Upstash Redis free tier (sessions/rate limit)
- [ ] 6.2 Netlify Analytics (monitoring)
- [ ] 6.3 Load testing + optimization
- [ ] 6.4 Deploy to prod alias

## Commands to Run After Each Phase
```
npm run build
npx prisma generate
netlify deploy --prod --alias prod
```

## Progress Tracking
**Current Phase: 1 (0/6 complete)**  
**Est. Completion: 4 weeks**  
**Success Metric: Live MPESA deposits → testnet BTC trades → P2P banking**

*Updated: [2024-XX-XX]*

