/**
 * Payments API for SmartInvest
 * Handles Stripe, PayPal, MPESA payments and subscriptions
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  method: 'stripe' | 'paypal' | 'mpesa';
  userId: string;
  createdAt: string;
}

interface Subscription {
  id: string;
  userId: string;
  plan: 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  paymentMethod: string;
}

// Mock data - replace with real database
const mockPaymentIntents: PaymentIntent[] = [];
const mockSubscriptions: Subscription[] = [];

/**
 * Process Stripe payment
 */
async function processAdminFeeTransaction(originalAmount: number, userId: string, transactionId: string, gateway: string): Promise<{ adminFee: number; netAmount: number; ceoAccountId: string }> {
  const ADMIN_FEE_PERCENT = 2.5; // 2.5% transaction fee
  const CEO_ACCOUNT_ID = process.env.CEO_ACCOUNT_ID || 'ceo_main_account';
  
  const adminFee = originalAmount * (ADMIN_FEE_PERCENT / 100);
  const netAmount = originalAmount - adminFee;

  // Record admin fee transaction (CEO receives)
  await recordAdminFee({
    transactionId,
    userId,
    originalAmount,
    adminFee,
    netAmount,
    gateway,
    ceoAccountId: CEO_ACCOUNT_ID,
    timestamp: new Date().toISOString()
  });

  logger.info('Admin fee deducted', { transactionId, userId, adminFee: adminFee.toFixed(2), ceoAccountId: CEO_ACCOUNT_ID });
  
  return { adminFee, netAmount, ceoAccountId: CEO_ACCOUNT_ID };
}

async function processStripePayment(data: any): Promise<any> {
  try {
    // Admin fee logic for every transaction
    const { paymentMethodId, amount, currency, userId } = data;
    const transactionId = `stripe_${Date.now()}`;
    
    const feeResult = await processAdminFeeTransaction(Number(amount), userId, transactionId, 'stripe');
    
    // Simulate Stripe processing with net amount
    const paymentIntent: PaymentIntent = {
      id: transactionId,
      amount: feeResult.netAmount,
      currency: currency || 'usd',
      status: 'completed',
      method: 'stripe',
      userId,
      createdAt: new Date().toISOString()
    };

    mockPaymentIntents.push(paymentIntent);
    logger.info('Stripe payment processed with admin fee', { transactionId, userId, adminFee: feeResult.adminFee.toFixed(2) });

    return { success: true, data: paymentIntent, adminFee: feeResult.adminFee };
  } catch (error) {
    logger.error('Stripe payment error', { error: error.message });
    return { success: false, error: error.message };
  }
}

async function recordAdminFee(feeData: any) {
  // Mock - use DB in production
  console.log('Admin fee recorded:', feeData);
}

/**
 * Create Stripe payment intent
 */
