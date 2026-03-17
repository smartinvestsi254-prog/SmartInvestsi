# TypeScript Refactoring TODO

## Phase 1: Core Types & Shared Interfaces (Complete)
- [x] Create netlify/functions/types.ts with shared NetlifyEvent, APIResponse, common bodies

## Phase 2: Priority Netlify Functions (Complete)
- [x] Refactor netlify/functions/signup.ts 
- [x] Refactor netlify/functions/portfolio-api.ts
- [x] Refactor netlify/functions/admin-api.ts
- [x] Refactor netlify/functions/paypalWebhook.ts
- [x] Refactor netlify/functions/payments-api.ts

## Phase 3: Secondary Functions
- Refactor login.ts, notifications-api.ts, etc. (20+ files)

## Phase 4: Utils & Services
- src/utils/*.ts, src/services/*.ts

## Validation
- Run netlify dev
- npm test
- Pre-commit linting
- Deploy & test APIs
