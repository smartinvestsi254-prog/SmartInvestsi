HEAD
# SmartInvest

Static landing pages plus a Node/TypeScript backend for workflows, incidents, and licensing checks.

## What’s inside
- Static HTML landing and calculators (see `index.html`, `calculator.html`, `tools/`).
- Legacy Express server in `server.js` for M-Pesa/PayPal demos, admin UI, and premium flows.
- New TypeScript/Express API in `src/server.ts` using Prisma/PostgreSQL for content workflows, incident tracking, and dataset entitlement checks.
- Webhook and simulator scripts in `tools/` and `docs/webhooks.md`.

## Quick start (API + Prisma)
1. Copy env file: `cp .env.example .env` and fill values (DB, admin creds, M-Pesa/PayPal keys if needed).
2. Install deps: `npm install`.
3. Sync DB: `npm run db:push` (or `npx prisma migrate dev --name init` if you want a migration history).
4. Seed demo data (users, workflows, licenses, incidents): `npm run seed`.
5. Run the API: `npm run dev` (listens on `PORT`, default `3001`). Health at `/health`.

### Seeded users (use `x-user-id` header)
- `user-admin` (admin@example.com)
- `user-editor` (editor@example.com)
- `user-reviewer` (reviewer@example.com)
- `user-analyst` (analyst@example.com)
- `user-ic` (ic@example.com)

### API snapshots
- Workflows: `POST /api/workflows/submit { contentId }`, `POST /api/workflows/decision { workflowId, decision }`, `POST /api/workflows/publish { contentId }`.
- Incidents: `POST /api/incidents` and `POST /api/incidents/:id/status` (ADMIN or INCIDENT_COMMANDER).
- Licensing: `POST /api/data/request { datasetKey, purpose, requestMeta? }` checks entitlements and logs usage. Seeded datasets: `market-data`, `risk-scores`.

## Legacy payments / admin server
- Run `node server.js` (uses `PORT` default 3000) for M-Pesa STK, PayPal sandbox, KCB manual payments, and the admin UI (`/admin.html`).
- Configure M-Pesa (`MPESA_*`), PayPal (`PAYPAL_*`), admin basic auth (`ADMIN_USER`/`ADMIN_PASS`), mail (`SMTP_*`), and bank details in `.env`.
- Simulators: `tools/pochi-test.js`, `tools/simulate_kcb_mark_paid.js`, and webhook helpers in `docs/webhooks.md`.

## Static site preview
- Quick preview: `python3 -m http.server 8000 --directory .` then open <http://localhost:8000/index.html>.

## Scripts
- `npm run dev` — start TypeScript API with ts-node.
- `npm run build` — compile to `dist/`.
- `npm start` — run compiled server.
- `npm run db:push` — push Prisma schema to the database.
- `npm run db:generate` — regenerate Prisma client.
- `npm run seed` — create demo users/content/licenses/incidents.

## License
This repository includes a `LICENSE` file; adjust if your deployment needs different terms.
=======
# SmartInvestsi-
1a4d332fd9093ba63c5a11c69a175eeadac13578
