/**
 * Pesapal Create Order Handler for SmartInvestsi
 * Creates Pesapal orders for subscription payments
 * User must set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in Netlify env vars
 */

import logger from './logger';
import SentryInit from './sentry-init';
import { z } from 'zod';

const CreateOrderSchema = z.object({
  planId: z.string(),
  userId: z.string().optional()
});

interface Plan {
  name: string;
  description: string;
  price: string;
  currency: string;
}

const PLANS: Record<string, Plan> = {
  'PREM10': {
    name: 'SmartInvestsi Premium',
    description: 'Premium monthly subscription',
    price: '1000',
    currency: 'KES'
  },
  'ENT20': {
    name: 'SmartInvestsi Enterprise',
    description: 'Enterprise monthly subscription',
    price: '2000',
    currency: 'KES'
  }
};

const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || '';
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || '';
const PESAPAL_IPN_URL = process.env.PESAPAL_IPN_URL || 'https://smartinvestsi.netlify.app/.netlify/functions/pesapal-ipn';
const APP_URL = process.env.APP_URL || 'https://smartinvestsi.netlify.app';

export const handler = SentryInit.wrapHandler(async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { planId, userId } = CreateOrderSchema.parse(body);

    const plan = PLANS[planId];
    if (!plan) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan ID' }) };
    }

    if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
      logger.warn('Pesapal credentials missing - using demo mode');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          orderTrackingId: `DEMO_${Date.now()}`,
          redirectUrl: `${APP_URL}/pricing.html?demo_success=true`,
          plan
        })
      };
    }

    // Generate signature
    const timestamp = new Date().toISOString();
    const data = `${PESAPAL_CONSUMER_KEY}:${timestamp}`;
    const signature = Buffer.from(data).toString('base64');

    const response = await fetch('https://cybqa.pesapal.com/pesapalv3/api/Transactions/SubmitOrderRequest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PESAPAL_CONSUMER_KEY}:${Buffer.from(timestamp).toString('base64')}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        id: `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        currency: plan.currency,
        amount: plan.price,
        description: plan.description,
        callback_url: `${APP_URL}/pricing.html`,
        notification_id: PESAPAL_IPN_URL,
        billing_address: {
          email_address: userId || 'user@example.com',
          country_code: 'KE'
        },
        line_items: [{
          name: plan.name,
          description: plan.description,
          quantity: 1,
          price: plan.price,
          currency: plan.currency
        }]
      })
    });

    const order = await response.json();

    if (order.redirect_url) {
      logger.info('Pesapal order created', { orderTrackingId: order.order_tracking_id, planId });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          orderTrackingId: order.order_tracking_id,
          redirectUrl: order.redirect_url,
          plan
        })
      };
    } else {
      throw new Error('Pesapal order creation failed');
    }

  } catch (error) {
    logger.error('Pesapal order error', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create Pesapal order. Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET env vars.' })
    };
  }
});

// Pesapal IPN handler (for webhooks)
export const pesapalIPN = async (event) => {
  logger.info('Pesapal IPN received', event.body);
  // Process webhook, update DB etc.
  return { statusCode: 200 };
};

