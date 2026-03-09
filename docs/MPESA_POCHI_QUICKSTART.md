# M-Pesa Pochi Integration Quick Start

## 5-Minute Setup

### 1. Update Environment Variables

```bash
# Copy .env and add:
MPESA_ENV=sandbox
MPESA_NUMBER=your_shortcode              # Your Pochi Short Code from Safaricom
MPESA_PASSKEY=your_passkey_here          # From Safaricom Daraja Portal
MPESA_POCHI_NAME=SmartInvest
MPESA_CALLBACK_URL=https://smartinvestsi.com/api/pochi/callback
```

### 2. Mount Routes in server.js

```javascript
const pochiRoutes = require('./src/routes/pochi-routes');
app.use('/api/pochi', pochiRoutes);
```

### 3. Add Frontend Code

```html
<div id="payment-widget">
  <input type="tel" id="pochiPhone" placeholder="Enter M-Pesa number">
  <input type="number" id="pochiAmount" placeholder="Amount (KES)" value="100">
  <button onclick="payWithPochi()">Pay Now</button>
</div>

<script src="/js/pochi-payment-handler.js"></script>
<script>
  const pochi = new PochiPaymentHandler({
    callbacks: {
      onSuccess: (result) => {
        console.log('✓ Payment successful!', result);
        // Update user premium status, show success message, etc.
      },
      onFailure: (result) => {
        console.log('✗ Payment failed', result);
      }
    }
  });

  async function payWithPochi() {
    const phone = document.getElementById('pochiPhone').value;
    const amount = document.getElementById('pochiAmount').value;
    await pochi.initiateStkPush(phone, amount, 'Premium-Access');
  }
</script>
```

## File Structure

```
SmartInvest-/
├── src/
│   ├── lib/
│   │   └── mpesa-pochi.js              # Core Pochi integration class
│   └── routes/
│       └── pochi-routes.js             # Express API routes
├── public/
│   └── js/
│       └── pochi-payment-handler.js    # Frontend payment handler
├── docs/
│   └── MPESA_POCHI_INTEGRATION.md      # Full documentation
├── tools/
│   └── pochi-test.js                   # Testing & simulation
└── server.js                            # Main server file (add routes here)
```

## API Endpoints Ready to Use

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pochi/stk-push` | POST | Send payment prompt to user phone |
| `/api/pochi/query-stk` | POST | Check if payment was completed |
| `/api/pochi/callback` | POST | Webhook for real-time payments |
| `/api/pochi/b2c-payment` | POST | Send money to customers |
| `/api/pochi/balance` | GET | Check account balance |
| `/api/pochi/test` | GET | Test connection |

## Testing

```bash
# Test connection
curl http://localhost:3000/api/pochi/test

# Send payment prompt
curl -X POST http://localhost:3000/api/pochi/stk-push \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254700000000",
    "amount": 100,
    "accountReference": "Order-123"
  }'

# Query payment status
curl -X POST http://localhost:3000/api/pochi/query-stk \
  -H "Content-Type: application/json" \
  -d '{"checkoutRequestId": "ws_CO_DMZ_xxx"}'
```

## Common Tasks

### Grant Premium After Payment

```javascript
// In your callback handler
pochi.callbacks.onSuccess = async (result) => {
  // Grant 30 days premium access
  await fetch('/api/admin/grant-premium', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      days: 30,
      reason: `Payment ${result.checkoutId}`
    })
  });
};
```

### Check Balance (Admin)

```javascript
const balance = await fetch('/api/pochi/balance', {
  headers: { 'Authorization': 'Bearer admin-token' }
});
const data = await balance.json();
console.log(data);
```

### Send Refund to Customer

```javascript
const refund = await fetch('/api/pochi/b2c-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-token'
  },
  body: JSON.stringify({
    phoneNumber: '254700000000',
    amount: 100,
    description: 'Refund for order XYZ'
  })
});
```

## Production Checklist

- [ ] Get production credentials from Safaricom
- [ ] Set `MPESA_ENV=production` in .env
- [ ] Update `MPESA_CALLBACK_URL` to production domain
- [ ] Implement database tracking for payments
- [ ] Add email confirmations for successful payments
- [ ] Set up payment monitoring and alerts
- [ ] Test with real M-Pesa transactions (small amount)
- [ ] Document your implementation
- [ ] Train admin users on payment system
- [ ] Set up customer support documentation

## Troubleshooting

**Error: "Invalid credentials"**
- Check MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET
- Regenerate credentials on Safaricom Daraja portal

**Error: "Request timeout"**
- User didn't enter M-Pesa PIN within 2 minutes
- Client will automatically retry, or user can try again

**Not receiving callbacks**
- Ensure MPESA_CALLBACK_URL is publicly accessible
- Verify domain is HTTPS only
- Check firewall/security rules

**Payment marked as pending**
- System polls for status every 3 seconds for 60 seconds
- After polling, check callback for real-time notification
- Admin can manually check status via query endpoint

## Next Steps

1. Read full documentation: [MPESA_POCHI_INTEGRATION.md](../docs/MPESA_POCHI_INTEGRATION.md)
2. Test in sandbox environment first
3. Integrate with your payment database
4. Add email notifications
5. Deploy to production
6. Monitor transactions and logs

## Support Resources

- 📚 [Safaricom Daraja API Docs](https://developer.safaricom.co.ke)
- 🧪 [Sandbox Testing Guide](https://developer.safaricom.co.ke/test)
- 💬 [Community Forum](https://community.safaricom.co.ke)
- 📞 Safaricom Support: +254 722 203 000

---

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Last Updated:** 2024
