# Pull Request: chore: clean package.json, secure public config, DB health check, mailer consolidation

This pull request consolidates a set of small but important maintenance and security fixes:

- Cleaned root package.json: removed merge artifacts, deduplicated dependencies, and normalized devDependencies.
- Replaced hardcoded public client config with a runtime-safe public-config.js loader that reads NEXT_PUBLIC_* meta tags (prevents secrets in repo).
- Implemented a Prisma-based database health check in src/config/database.ts (replaces an incorrect HTTP check against DATABASE_URL).
- Standardized mailer implementation by keeping the TypeScript mailer (src/utils/mailer.ts) and removing the duplicate JS implementation (src/utils/mailer.js now points to the TS file).

Verification checklist (manual):
- [ ] Run `npm ci` locally / CI and ensure install completes.
- [ ] Run `npm run type-check` and `npm run lint` successfully.
- [ ] Run `npx prisma generate` and ensure Prisma client is generated.
- [ ] Verify DB health: call the code path that uses `checkDatabase()` against a valid `DATABASE_URL`.
- [ ] Verify mailer: configure SMTP env vars in a safe test environment and call `sendEmail()` to confirm delivery, or observe console fallback.
- [ ] Rotate any keys if they were previously leaked in public files.

Notes:
- No secrets were added to the repo.
- The public config loader expects NEXT_PUBLIC_* values to be provided via meta tags at runtime or injected during build.
