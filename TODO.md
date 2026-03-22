# TypeScript Fixes + Multi-DB Fallback Plan
SmartInvest- Production Fintech Build (Prisma v7 + Supabase + MongoDB)

Status: **PLAN APPROVED** | Keep both servers | Multi-DB fallback

## Step 1: Fix TS Errors (Current) ✅
- [ ] 1.1 `src/routes/priority-features.ts`: Define 4 helpers + dbClient
- [ ] 1.2 `src/server-DESKTOP-5N5S14R.ts`: Fix login syntax + dbClient + Supabase/MongoDB fallback
- [ ] 1.3 Test: `npm run build &amp;&amp; npm run start` (both servers)

## Step 2: Multi-DB Architecture (Seamless Fallback)
```
Primary: Prisma/PostgreSQL (Production)
Fallback1: Prisma/Supabase (schema exists)
Fallback2: MongoDB (Codespace connection)
```
- [ ] 2.1 Enhance `src/lib/db-client.ts`: Dynamic fallback (health check → switch)
- [ ] 2.2 `src/server.ts`: Use enhanced dbClient
- [ ] 2.3 `src/server-DESKTOP-5N5S14R.ts`: Supabase-first + Prisma/MongoDB fallback
- [ ] 2.4 Netlify functions: Already Supabase-linked (prisma/Supabase connect/)

## Step 3: MongoDB Integration
- [ ] 3.1 Verify MongoDB connection (`lib/mongodb.ts`)
- [ ] 3.2 Create `lib/mongodb-client.ts` (singleton)
- [ ] 3.3 Hybrid queries: Prisma → MongoDB fallback for non-relational data

## Step 4: Test & Deploy
- [ ] 4.1 Unit tests: DB failover
- [ ] 4.2 E2E: `npm run dev` → Load test
- [ ] 4.3 Deploy: Netlify + Render (Supabase primary)

**Next**: Fix TS errors → Multi-DB client → Test both servers

