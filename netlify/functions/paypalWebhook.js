
/**
 * PayPal Webhook Handler for SmartInvestsi
 * Handles payment events from PayPal including:
 * - PAYMENT.CAPTURE.COMPLETED (successful payment)
 * - PAYMENT.CAPTURE.DENIED (failed payment)
 * - CUSTOMER.CREATED
 */

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

// In-memory storage for demo (use database in production)
const subscriptions = new Map();

/**
 * Get PayPal access token
 */
async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    // Using sandbox mode - no real PayPal credentials available
    return 'sandbox-token';
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`https://api.${PAYPAL_MODE}.paypal.com/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

/**
 * Verify PayPal webhook signature
 */
async function verifyWebhookSignature(event, headers) {
  // In production, implement webhook verification
  // https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
  return true;
}

/**
 * Handle successful payment
 */
async function handlePaymentCompleted(payment) {
  const customId = payment.purchase_units?.[0]?.custom_id;
  const payerEmail = payment.payer?.email_address;
  const amount = payment.purchase_units?.[0]?.amount?.value;
  const currency = payment.purchase_units?.[0]?.amount?.currency_code;

  // Payment completed - store subscription info (use database in production)
  if (customId) {
    subscriptions.set(customId, {
      status: 'active',
      planId: customId,
      amount,
      currency,
      payerEmail,
      paymentId: payment.id,
      createdAt: new Date().toISOString()
    });
  }

  return {
    success: true,
    message: 'Payment processed successfully'
  };
}

/**
 * Handle denied payment
 */
async function handlePaymentDenied(payment) {
  const customId = payment.purchase_units?.[0]?.custom_id;
  
  // Payment denied - update subscription status
    subscriptions.set(customId, {
      status: 'denied',
      planId: customId,
      paymentId: payment.id,
      updatedAt: new Date().toISOString()
    });
  }

  return {
    success: false,
    message: 'Payment was denied'
  };
}

/**
 * Main webhook handler
 */
exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const eventType = payload.event_type || payload.resource?.type;
    
    // Received PayPal webhook - processing

    // Verify webhook signature in production
    // const signatureValid = await verifyWebhookSignature(payload, event.headers);
    // if (!signatureValid) {
    //   return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
    // }

    let result;

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        result = await handlePaymentCompleted(payload.resource);
        break;
      
      case 'PAYMENT.CAPTURE.DENIED':
        result = await handlePaymentDenied(payload.resource);
        break;
      
      case 'CUSTOMER.CREATED':
        // Customer created event received
        result = { success: true, message: 'Customer noted' };
        break;
      
      default:
        // Unhandled event type - acknowledging
        result = { success: true, message: 'Event noted' };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    // Error processing webhook - returning error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

/**
 * API endpoint to check subscription status
 */
exports.checkSubscription = async function(userId, planId) {
  const subscription = subscriptions.get(planId);
  return subscription || { status: 'inactive' };
};

