# M-Pesa Pochi Integration - Quick Reference Card

## 🔑 Configuration

```env
# .env file setup
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_ENV=sandbox                    # or 'production'
MPESA_NUMBER=171414                  # Your business short code
MPESA_PASSKEY=your_passkey
MPESA_POCHI_NAME=SmartInvest
MPESA_CALLBACK_URL=https://domain.com/api/pochi/callback
```

## 🔌 Server Integration

### In server.js:
```javascript
const pochiRoutes = require('./src/routes/pochi-routes');
app.use('/api/pochi', pochiRoutes);
```

## 🎯 Frontend Usage

### HTML
```html
<input type="tel" id="phone" placeholder="254700000000">
<input type="number" id="amount" placeholder="Amount" value="100">
<button onclick="payWithPochi()">Pay with M-Pesa</button>

<script src="/js/pochi-payment-handler.js"></script>
<script>
  const pochi = new PochiPaymentHandler({
    callbacks: {
      onSuccess: (result) => console.log('✓ Success:', result),
      onFailure: (result) => console.log('✗ Failed:', result)
    }
  });

  async function payWithPochi() {
    const phone = document.getElementById('phone').value;
    const amount = document.getElementById('amount').value;
    await pochi.initiateStkPush(phone, amount, 'Payment-Ref');
  }
</script>
```

## 📡 API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/pochi/info` | GET | None | Account info |
| `/api/pochi/test` | GET | None | Test connection |
| `/api/pochi/stk-push` | POST | None | Send payment prompt |
| `/api/pochi/query-stk` | POST | None | Check status |
| `/api/pochi/callback` | POST | Webhook | Payment notification |
| `/api/pochi/b2c-payment` | POST | Admin | Send refund |
| `/api/pochi/balance` | GET | Admin | Check balance |

## 📝 Request Examples

### STK Push
```javascript
fetch('/api/pochi/stk-push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '254700000000',
    amount: 100,
    accountReference: 'Order-123'
  })
})
```

### Query Status
```javascript
fetch('/api/pochi/query-stk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    checkoutRequestId: 'ws_CO_DMZ_xxx'
  })
})
```

### Send Refund (Admin)
```javascript
fetch('/api/pochi/b2c-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-token'
  },
  body: JSON.stringify({
    phoneNumber: '254700000000',
    amount: 100,
    description: 'Refund'
  })
})
```

## ✅ Response Examples

### Successful STK Push
```json
{
  "success": true,
  "checkoutRequestId": "ws_CO_DMZ_xxx",
  "responseCode": "0",
  "message": "STK prompt sent successfully"
}
```

### Successful Payment
```json
{
  "valid": true,
  "status": "success",
  "mpesaReceiptNumber": "NLJ7RT61SV",
  "amount": 100,
  "phoneNumber": "254700000000",
  "transactionDate": 20231117063845
}
```

## 🧪 Testing

### Test Connection
```bash
curl http://localhost:3000/api/pochi/test
```

### Send Test Payment
```bash
curl -X POST http://localhost:3000/api/pochi/stk-push \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254700000000",
    "amount": 100
  }'
```

### Simulate Callback
```bash
curl -X POST http://localhost:3000/api/pochi/callback \
  -H "Content-Type: application/json" \
  -d '{
    "Body": {
      "stkCallback": {
        "ResultCode": 0,
        "CheckoutRequestID": "test-id",
        "CallbackMetadata": {
          "Item": [
            {"Name": "Amount", "Value": 100},
            {"Name": "MpesaReceiptNumber", "Value": "ABC123"}
          ]
        }
      }
    }
  }'
```

## 🚀 Common Tasks

### Grant Premium After Payment
```javascript
// In success callback
pochi.callbacks.onSuccess = async (result) => {
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

### Update Database
```javascript
// After successful payment
const payment = {
  user_id: userId,
  phone: result.phoneNumber,
  amount: result.amount,
  status: 'success',
  mpesa_receipt: result.mpesaReceiptNumber,
  checkout_id: result.checkoutId,
  timestamp: new Date()
};

// Save to database
await db.payments.insert(payment);
```

### Send Confirmation Email
```javascript
// After successful payment
await fetch('/api/admin/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: userEmail,
    subject: 'Payment Received',
    body: `
      Payment of KES ${amount} received.
      Reference: ${result.mpesaReceiptNumber}
      Your premium access is now active!
    `
  })
});
```

## 🔐 Security Checklist

- [ ] Credentials stored in .env (never in code)
- [ ] .env added to .gitignore
- [ ] HTTPS enabled in production
- [ ] Callback URL is publicly accessible
- [ ] Admin endpoints require authorization
- [ ] Payment data encrypted in database
- [ ] Error messages don't expose sensitive data
- [ ] Rate limiting implemented
- [ ] Logs sanitized (no credentials)

## ❌ Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Auth failed | Invalid credentials | Check MPESA_CONSUMER_KEY/SECRET |
| Invalid shortcode | Wrong MPESA_NUMBER | Verify your business short code |
| Request timeout | User didn't enter PIN | User needs to retry |
| Callback not received | Callback URL issue | Ensure HTTPS and publicly accessible |
| Invalid phone | Bad format | Use format: 254XXXXXXXXX |

## 📊 Status Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Failed |
| 1001 | Timeout/Cancelled |
| 1032 | Request timeout |

## 📚 Documentation Files

- `MPESA_POCHI_IMPLEMENTATION.md` - Overview
- `docs/MPESA_POCHI_QUICKSTART.md` - 5-minute setup
- `docs/MPESA_POCHI_INTEGRATION.md` - Full reference

## 🧩 Files in Project

```
Backend:
  src/lib/mpesa-pochi.js              - Core library
  src/routes/pochi-routes.js          - API routes

Frontend:
  public/js/pochi-payment-handler.js  - Payment handler

Tools:
  tools/pochi-test.js                 - Testing suite
```

## 🎓 Classroom Example

```javascript
// Complete payment flow example
async function handlePayment(email, phone, amount) {
  // 1. Initiate STK Push
  const stkRes = await pochi.initiateStkPush(phone, amount);
  
  if (!stkRes.success) {
    alert('Payment failed: ' + stkRes.error);
    return;
  }

  // 2. Poll for completion
  const status = await pochi.pollPaymentStatus(
    stkRes.checkoutRequestId,
    { phoneNumber: phone, amount }
  );

  if (status.success) {
    // 3. Save to database
    await db.payments.insert({
      email, phone, amount,
      status: 'success',
      receipt: status.mpesaReceiptNumber
    });

    // 4. Grant premium access
    await fetch('/api/admin/grant-premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        days: 30,
        reason: `Payment processed - ${status.mpesaReceiptNumber}`
      })
    });

    // 5. Send confirmation
    await sendEmail(email, 'Payment Confirmed', 
      `Your payment of KES ${amount} has been received!`);

    return { success: true, receipt: status.mpesaReceiptNumber };
  }
}
```

---

**Version:** 1.0.0 | **Status:** Production Ready | **Updated:** 2024-01-17