async function createStripeIntent(data: any): Promise<any> {
  try {
    const { amount, currency, userId } = data;

    // Simulate Stripe intent creation
    const intent: PaymentIntent = {
      id: `pi_${Date.now()}`,
      amount,
      currency: currency || 'usd',
      status: 'pending',
      method: 'stripe',
      userId,
      createdAt: new Date().toISOString()
    };

    mockPaymentIntents.push(intent);

    return { success: true, data: { clientSecret: `sk_test_${intent.id}` } };
  } catch (error) {
    logger.error('Create Stripe intent error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Process PayPal payment
 */
async function processPayPalPayment(data: any): Promise<any> {
  try {
    const { orderId, userId } = data;

    // Simulate PayPal capture
    const paymentIntent: PaymentIntent = {
      id: `pp_${Date.now()}`,
      amount: 1000, // $10.00
      currency: 'usd',
      status: 'completed',
      method: 'paypal',
      userId,
      createdAt: new Date().toISOString()
    };

    mockPaymentIntents.push(paymentIntent);

    logger.info('PayPal payment processed', { orderId, userId });

    return { success: true, data: paymentIntent };
  } catch (error) {
    logger.error('PayPal payment error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Process MPESA payment
 */
async function processMpesaPayment(data: any): Promise<any> {
  try {
    const { phoneNumber, amount, userId } = data;

    // Simulate MPESA STK Push
    const paymentIntent: PaymentIntent = {
      id: `mp_${Date.now()}`,
      amount,
      currency: 'kes',
      status: 'pending',
      method: 'mpesa',
      userId,
      createdAt: new Date().toISOString()
    };

    mockPaymentIntents.push(paymentIntent);

    logger.info('MPESA payment initiated', { phoneNumber, amount, userId });

    return { success: true, data: { checkoutRequestId: paymentIntent.id } };
  } catch (error) {
    logger.error('MPESA payment error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Check MPESA payment status
 */
async function checkMpesaStatus(checkoutRequestId: string): Promise<any> {
  try {
    const payment = mockPaymentIntents.find(p => p.id === checkoutRequestId);
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    // Simulate status update
    if (payment.status === 'pending') {
      payment.status = 'completed';
    }

    return { success: true, data: payment };
  } catch (error) {
    logger.error('Check MPESA status error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get payment history
 */
async function getPaymentHistory(userId: string, limit = 20, offset = 0): Promise<any> {
  try {
    const userPayments = mockPaymentIntents
      .filter(p => p.userId === userId)
      .slice(offset, offset + limit);

    return { success: true, data: userPayments };
  } catch (error) {
    logger.error('Get payment history error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Create subscription
 */
async function createSubscription(data: any): Promise<any> {
  try {
    const { userId, plan, paymentMethodId } = data;

    const subscription: Subscription = {
      id: `sub_${Date.now()}`,
      userId,
      plan,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      paymentMethod: paymentMethodId
    };

    mockSubscriptions.push(subscription);

    logger.info('Subscription created', { subscriptionId: subscription.id, userId, plan });

    return { success: true, data: subscription };
  } catch (error) {
    logger.error('Create subscription error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user subscriptions
 */
async function getUserSubscriptions(userId: string): Promise<any> {
  try {
    const userSubs = mockSubscriptions.filter(s => s.userId === userId);
    return { success: true, data: userSubs };
  } catch (error) {
    logger.error('Get subscriptions error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId: string, userId: string): Promise<any> {
  try {
    const subscription = mockSubscriptions.find(s => s.id === subscriptionId && s.userId === userId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    subscription.status = 'cancelled';

    logger.info('Subscription cancelled', { subscriptionId, userId });

    return { success: true, data: subscription };
  } catch (error) {
    logger.error('Cancel subscription error', { error: error.message });
    return { success: false, error: error.message };
  }
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = JSON.parse(body || '{}');
    const userId = data.userId || 'anonymous'; // In production, get from auth token

    let result;

    if (path.includes('/stripe/process')) {
      result = await processStripePayment(data);
    } else if (path.includes('/stripe/create-intent')) {
      result = await createStripeIntent(data);
    } else if (path.includes('/paypal/capture')) {
      result = await processPayPalPayment(data);
    } else if (path.includes('/mpesa/stkpush')) {
      result = await processMpesaPayment(data);
    } else if (path.includes('/mpesa/status/')) {
      const checkoutRequestId = path.split('/status/')[1];
      result = await checkMpesaStatus(checkoutRequestId);
    } else if (path.includes('/history')) {
      result = await getPaymentHistory(userId, data.limit, data.offset);
    } else if (path.includes('/subscription/create')) {
      result = await createSubscription(data);
    } else if (path.includes('/subscription/get')) {
      result = await getUserSubscriptions(userId);
    } else if (path.includes('/subscription/cancel/')) {
      const subscriptionId = path.split('/cancel/')[1];
      result = await cancelSubscription(subscriptionId, userId);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Endpoint not found' })
      };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Payments API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};