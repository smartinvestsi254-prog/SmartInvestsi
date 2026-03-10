/**
 * PayPal Create Order Handler for SmartInvestsi
 * Creates PayPal orders for subscription payments
 */

interface Plan {
  name: string;
  description: string;
  price: string;
  currency: string;
}

interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

const PAYPAL_MODE: string = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID: string = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET: string = process.env.PAYPAL_CLIENT_SECRET || '';
const TEST_MODE: boolean = process.env.TEST_MODE === 'true';
const APP_URL: string = process.env.APP_URL || 'https://smartinvestsi.com';

// Validate required env vars
if (!PAYPAL_CLIENT_ID && !TEST_MODE) {
  console.error('PAYPAL_CLIENT_ID is required when not in TEST_MODE');
}
if (!PAYPAL_CLIENT_SECRET && !TEST_MODE) {
  console.error('PAYPAL_CLIENT_SECRET is required when not in TEST_MODE');
}
if (!APP_URL) {
  console.error('APP_URL is required');
}

// Plan pricing configuration
const PLANS: Record<string, Plan> = {
  'PREM10': {
    name: 'SmartInvestsi Premium',
    description: 'Premium monthly subscription',
    price: '10.00',
    currency: 'USD'
  },
  'ENT20': {
    name: 'SmartInvestsi Enterprise',
    description: 'Enterprise monthly subscription',
    price: '20.00',
    currency: 'USD'
  }
};

/**
 * Get PayPal access token
 */
async function getAccessToken(): Promise<string> {
  if (TEST_MODE || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.log('Using test/sandbox mode - no real PayPal credentials or TEST_MODE enabled');
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
 * Create PayPal order
 */
async function createPayPalOrder(planId: string, userId?: string): Promise<PayPalOrder> {
  const plan: Plan | undefined = PLANS[planId];

  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  const accessToken: string = await getAccessToken();

  // If in test mode, return mock order
  if (TEST_MODE || accessToken === 'test-token') {
    return {
      id: `MOCK_ORDER_${Date.now()}`,
      status: 'CREATED',
      links: [
        {
          href: '#approve',
          rel: 'approve',
          method: 'GET'
        }
      ]
    };
  }

  const response: Response = await fetch(`https://api.${PAYPAL_MODE}.paypal.com/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: planId,
        custom_id: `${planId}_${userId || 'guest'}`,
        description: plan.description,
        amount: {
          currency_code: plan.currency,
          value: plan.price
        }
      }],
      application_context: {
        brand_name: 'SmartInvestsi',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${APP_URL}/pricing.html?success=true`,
        cancel_url: `${APP_URL}/pricing.html?canceled=true`
      }
    })
  });

  const order: PayPalOrder = await response.json();
  return order;
}

/**
 * Main handler
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
    const body: any = JSON.parse(event.body || '{}');
    const planId: string = body.planId;
    const userId: string = body.userId;

    if (!planId || !PLANS[planId]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid plan ID' })
      };
    }

    const order: PayPalOrder = await createPayPalOrder(planId, userId);

    // Find the approve link
    let approveLink: string | null = null;
    if (order.links) {
      for (const link of order.links) {
        if (link.rel === 'approve') {
          approveLink = link.href;
          break;
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        orderId: order.id,
        approveUrl: approveLink,
        plan: PLANS[planId]
      })
    };

  } catch (error: any) {
    console.error('Create order error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create order' })
    };
  }
};

// Export for testing
export { createPayPalOrder, PLANS };