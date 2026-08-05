# SmartInvestsi / SmartGovern Refactor — Master Task List

## Phase 1: Database Refactor
- [x] Create `prisma/schemas/smartinvestsi.prisma` (fintech-only models)
- [x] Create `prisma/schemas/smartgovern.prisma` (governance-only models)
- [x] Remove cross-domain coupling
- [x] App-level prisma.config.ts for both apps

## Phase 2: Shared Packages
- [x] Enhance `packages/shared-security` (CSRF, TOTP, refresh tokens, audit, plan enforcement)
- [x] Expand `packages/shared-types`
- [x] Expand `packages/shared-utils` (env, crypto, pagination)
- [x] Create `packages/shared-ui` (design tokens/README)

## Phase 3: SmartInvestsi App
- [x] Config / env
- [x] Auth service (JWT + refresh + session revocation)
- [x] Middleware (requirePlan, authRequired, adminRequired)
- [x] Routes: auth, profiles, subscriptions, payments (M-Pesa/PayPal), portfolios, trading, wallets, referrals, notifications, KYC, support, admin, analytics, market-data, AI assistant, fraud
- [x] Services for all domains
- [x] `apps/smartinvestsi/src/app.ts` + `server.ts`
- [x] `apps/smartinvestsi/package.json` + `tsconfig.json`

## Phase 4: SmartGovern App
- [x] Scaffold created (empty)
- [x] Config / env
- [x] Middleware (auth, RBAC)
- [x] Routes: workflows, incidents, licensing, diplomacy, treaties, delegations, compliance, organizations, admin
- [x] Services spanning governance domains
- [x] `apps/smartgovern/src/app.ts` + `server.ts`
- [x] `apps/smartgovern/package.json` + `tsconfig.json`

## Phase 5: Environment Variables
- [x] Generate `.env.example` with SAFE_TO_COMMIT / SECRET_REQUIRED classification
- [x] Remove hardcoded secrets (Sentry DSN, etc.)

## Phase 6: Security Corrections
- [x] Helmet, rate limiting, CSRF, Zod validation, audit logging
- [x] Refresh tokens, session revocation, device tracking, TOTP 2FA
- [x] Webhook verification, secure cookies
- [x] Fix admin bypass (`x-admin` header), password hashing (bcrypt)

## Phase 7: Payment Corrections
- [x] M-Pesa: callback verification, reconciliation, retries, replay prevention
- [x] PayPal: webhook verification, renewals, cancellations, disputes, failed payments

## Phase 8: KYC Workflow
- [x] ID/passport/selfie/address upload
- [x] Admin review/approval workflow
- [x] Audit trail

## Phase 9: Subscription Enforcement
- [x] `requirePlan("BASIC"|"PREMIUM"|"ENTERPRISE")` middleware
- [x] Protect premium endpoints

## Phase 10: Trading System
- [x] Position tracking, risk controls, stop-loss/take-profit, trade history, order validation, portfolio reconciliation

## Phase 11: Deployment
- [ ] `netlify.toml`
- [ ] Deployment checklist
- [ ] Environment checklist

## Phase 12: Tests
- [ ] Unit, integration, security, payment, KYC, API tests

## Phase 13: Documentation
- [ ] ARCHITECTURE.md
- [ ] SECURITY.md
- [ ] DEPLOYMENT.md
- [ ] SMARTINVESTSI.md
- [ ] SMARTGOVERN.md
- [ ] MIGRATION_PLAN.md

## Phase 14: Final Deliverables Report
- [ ] Architecture report
- [ ] README updates

