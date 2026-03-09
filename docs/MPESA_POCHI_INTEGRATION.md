# M-Pesa Pochi la Biashara Integration Guide

## Overview

This integration enables payment processing via **M-Pesa Pochi la Biashara (Business Account)** using the Safaricom Daraja API. Pochi la Biashara is a business wallet that allows businesses to receive payments from customers and manage their business finances.

## Key Features

✅ **STK Push Payments** - Customers receive payment prompt on their phone
✅ **Payment Status Polling** - Real-time payment verification
✅ **Business-to-Customer Payouts** - Send money to customers
✅ **Account Balance Queries** - Check wallet balance
✅ **Webhook Callbacks** - Real-time payment notifications
✅ **Security** - OAuth token authentication, encrypted credentials

## Setup

### 1. Environment Configuration

Add these variables to your `.env` file:

```env
# M-Pesa Daraja API Credentials
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here

# Pochi la Biashara Configuration
MPESA_ENV=sandbox              # Use 'production' in production
MPESA_NUMBER=171414           # Your business short code
MPESA_PASSKEY=your_passkey    # From Safaricom
MPESA_POCHI_NAME=SmartInvest  # Your business name
MPESA_CALLBACK_URL=https://smartinvestsi.com/api/pochi/callback

# App Configuration
APP_URL=https://smartinvestsi.com
```

### 2. Get Credentials

1. Visit [Safaricom Daraja Portal](https://developer.safaricom.co.ke)
2. Create an app and get:
   - **Consumer Key**
   - **Consumer Secret**
   - **Business Short Code** (4-6 digits)
   - **Pass Key** (provided during setup)

### 3. Server Integration

Mount the routes in your Express server:

```javascript
const pochiRoutes = require('./src/routes/pochi-routes');
app.use('/api/pochi', pochiRoutes);
```

## API Endpoints

### 1. STK Push - Initiate Payment

**Endpoint:** `POST /api/pochi/stk-push`

**Request:**
```json
{
  "phoneNumber": "+254700000000",
  "amount": 100,
  "accountReference": "Order-123",
  "description": "Payment for investment package"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "16683-1259-1",
  "responseCode": "0",
  "checkoutRequestId": "ws_CO_DMZ_xxx",
  "message": "STK prompt sent successfully"
}
```

### 2. Query Payment Status

**Endpoint:** `POST /api/pochi/query-stk`

**Request:**
```json
{
  "checkoutRequestId": "ws_CO_DMZ_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "responseCode": "0",
  "resultCode": "0",
  "resultDesc": "The service request has been accepted successfully",
  "merchantRequestId": "16683-1259-1",
  "checkoutRequestId": "ws_CO_DMZ_xxx"
}
```

### 3. Payment Callback Webhook

**Endpoint:** `POST /api/pochi/callback`

Safaricom sends real-time notifications here:

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "16683-1259-1",
      "CheckoutRequestID": "ws_CO_DMZ_xxx",
      "ResultCode": 0,
      "ResultDesc": "The service request has been accepted successfully",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "TransactionDate", "Value": 20191122063845 },
          { "Name": "PhoneNumber", "Value": 254708374149 }
        ]
      }
    }
  }
}
```

### 4. B2C Payment (Send Money)

**Endpoint:** `POST /api/pochi/b2c-payment`

Requires admin authorization header.

**Request:**
```json
{
  "phoneNumber": "+254700000000",
  "amount": 100,
  "description": "Refund for order"
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "AG_20231117_xxx",
  "originatorConversationId": "xxx",
  "responseCode": "0",
  "responseDesc": "Accept the service request successfully"
}
```

### 5. Check Account Balance

**Endpoint:** `GET /api/pochi/balance`

Requires admin authorization header.

**Response:**
```json
{
  "success": true,
  "responseCode": "0",
  "responseDesc": "The service request has been accepted successfully",
  "conversationId": "AG_20231117_xxx"
}
```

### 6. Test Connection

**Endpoint:** `GET /api/pochi/test`

**Response:**
```json
{
  "success": true,
  "message": "M-Pesa Pochi connection successful",
  "config": {
    "environment": "sandbox",
    "shortCode": "171414",
    "accountName": "SmartInvest",
    "hasPassKey": true,
    "hasCallbackUrl": true
  }
}
```

## Frontend Integration

### HTML Example

```html
<input type="tel" id="phone" placeholder="Enter phone number (e.g., 254700000000)">
<input type="number" id="amount" placeholder="Amount in KES" value="100">
<button onclick="handlePochiPayment()">Pay with M-Pesa</button>

<script src="/js/pochi-payment-handler.js"></script>
<script>
  const pochi = new PochiPaymentHandler({
    apiBase: '/api/pochi',
    callbacks: {
      onSuccess: (result) => {
        console.log('Payment successful:', result);
        alert(`Payment of KES ${result.amount} received!`);
        // Update UI, grant access, etc.
      },
      onFailure: (result) => {
        console.log('Payment failed:', result);
        alert('Payment failed. Please try again.');
      }
    }
  });

  async function handlePochiPayment() {
    const phone = document.getElementById('phone').value;
    const amount = document.getElementById('amount').value;

    try {
      await pochi.initiateStkPush(phone, amount, 'SmartInvest-Payment');
    } catch (error) {
      console.error('Payment error:', error);
    }
  }

  // Test connection on page load
  window.addEventListener('load', () => {
    pochi.testConnection().catch(console.error);
  });
