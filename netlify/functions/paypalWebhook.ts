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
const PAYPAL_WEBHOOK_ID: string = process.env.PAYPAL_WEBHOOK_ID || '';
const TEST_MODE: boolean = process.env.TEST_MODE === 'true';

// Validate required env vars
if (!PAYPAL_CLIENT_ID && !TEST_MODE) {
  console.error('PAYPAL_CLIENT_ID is required when not in TEST_MODE');
}
if (!PAYPAL_CLIENT_SECRET && !TEST_MODE) {
  console.error('PAYPAL_CLIENT_SECRET is required when not in TEST_MODE');
}

import prisma from './lib/prisma';
import logger from './lib/logger';

// Remove in-memory, use DB

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
  // In test mode, skip verification
  if (TEST_MODE) {
    return true;
  }

  // Get required headers
  const transmissionSig = headers['paypal-transmission-signature'];
  const certUrl = headers['paypal-cert-url'];
  const transmissionId = headers['paypal-transmission-id'];
  const transmissionTime = headers['paypal-transmission-time'];

  // Check if all required headers are present
  if (!transmissionSig || !certUrl || !transmissionId || !transmissionTime || !PAYPAL_WEBHOOK_ID) {
    console.error('Missing required PayPal webhook headers or WEBHOOK_ID');
    return false;
  }

  try {
    // Get access token
    const accessToken = await getAccessToken();

    // Prepare verification request
    const verificationBody = {
      auth_algo: 'SHA256withRSA',
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: event
    };

    // Verify with PayPal
    const response = await fetch(`https://api.${PAYPAL_MODE}.paypal.com/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verificationBody)
    });

    const result = await response.json();

    // Check verification status
    return result.verification_status === 'SUCCESS';

  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentCompleted(payment: any): Promise<{ success: boolean; message: string }> {
  const customId: string | undefined = payment.purchase_units?.[0]?.custom_id;
  const payerEmail: string | undefined = payment.payer?.email_address;
  const amount: string | undefined = payment.purchase_units?.[0]?.amount?.value;
  const currency: string | undefined = payment.purchase_units?.[0]?.amount?.currency_code;

  if (!customId) {
    return { success: false, message: 'No custom_id in payment' };
  }

  // Parse plan from custom_id (PREM10 -> PREMIUM, ENT20 -> ENTERPRISE)
  const plan = customId.startsWith('PREM10') ? 'PREMIUM' : customId.startsWith('ENT20') ? 'ENTERPRISE' : 'PREMIUM';

  // Get userId from payer email (in prod, use auth/PayPal customer ID mapping)
  const userId = await getUserIdFromPayerEmail(payerEmail || '');

  if (!userId) {
    logger.error('No user found for payer', { payerEmail });
    return { success: false, message: 'User not found' };
  }

  // Create subscription using payments-api logic
  await fetch(`${process.env.NETLIFY_FUNCTIONS_BASE_PATH || '/.netlify/functions'}/payments-api/subscription/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      plan,
      paymentMethod: 'paypal',
      amount: Number(amount || 0)
    })
  });

  logger.info('PayPal webhook created subscription', { customId, userId, plan, amount });

  return {
    success: true,
    message: 'Payment and subscription processed successfully'
  };
}

async function getUserIdFromPayerEmail(email: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    return user?.id || null;
  } catch (error) {
    logger.error('Get user by email error', { error: error.message, email });
    return null;
  }
}

/**
 * Handle denied payment
 */
async function handlePaymentDenied(payment: any): Promise<{ success: boolean; message: string }> {
  const customId: string | undefined = payment.purchase_units?.[0]?.custom_id;
  const payerEmail: string | undefined = payment.payer?.email_address;

  if (customId && payerEmail) {
    const userId = await getUserIdFromPayerEmail(payerEmail);
    if (userId) {
      // Log failed payment, optional notify user
      await fetch(`${process.env.NETLIFY_FUNCTIONS_BASE_PATH || '/.netlify/functions'}/notifications-api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: 'payment',
          title: 'Payment Failed',
          message: 'Your PayPal payment was denied. Please try again or use another method.',
          priority: 'medium'
        })
      });
    }
  }

  logger.info('PayPal payment denied', { customId, payerEmail });
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