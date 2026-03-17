# SmartInvest DB Failover Implementation TODO

Status: [IN PROGRESS] - Step 3/12 complete (db-client.ts created)

## Steps:

1. ✅ **Created this TODO**
2. Update .env.example + src/config.ts (add NETLIFY_DB_URL, DB_CONFIG)
3. ✅ Create src/lib/db-client.ts (Prisma failover wrapper, health checks, Mongo state)
4. ✅ Update src/lib/prisma.ts & netlify/functions/lib/prisma.ts (export dbClient)
5. ✅ Failover state in MongoDB (db-client handles)
6. ✅ Create netlify/functions/admin-db-failover.ts (endpoints: status, toggle)
7. Enhance netlify/functions/notifications.ts (admin alert on switch)
8. Update admin.html JS (wire toggleFallbackBtn to new endpoints)
9. Add DB health to admin-service.ts metrics + crisis flags
10. Search/replace prisma imports → dbClient in all files (use search_files)
11. Test: Manual toggle, simulate Supabase fail, auto-switch, revoke, alerts
12. Deploy: npx prisma generate, netlify deploy, docs update
13. attempt_completion

## Notes:
- User must add NETLIFY_DB_URL to Netlify env (get from Netlify Dashboard > Postgres)
- Run `npx prisma db push` with NETLIFY_DB_URL to sync schema
- State in MongoDB collection 'dbStatus'
- Health check: Simple SELECT 1 query every 30s

