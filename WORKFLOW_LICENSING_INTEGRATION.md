# SmartInvest - Workflow, Incident & Licensing Integration

This integration adds comprehensive workflow management, incident response, and licensing/entitlement features to the SmartInvest platform.

## Features Added

### 1. **Workflow Management** (`src/workflows/engine.ts`)
- Content review and approval workflows
- State machine with validation
- Role-based access control
- Workflow events and audit trail

**Endpoints:**
- `POST /api/workflows/submit` - Submit content for review
- `POST /api/workflows/decision` - Record review decision (approve/reject/request changes)
- `POST /api/workflows/publish` - Publish approved content

### 2. **Incident Response** (`src/incidents/service.ts`)
- Create and track incidents
- Severity levels (CRITICAL, HIGH, MEDIUM, LOW)
- Status tracking (OPEN, INVESTIGATING, MITIGATING, RESOLVED, CLOSED)
- Timeline and update history
- Runbook integration

**Endpoints:**
- `POST /api/incidents` - Create new incident
- `POST /api/incidents/:id/status` - Update incident status

### 3. **Licensing & Entitlements** (`src/licensing/entitlements.ts`)
- License validation for data usage
- Purpose-based access control
- Usage logging for compliance
- Partner management
- Rate limiting support

**Endpoints:**
- `POST /api/data/request` - Check entitlement and log usage

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/smartinvest"
PORT=3001
```

3. Initialize Prisma and migrate database:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. Build TypeScript:
```bash
npm run build
```

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Database Schema

The integration uses Prisma ORM with PostgreSQL. Key models include:

- **User** - User accounts with role-based permissions
- **Workflow** - Content review workflows
- **WorkflowEvent** - Audit trail for workflow changes
- **Incident** - Incident tracking and response
- **DataLicense** - Partner licensing agreements
- **DataUsageLog** - Compliance logging

## Authentication

The server uses a simple header-based authentication for demonstration:
- Send `x-user-id` header with requests
- Production systems should use JWT or OAuth2

## API Usage Examples

### Submit Content for Review
```bash
curl -X POST http://localhost:3001/api/workflows/submit \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{"contentId": "content-456"}'
```

### Create Incident
```bash
curl -X POST http://localhost:3001/api/incidents \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "title": "Service Outage",
    "summary": "Payment processing down",
    "severity": "CRITICAL",
    "runbookKey": "payment-outage"
  }'
```

### Check Data Entitlement
```bash
curl -X POST http://localhost:3001/api/data/request \
  -H "Content-Type: application/json" \
  -d '{
    "datasetKey": "market-data-feed",
    "purpose": "ANALYTICS"
  }'
```

## File Structure

```
/workspaces/SmartInvest-/
├── src/
│   ├── server.ts                      # Main Express server
│   ├── workflows/
│   │   └── engine.ts                  # Workflow management logic
│   ├── incidents/
│   │   └── service.ts                 # Incident response logic
│   └── licensing/
│       └── entitlements.ts            # Licensing/entitlement logic
├── prisma/
│   └── schema.prisma                  # Database schema
├── package.json                       # Dependencies
└── tsconfig.json                      # TypeScript config
```

## User Roles

- **ADMIN** - Full system access
- **EDITOR** - Can create and publish content
- **REVIEWER** - Can review and approve content
- **ANALYST** - Can submit content for review
- **INCIDENT_COMMANDER** - Can manage incidents
- **VIEWER** - Read-only access

## Next Steps

1. Configure database connection
2. Run migrations: `npx prisma migrate dev`
3. Seed initial data (users, partners, licenses)
4. Set up authentication/authorization
5. Integrate with existing SmartInvest features
6. Add monitoring and logging
7. Configure rate limiting
8. Set up CI/CD pipeline

## Support

For questions or issues, refer to the inline documentation in each module.
