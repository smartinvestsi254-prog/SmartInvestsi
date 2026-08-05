# Task Progress Tracker

## Objective
1. Fix Supabase URL typo (`mylsjhueujnuwahzzjhz` -> `mylsjheuejnuwahzzjhz`) and make the variable configurable via Netlify environment variables.
2. Check that all files are complete and none are truncated.
3. Move SmartGovern files to the smartgovern repo and remove all associated files from the SmartInvestsi repo, separating them entirely.
4. Ensure all repo project structures and file placements are correct and in order.

## Part A — Fix Supabase URL typo & make env-configurable (Netlify)
- [ ] A1. Fix typo in `public/js/public-config.js` (mylsjhueujnuwahzzjhz -> mylsjheuejnuwahzzjhz)
- [ ] A2. Fix typo in `.cursor/mcp.json` project_ref
- [ ] A3. Make config env-driven via Netlify: add build script to generate config from env vars
- [ ] A4. Update `netlify.toml` build command to inject env vars
- [ ] A5. Update `.env.example` and docs to reflect env-var-driven config

## Part B — Move SmartGovern backend into smartgovern repo (self-contained apps/smartgovern/)
- [ ] B1. Create `apps/smartgovern/` structure in the smartgovern repo
- [ ] B2. Copy backend routes/services/config/lib into smartgovern repo
- [ ] B3. Copy `prisma/schemas/smartgovern.prisma` + prisma.config.ts into smartgovern repo
- [ ] B4. Copy the shared packages needed (shared-security, shared-utils) into smartgovern repo
- [ ] B5. Rewrite relative imports in moved files to be self-contained
- [ ] B6. Remove `apps/smartgovern/` from SmartInvestsi repo
- [ ] B7. Remove `prisma/schemas/smartgovern.prisma` from SmartInvestsi repo
- [ ] B8. Remove governance-only files from SmartInvestsi repo (src/licensing, src/incidents, src/workflows, policy-compliance.ts)
- [ ] B9. Fix root `prisma/prisma.config.ts` to point only to smartinvestsi.prisma
- [ ] B10. Update root `netlify.toml` and `package.json` to remove smartgovern references

## Part C — Verify completion & structure
- [ ] C1. Verify no governance references remain in SmartInvestsi repo
- [ ] C2. Verify smartgovern repo is self-contained and builds
- [ ] C3. Verify Supabase URL typo is gone everywhere
- [ ] C4. Confirm all edited files are complete (not truncated)
