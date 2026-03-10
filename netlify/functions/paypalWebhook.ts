/**
 * PayPal Webhook Handler for SmartInvestsi
 * Handles payment events from PayPal including:
 * - PAYMENT.CAPTURE.COMPLETED (successful payment)
 * - PAYMENT.CAPTURE.DENIED (failed payment)
 * - CUSTOMER.CREATED
 */

interface Subscription {
  status: string;
  planId: string;
  amount?: string;
  currency?: string;
  payerEmail?: string;
  paymentId: string;
  createdAt?: string;
  updatedAt?: string;
}

const PAYPAL_MODE: string = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID: string = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET: string = process.env.PAYPAL_CLIENT_SECRET || '';
const TEST_MODE: boolean = process.env.TEST_MODE === 'true';

// Validate required env vars
if (!PAYPAL_CLIENT_ID && !TEST_MODE) {
  console.error('PAYPAL_CLIENT_ID is required when not in TEST_MODE');
}
if (!PAYPAL_CLIENT_SECRET && !TEST_MODE) {
  console.error('PAYPAL_CLIENT_SECRET is required when not in TEST_MODE');
}

// In-memory storage for demo (use database in production)
const subscriptions: Map<string, Subscription> = new Map();

/**
 * Get PayPal access token
 */
async function getAccessToken(): Promise<string> {
  if (TEST_MODE || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    // Using test mode - no real PayPal credentials available
    return 'test-token';
  }

  const auth: string = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response: Response = await fetch(`https://api.${PAYPAL_MODE}.paypal.com/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data: any = await response.json();
  return data.access_token;
}

/**
 * Verify PayPal webhook signature
 */
async function verifyWebhookSignature(event: any, headers: any): Promise<boolean> {
  // In production, implement proper webhook verification
  // https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
  // For now, skip verification in test mode
  if (TEST_MODE) {
    return true;
  }

  // TODO: Implement actual signature verification
  // const signature = headers['paypal-transmission-signature'];
  // const certUrl = headers['paypal-cert-url'];
  // const transmissionId = headers['paypal-transmission-id'];
  // const timestamp = headers['paypal-transmission-time'];
  // const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  // Verify the signature using PayPal's algorithm
  return true; // Placeholder
}

/**
 * Handle successful payment
 */
async function handlePaymentCompleted(payment: any): Promise<{ success: boolean; message: string }> {
  const customId: string | undefined = payment.purchase_units?.[0]?.custom_id;
  const payerEmail: string | undefined = payment.payer?.email_address;
  const amount: string | undefined = payment.purchase_units?.[0]?.amount?.value;
  const currency: string | undefined = payment.purchase_units?.[0]?.amount?.currency_code;

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
async function handlePaymentDenied(payment: any): Promise<{ success: boolean; message: string }> {
  const customId: string | undefined = payment.purchase_units?.[0]?.custom_id;

  // Payment denied - update subscription status
  if (customId) {
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
export const handler = async function(event: any, context: any): Promise<any> {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const payload: any = JSON.parse(event.body);
    const eventType: string = payload.event_type || payload.resource?.type;

    // Received PayPal webhook - processing

    // Verify webhook signature in production
    const signatureValid = await verifyWebhookSignature(payload, event.headers);
    if (!signatureValid) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    let result: { success: boolean; message: string };

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

  } catch (error: any) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' })
    };
  }
};

// Export for testing
export { handlePaymentCompleted, handlePaymentDenied, subscriptions };