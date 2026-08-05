# SmartGovern

Government Administration, Workflow, Incident, Diplomacy & Treaty Management Platform

## Overview

SmartGovern is a complete independent platform separated from SmartInvestsi. It provides:

- **Incident Management** - Track, manage, and resolve incidents with severity levels
- **Workflow Management** - Content review, approval, and publishing workflows
- **Diplomacy Portal** - Manage missions, treaties, delegations, and diplomatic documents
- **Data Licensing** - Partner management, data entitlements, and usage tracking
- **Government Administration** - User management, role-based access control

## Architecture

```
SmartGovern/
├── prisma/
│   └── schema.prisma          # Database schema (PostgreSQL)
├── src/
│   ├── server.ts              # Main Express server
│   ├── auth/middleware.ts      # Authentication & authorization
│   ├── incidents/service.ts    # Incident management service
│   ├── workflows/engine.ts     # Workflow engine
│   ├── licensing/entitlements.ts # Data licensing
│   └── routes/                 # API routes
├── netlify.toml               # Netlify deployment config
├── package.json               # Dependencies & scripts
└── tsconfig.json              # TypeScript configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login

### Incidents
- `POST /api/incidents` - Create incident
- `GET /api/incidents` - List incidents
- `GET /api/incidents/:id` - Get incident details
- `PATCH /api/incidents/:id/status` - Update incident status

### Workflows
- `POST /api/workflows/submit` - Submit content for review
- `POST /api/workflows/review` - Record review decision
- `POST /api/workflows/publish` - Publish approved content
- `GET /api/workflows` - List workflows

### Diplomacy
- Missions CRUD at `/api/diplomacy/missions`
- Treaties CRUD at `/api/diplomacy/treaties`
- Delegations CRUD at `/api/diplomacy/delegations`
- Documents CRUD at `/api/diplomacy/documents`

### Data Licensing
- `GET /api/licensing/partners` - List partners
- `POST /api/licensing/check` - Check data entitlement

### Admin
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/role` - Update user role
- `GET /api/admin/stats` - System statistics

## Getting Started

1. Install dependencies: `npm install`
2. Set up database: `npm run prisma:migrate:dev`
3. Seed data: `npm run prisma:seed`
4. Start development: `npm run dev`

## Environment Variables

Copy `.env.example` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `SENTRY_DSN` - Sentry error tracking (optional)
- `ADMIN_REG_SECRET` - Admin registration secret

## Deployment

Deploy to Netlify:
```
netlify deploy --prod --dir=dist