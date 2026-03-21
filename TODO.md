# Fintech Advancements Implementation Plan
SmartInvest- Enhancement Roadmap for Subscriptions, Admin Grants, Crypto, Banking + Workflow Integration

Status: **Services Reinstated** (MarketplaceService.ts, marketplace.ts created, schema updated w/ Product/Order. npm build ✅. Remaining: Partners/Shipping, full integration.)

## Phase 1: Database Schema Updates (4 steps)
- [x] 1.1 Update prisma/schema.prisma: Add UserProfile, Referral, SupportTicket models
- [x] 1.2 Create prisma migration: `npx prisma migrate dev --name add-fintech-models` (executed)
- [x] 1.3 Update seed.ts with sample data for new models
- [x] 1.4 Run `npx prisma generate` and test DB client (executed)

## Phase 2: Subscriptions & User Preferences (6 steps)
- [x] 2.1 Create src/services/PersonalizationService.ts (risk/goals recs)
- [x] 2.2 Create netlify/functions/personalization.ts API
- [x] 2.3 Add prefs form to dashboard.html
- [x] 2.4 Implement referral system (ReferralService.ts, netlify/functions/referrals.ts)
- [ ] 2.5 Update PREMIUM_ACCESS_IMPLEMENTATION.md with new features
- [ ] 2.6 Add GA4 tracking to key pages for traffic analysis

## Phase 3: Admin Closed-Loop Ticketing (5 steps)
- [ ] 3.1 Extend netlify/functions/admin-api.ts: ticket CRUD endpoints
- [ ] 3.2 Update admin.html + create admin/tickets.js UI
- [ ] 3.3 Add SupportTicket workflows (assign/resolve/NPS)
- [ ] 3.4 Auto-grant on ticket resolution
- [ ] 3.5 Update ADMIN_QUICK_REFERENCE.md

## Phase 4: Crypto Wallet/Trading Advancements (6 steps)
- [ ] 4.1 Integrate CoinGecko API in crypto-trading.ts (live prices)
- [ ] 4.2 Add WalletConnect/MetaMask to crypto-trading.html
- [ ] 4.3 Create netlify/functions/crypto-live.ts (DEX quotes via 1inch)
- [ ] 4.4 Update AssetHolding sync with on-chain data (Moralis/Alchemy prep)
- [ ] 4.5 Add DeFi yields calculator to premium-calculators.html
- [ ] 4.6 Update TODO-crypto-trading.md as COMPLETE

## Phase 5: Banking System Enhancements (5 steps)
- [ ] 5.1 Integrate Stripe/M-Pesa live ramps in advanced-banking.ts
- [ ] 5.2 Add yields service (mock Aave rates)
- [ ] 5.3 banking-dashboard.html: Add ramp UI + yields display
- [ ] 5.4 Transaction notifications via NotificationService
- [ ] 5.5 Update ADVANCED_BANKING_README.md

## Phase 6: Website Workflow Integration & Revenue (2 steps)
- [ ] 6.1 Update key flows: Signup→Prefs→Recs→Premium Upsell→Dashboard
- [ ] 6.2 Add affiliate/referral banners to home.html, pricing.html

## Testing & Deployment (3 steps)
- [ ] 7.1 Add unit/integration tests for new services
- [ ] 7.2 Manual E2E: Full user journey (prefs→trade→bank→ticket)
- [ ] 7.3 Deploy: `netlify deploy --prod` + `npx prisma db push`

## Updated Website Workflow (Appended)
1. **Visitor → Signup/Login** (home.html → signup.html → dashboard.html)
2. **Onboarding: Set Preferences** (risk/goals/profile → AI recs + premium upsell)
3. **Dashboard: Personalized Feed** (portfolios, recs, referral link, yields)
4. **Crypto/Banking Actions** (wallet connect → trade/deposit → P2P txns)
5. **Support Issues → Tickets** (chat-support.js → admin tickets → auto-grant if service)
6. **Growth Loop: Referrals → Auto-premium trials → Revenue**

**Legend:** [ ] TODO | [x] DONE  
**Est. Time:** 2-3 days | **Priority:** High Impact Revenue/Security
