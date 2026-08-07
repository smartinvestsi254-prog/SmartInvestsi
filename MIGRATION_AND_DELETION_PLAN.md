# SmartInvestsi & SmartGovern Migration & Deletion Plan

## EXECUTIVE SUMMARY

**Status**: Fresh migration setup required - no existing migrations found.
**Schema Split**: Complete and correct - two separate Prisma schemas properly defined.

---

## SECTION 1: MIGRATIONS REQUIRED

### SmartInvestsi (Fintech Platform)
**Schema**: `prisma/schemas/smartinvestsi.prisma`
**App Config**: `apps/smartinvestsi/prisma.config.ts`
**Migration Command**:
```bash
cd apps/smartinvestsi
npm run prisma:migrate:dev -- --name init
```

**Models**: 30
- User, UserProfile, AuthSession
- SubscriptionPlan, Subscription, PaymentTransaction
- Portfolio, Holding, Transaction, PortfolioPerformance, Rebalance, Dividend
- TradeOrder, TradeFill, Position
- Wallet, WalletTransaction, BankAccount, BankTransfer
- PriceAlert, AlertNotification, MarketData
- Referral, Notification
- KycDocument, KycVerification
- FraudCheck
- SupportTicket, ChatMessage
- AuditLog

**Enums**: 18
- UserRole, SubscriptionStatus, PaymentStatus, PaymentProvider, PaymentType
- AssetType, TransactionType, RebalanceStatus
- WalletTransactionType, TransferStatus
- AlertCondition, ReferralStatus, ReferralRewardTier
- KycStatus, KycDocumentType, FraudRiskLevel
- TicketStatus, TicketPriority, OrderStatus, OrderSide, OrderType, PositionStatus

### SmartGovern (Governance Platform)
**Schema**: `prisma/schemas/smartgovern.prisma`
**App Config**: `apps/smartgovern/prisma.config.ts`
**Migration Command**:
```bash
cd apps/smartgovern
npm run prisma:migrate:dev -- --name init
```

**Models**: 24
- GovernmentUser, Organization, Session
- Workflow, WorkflowStep, WorkflowEvent, WorkflowApproval
- Incident, IncidentEvent, IncidentUpdate, IncidentLog
- LicensePartner, DataLicense, LicenseHolder, DataEntitlement, DataUsageLog
- DiplomacyMission, Treaty, Delegation, DiplomacyDocument
- Policy, ComplianceRecord
- CooperationRecord
- AuditLog

**Enums**: 13
- GovernmentRole, WorkflowState, WorkflowStepType
- IncidentSeverity, IncidentStatus
- LicenseStatus, DataUsagePurpose
- MissionType, MissionStatus, TreatyStatus, DelegationStatus
- DocumentCategory, DocumentClass
- PolicyStatus, ComplianceStatus

---

## SECTION 2: FILES TO DELETE

### CRITICAL - Delete Immediately
```
prisma/schema.prisma                    # Root schema - superseded by split schemas
prisma/prisma.config.ts                 # Root config - use app-level configs
src/                                    # Root source - legacy code
```

### HIGH PRIORITY - Review Then Delete
```
prisma/Supabase connect/                # Legacy Supabase integration - verify not needed
admin/                                  # Legacy admin panel
api/                                    # Legacy API endpoints
trading-service/                        # Legacy trading service
wwwroot/                                # Legacy web root
```

### MEDIUM PRIORITY - Legacy Static Files
```
# All HTML files at root (70+ files)
index.html, login.html, signup.html, dashboard.html
admin.html, wallet.html, portfolio.html, trading.html
# ... and all other .html files
```

### MEDIUM PRIORITY - Legacy Scripts
```
enforce-IP.ts
rate-limiting.js
chat-support.js
security-integration.js
sentrydsn.js
test-security.js
```

### LOW PRIORITY - Configuration Cleanup
```
# Root-level configs (move to apps if needed)
.env.production.txt
env.ts
env.client.ts
.eslintrc.json
.prettierrc
tsconfig.json
tsconfig.base.json
jest.config.ts
k8s.yaml
netlify.toml
vercel.json
```

### CLEANUP - Documentation & Misc
```
FILES_CREATED.txt
TODO.md
TODO-FIXES.md
TODO-package-ci-cd-fixes.md
TODO-security.md
TODO-steps.md
pre-commit
%APPDATA%npm/                           # System directory
```

---

## SECTION 3: POST-MIGRATION STEPS

### 1. Create SmartInvestsi Migration
```bash
cd apps/smartinvestsi
npm run prisma:generate
npm run prisma:migrate:dev -- --name init
```

### 2. Create SmartGovern Migration
```bash
cd apps/smartgovern
npm run prisma:generate
npm run prisma:migrate:dev -- --name init
```

### 3. Verify Both Apps
```bash
# SmartInvestsi
cd apps/smartinvestsi
npm run build
npm run type-check

# SmartGovern
cd apps/smartgovern
npm run build
npm run type-check
```

### 4. Execute Deletions
```bash
# Delete in order:
rm prisma/schema.prisma
rm prisma/prisma.config.ts
rm -rf src/
rm -rf admin/
rm -rf api/
rm -rf trading-service/
rm -rf wwwroot/
# Review prisma/Supabase connect/ before deleting
```

---

## SECTION 4: CRITICAL NOTES

1. **NO EXISTING MIGRATIONS** - Both schemas require initial migrations
2. **Schema design is correct** - No model changes needed, only migrations
3. **App structure is correct** - Both apps properly configured with separate schemas
4. **Cleanup required** - Significant legacy code at root level needs removal
5. **Review Supabase connect/** - May contain sensitive data or active code

---

## SECTION 5: VERIFICATION CHECKLIST

- [ ] SmartInvestsi migration created successfully
- [ ] SmartGovern migration created successfully
- [ ] Both apps build without errors
- [ ] Both apps type-check without errors
- [ ] Root schema.prisma deleted
- [ ] Root src/ directory deleted
- [ ] Legacy directories removed (admin/, api/, trading-service/, wwwroot/)
- [ ] Supabase connect/ reviewed and cleaned
- [ ] All HTML files removed from root
- [ ] Legacy scripts removed
- [ ] Documentation consolidated