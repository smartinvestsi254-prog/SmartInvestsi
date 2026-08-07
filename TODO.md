# SmartInvestsi Monorepo Refactor & CI/CD Recovery — Task Tracker

Status legend: `[x]` done · `[~]` in progress · `[ ]` pending

## Phase 1 — Repository Audit
- [x] Inventory apps/, packages/, prisma/, netlify/, src/, tests
- [x] Identify duplicate implementations (auth hashing, env, security middleware)
- [ ] Generate `docs/Migration.md` migration report

## Phase 2 — Finish the Monorepo Foundation
- [ ] Convert root `package.json` to npm-workspaces root
- [ ] Add root `tsconfig.base.json` (strict, incremental)
- [ ] Add per-package `tsconfig.json` (composite) and build scripts
- [ ] Add per-app `tsconfig.json` with `@smartinvest/*` path mapping
- [ ] Replace relative `../../packages/*` imports with `@smartinvest/*` package imports
- [ ] Move governance code out of smartinvestsi and fintech out of smartgovern (verify)
- [ ] Create `configs/` directory with shared tooling configs

## Phase 3 — Remove Duplicate Code
- [ ] Unify password hashing on `@smartinvest/shared-security` (scrypt), remove bcrypt from smartgovern
- [ ] Deduplicate auth middleware into shared-security
- [ ] Deduplicate env loader / response helpers / error utilities into shared-utils

## Phase 4 — Shared Packages
- [ ] `shared-security`: JWT, hashing, RBAC, permissions, audit, CSRF, helmet, rate-limit, TOTP, sessions
- [ ] `shared-utils`: pagination, formatting, env loader, email/phone validation, date, logging, responses, errors
- [ ] `shared-types`: API contracts, DTOs, enums, interfaces, events
- [ ] `shared-ui`: reusable frontend tokens/components

## Phase 5 — Prisma Cleanup
- [ ] Remove legacy `prisma/schema.prisma`
- [ ] Fix/remove broken `prisma/seed.ts`
- [ ] Add initial migrations for smartinvestsi + smartgovern schemas
- [ ] Validate both schemas generate

## Phase 6 — package.json Fixes
- [ ] Fix root package.json scripts
- [ ] Fix app package.json (deps, scripts, workspace references)
- [ ] Fix package package.json (exports, main, types)
- [ ] Remove unused deps, add missing

## Phase 7 — Environment Management
- [ ] Root `.env.example`
- [ ] `apps/smartinvestsi/.env.example`
- [ ] `apps/smartgovern/.env.example`
- [ ] Zod validation documented

## Phase 8 — Build System
- [ ] TypeScript strict builds for both apps
- [ ] No circular deps / path alias issues
- [ ] Incremental compilation enabled

## Phase 9 — Testing
- [ ] Jest config for apps + packages
- [ ] Tests: shared-security, shared-utils
- [ ] Tests: smartinvestsi auth/payments/trading
- [ ] Tests: smartgovern workflows/incidents/licensing
- [ ] Coverage thresholds configured

## Phase 10 — CI/CD Repair
- [ ] `.github/workflows/ci.yml`
- [ ] `.github/workflows/deploy.yml`
- [ ] `.github/workflows/security.yml` (Dependabot, CodeQL, npm audit)
- [ ] `.github/dependabot.yml`
- [ ] Workflows: checkout, Node LTS, cache, npm ci, prisma generate, lint, typecheck, test, build

## Phase 11 — Netlify
- [ ] Repair root `netlify.toml`
- [ ] Add `apps/smartgovern/netlify.toml`
- [ ] Serverless functions/redirects/headers verified

## Phase 12 — Documentation
- [ ] `README.md`
- [ ] `docs/Architecture.md`
- [ ] `docs/Contributing.md`
- [ ] `docs/Deployment.md`
- [ ] `docs/Environment.md`
- [ ] `docs/Packages.md`
- [ ] `docs/API.md`
- [ ] `docs/Migration.md`

## Phase 13 — Code Quality
- [ ] ESLint config fixed and lint passes
- [ ] Prettier configured
- [ ] Unused imports/deps/variables removed

## Phase 14 — Performance
- [ ] Prisma include/query review
- [ ] Indexes verified in schemas

## Phase 15 — Security Review
- [ ] Helmet, CORS, JWT, RBAC, CSRF, rate-limit, hashing verified
- [ ] Secrets management documented

## Phase 16 — Final Validation
- [ ] All builds/tests/lint/typecheck pass (requires Node)
- [ ] Deliverables documented in `docs/Migration.md`

