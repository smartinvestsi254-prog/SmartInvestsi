# Sentry Instruments Implementation TODO

## Plan Breakdown (Approved)
1. [✅] **Create** netlify/functions/instruments.mjs - Full Sentry Node init (errors, logs, metrics, tracing, profiling)
2. [ ] **Edit** src/server.ts - Replace partial init → import instruments.mjs
3. [✅] **Install** deps in netlify/functions/: @sentry/node @sentry/profiling-node  
4. [✅] **Test** Sentry verify: `tsx tools/sentry-verify.ts`
5. [✅] **Verify** server start: `tsx src/server.ts` (no import errors)  
6. [✅] **Consolidate** - search_files for duplicates + cleanup (0 duplicates found)
7. [ ] **Complete** - attempt_completion

**Current Step:** 7/7