</script>
```

## Testing

### 1. Test Mode (Sandbox)

Set in `.env`:
```env
MPESA_ENV=sandbox
```

### 2. Test Credentials (Safaricom Sandbox)

- **Business Short Code:** Your sandbox short code (provided by Safaricom)
- **Pass Key:** Your sandbox pass key (provided by Safaricom)
- **Test Phone:** Your test phone number (provided by Safaricom)

> **Note:** Get your sandbox credentials from the [Safaricom Daraja Portal](https://developer.safaricom.co.ke)

### 3. Simulate Callback

```bash
curl -X POST http://localhost:3000/api/pochi/callback \
  -H "Content-Type: application/json" \
  -d '{
    "Body": {
      "stkCallback": {
        "MerchantRequestID": "test-123",
        "CheckoutRequestID": "test-checkout",
        "ResultCode": 0,
        "ResultDesc": "The service request has been accepted successfully",
        "CallbackMetadata": {
          "Item": [
            {"Name": "Amount", "Value": 100},
            {"Name": "MpesaReceiptNumber", "Value": "TEST123"},
            {"Name": "TransactionDate", "Value": 20231117063845},
            {"Name": "PhoneNumber", "Value": 254708374149}
          ]
        }
      }
    }
  }'
```

## Error Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Insufficient Funds |
| 2 | Less than minimum transaction value |
| 3 | More than maximum transaction value |
| 4 | Would exceed daily limit |
| 5 | Would exceed minimum balance |
| 6 | Unresolved Primary Reference |
| 7 | Processing Error |
| 8 | Unresolved Duplicate Reference |
| 9 | Duplicate Shortcode |
| 10 | Account Restricted |
| 11 | Insufficient Privileges |
| 12 | Invalid Amount |
| 13 | Invalid Account Number |
| 1032 | Request Timeout (User didn't enter PIN) |
| 1037 | DSO Handle Timeout |
| 1001 | Unable to lock subscriber |
| 9001 | Invalid subscriber account |

## Result Codes for Callbacks

| Code | Status | Meaning |
|------|--------|---------|
| 0 | Success | Payment was successful |
| 1 | Failed | Payment failed |
| 1001 | Timeout | Request timeout |
| 1032 | Timeout | User cancelled or timed out |

## Payment Flow Diagram

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ POST /api/pochi/stk-push
       ▼
┌──────────────────────┐
│  SmartInvest Server  │
└──────┬───────────────┘
       │ OAuth Token Request
       ▼
┌──────────────────────┐
│  Safaricom Daraja    │
│      OAuth API       │
└──────┬───────────────┘
       │ Access Token
       ▼
┌──────────────────────┐
│  SmartInvest Server  │
└──────┬───────────────┘
       │ STK Push Request
       ▼
┌──────────────────────┐
│  Safaricom Daraja    │
│   STK Push API       │
└──────┬───────────────┘
       │ STK Prompt on Phone
       ▼
┌──────────────────┐
│  User's Phone    │
│  (M-Pesa Menu)   │
└──────┬───────────┘
       │ User enters PIN
       ▼
┌──────────────────────┐
│   M-Pesa Core        │
└──────┬───────────────┘
       │ Payment Success/Failure
       ▼
┌──────────────────────┐
│  Safaricom Daraja    │
└──────┬───────────────┘
       │ Callback to /api/pochi/callback
       ▼
┌──────────────────────┐
│  SmartInvest Server  │
└──────┬───────────────┘
       │ Update DB, Send Email
       ▼
   Payment Complete
```

## Security Best Practices

1. **Never commit credentials** - Use .env file and .gitignore
2. **Validate callback signatures** - Verify requests come from Safaricom
3. **Use HTTPS** - All M-Pesa communication must be encrypted
4. **Rate limiting** - Implement rate limits on payment endpoints
5. **Idempotency** - Handle duplicate callbacks gracefully
6. **Audit logging** - Log all payment transactions
7. **Access control** - Restrict sensitive endpoints to admin users

## Troubleshooting

### "Authentication failed" Error

**Cause:** Invalid credentials
**Solution:** Verify MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in .env

### "Invalid shortcode" Error

**Cause:** Wrong business short code
**Solution:** Confirm MPESA_NUMBER matches your Pochi account

### "Request timeout"

**Cause:** User didn't enter PIN within 2 minutes
**Solution:** Retry the payment or contact user support

### Callback not received

**Cause:** MPESA_CALLBACK_URL not properly configured
**Solution:** Ensure callback URL is publicly accessible and HTTPS

## Integration Checklist

- [ ] Add environment variables to .env
- [ ] Mount pochi-routes in server.js
- [ ] Include pochi-payment-handler.js in frontend
- [ ] Implement database fields for payment tracking
- [ ] Add email notification for successful payments
- [ ] Implement payment status check in user dashboard
- [ ] Set up error handling and user notifications
- [ ] Test in sandbox environment
- [ ] Get production credentials from Safaricom
- [ ] Deploy to production

## Support

For issues or questions:
1. Check Safaricom Daraja [documentation](https://developer.safaricom.co.ke)
2. Review error codes and logs
3. Test with sandbox credentials first
4. Contact Safaricom support for API issues

## License

This integration is part of SmartInvest. All code is confidential.
