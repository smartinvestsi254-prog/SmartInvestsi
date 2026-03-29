## Live/Transactional Services Migration TODO

### Status: In Progress ✅

**Completed:**
- [x] Create TODO.md

**Step 1: Environment & Dependencies** ✅
- [x] Validate/run `node scripts/validate-env.ts` ✓
- [x] ccxt/prisma deps exist (stripe/paypal optional)
- [x] Prisma push executed

**Step 2: Priority Edits (payments/crypto-trading)**
- [x] Edit netlify/functions/payments-api.ts: Remove mocks → Prisma Payment/Subscription (live ✅)"
- [x] Edit netlify/functions/crypto-trading.ts: Mocks → CCXT + prisma.transaction/holding (live ✅)"
- [ ] Test: POST /payments-api/history, POST /crypto-trading/orders GET /market/BTCUSDT

**Step 3: Secondary Files**
- [ ] Edit netlify/functions/fraud-api.ts: Mocks → prisma.incident/event
- [ ] Edit netlify/functions/createOrder.ts: Real PayPal always
- [ ] Edit netlify/functions/manual-mpesa-payment.ts: Prisma Payment

**Step 4: Validation & Cleanup**
- [ ] Test all endpoints
- [ ] Deploy Netlify functions
- [ ] Move tools/simulate_*.js to docs/
- [ ] Update README with live service docs

**Step 5: Completion**
- [ ] attempt_completion

