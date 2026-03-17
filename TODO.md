# SmartInvest Config Refactor TODO

## Plan Steps:
- [x] 1. Create src/config.ts with non-secret configs
- [x] 2. Edit netlify/functions/payments-api.ts to use config
- [x] 3. Edit netlify/functions/createOrder.ts to use config
- [x] 4. Edit netlify/functions/manual-mpesa-payment.ts to use config
- [x] 5. Edit src/config/payment-services.config.ts to use config
- [ ] 6. Extract crypto receiver addresses to config.ts and update crypto-payments.ts if needed
- [ ] 7. Verify/test payment flows (manual)
