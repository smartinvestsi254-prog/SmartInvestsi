
/**
 * PayPal Create Order Handler for SmartInvestsi
 * Creates PayPal orders for subscription payments
 */

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

// Plan pricing configuration
const PLANS = {
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
async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.log('Using sandbox mode - no real PayPal credentials');
    return 'sandbox-token';
  }

  const auth = Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_CLIENT_SECRET).toString('base64');
  
  const response = await fetch('https://api.' + PAYPAL_MODE + '.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + auth,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

/**
 * Create PayPal order
 */
async function createPayPalOrder(planId, userId) {
  var plan = PLANS[planId];
  
  if (!plan) {
    throw new Error('Invalid plan: ' + planId);
  }

  var accessToken = await getAccessToken();

  // If no real PayPal credentials, return mock order
  if (accessToken === 'sandbox-token') {
    return {
      id: 'MOCK_ORDER_' + Date.now(),
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

  var appUrl = process.env.APP_URL || 'https://smartinvestsi.com';

  var response = await fetch('https://api.' + PAYPAL_MODE + '.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: planId,
        custom_id: planId + '_' + (userId || 'guest'),
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
        return_url: appUrl + '/pricing.html?success=true',
        cancel_url: appUrl + '/pricing.html?canceled=true'
      }
    })
  });

  var order = await response.json();
  return order;
}

/**
 * Main handler
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
    var body = JSON.parse(event.body || '{}');
    var planId = body.planId;
    var userId = body.userId;

    if (!planId || !PLANS[planId]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid plan ID' })
      };
    }

    var order = await createPayPalOrder(planId, userId);

    // Find the approve link
    var approveLink = null;
    if (order.links) {
      for (var i = 0; i < order.links.length; i++) {
        if (order.links[i].rel === 'approve') {
          approveLink = order.links[i].href;
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

  } catch (error) {
    console.error('Create order error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create order' })
    };
  }
};

