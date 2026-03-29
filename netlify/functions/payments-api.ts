/**
 * Payments API for SmartInvest
 * Handles Stripe, PayPal, MPESA payments and subscriptions
 */



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

import prisma from './lib/prisma';

import { Handler } from '@netlify/functions';
import prisma from './lib/prisma';
import logger from './logger';
import CONFIG from '../../src/config';

/**
 * Create or update subscription on payment success
 */
async function createOrUpdateSubscription(userId: string, plan: 'PREMIUM' | 'ENTERPRISE', paymentMethod: string, amount: number) {
  try {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const nextBillingDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // +1 day buffer

    // Upsert subscription
    const subscription = await prisma.subscription.upsert({
      where: {
        userId_plan: { userId, plan }
      },
      update: {
        status: 'active',
        startDate,
        endDate,
        nextBillingDate,
        paymentMethod,
        autoRenew: false,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        updatedAt: new Date()
      },
      create: {
        userId,
        plan,
        status: 'active',
        startDate,
        endDate,
        nextBillingDate,
        paymentMethod,
        autoRenew: false,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate
      }
    });

    // Sync legacy User.subscriptionTier
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: plan }
    });

    // Notification
    await fetch(`${process.env.NETLIFY_FUNCTIONS_BASE_PATH || '/.netlify/functions'}/notifications-api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: 'payment',
        title: `${plan} Subscription Activated`,
        message: `${plan} access activated for 30 days. Amount: ${amount.toLocaleString()}. Method: ${paymentMethod}.`,
        priority: 'high',
        metadata: { plan, subscriptionId: subscription.id, amount, paymentMethod }
      })
    });

    logger.info('Subscription created/updated', { userId, plan, subscriptionId: subscription.id });
    return subscription;
  } catch (error) {
    logger.error('Subscription create/update error', { error: error.message, userId, plan });
    throw error;
  }
}

/** 
 * Process Stripe payment 
 */
async function processAdminFeeTransaction(originalAmount: number, userId: string, transactionId: string, gateway: string): Promise<{ adminFee: number; netAmount: number; ceoAccountId: string } {
  const ADMIN_FEE_PERCENT = 2.5; // 2.5% transaction fee
  const CEO_ACCOUNT_ID = process.env.CEO_ACCOUNT_ID || CONFIG.CEO_ACCOUNT_ID;
  
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

    // Create real Payment record
    const paymentIntent = await prisma.payment.create({
      data: {
        userId,
        amount: feeResult.netAmount,
        currency: 'usd',
        reference: transactionId,
        status: 'completed',
        metadata: { adminFee: feeResult.adminFee }
      }
    });
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

    // Create pending Payment record for intent
    const intent = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: currency || 'usd',
        status: 'pending',
        reference: `intent_${Date.now()}`
      }
    });

    return { success: true, data: { clientSecret: `pi_${intent.id}`, paymentId: intent.id } };
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

    // Create real Payment record
    const paymentIntent = await prisma.payment.create({
      data: {
        id: `pp_${Date.now()}`,
        userId,
        amount: 1000,
        currency: 'usd',
        status: 'completed',
        method: 'paypal',
        reference: orderId
      }
    });

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
async function getMpesaAccessToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error('MPESA_CONSUMER_KEY or SECRET missing');
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const response = await fetch(process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials' : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });

  const data = await response.json();
  if (!data.access_token) throw new Error('Token fetch failed');
  return data.access_token;
}

async function processMpesaPayment(data: any): Promise<any> {
  const { phoneNumber, amount, userId, accountReference = 'SmartInvest', transactionDesc = 'Subscription Payment' } = data;
  const shortcode = process.env.MPESA_SHORTCODE || '8038267';
  const passkey = process.env.MPESA_PASSKEY;
  if (!passkey) throw new Error('MPESA_PASSKEY missing');

  try {
    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: Number(amount),
        phoneNumber: phoneNumber.replace(/[^0-9]/g, ''),
        reference: accountReference,
        status: 'pending'
      }
    });

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const token = await getMpesaAccessToken();

    const stkBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Number(amount),
      PartyA: phoneNumber.replace(/[^0-9]/g, ''),
      PartyB: shortcode,
      PhoneNumber: phoneNumber.replace(/[^0-9]/g, ''),
      CallBackURL: `${process.env.MPESA_CALLBACK_URL || 'https://your-site.netlify.app/.netlify/functions/payments-api?path=/mpesa/callback'}`,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc
    };

    const response = await fetch(process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/push' : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkBody)
    });

    const result = await response.json();

    if (result.ResponseCode !== '0') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' }
      });
      return { success: false, error: result.errorMessage || 'STK Push failed' };
    }

    // Update checkoutRequestId
    await prisma.payment.update({
      where: { id: payment.id },
      data: { checkoutRequestId: result.CheckoutRequestID }
    });

    logger.info('M-PESA STK Push sent', { checkoutRequestId: result.CheckoutRequestID, userId, amount });

    return { success: true, data: { checkoutRequestId: result.CheckoutRequestID, paymentId: payment.id } };
  } catch (error) {
    logger.error('MPESA payment error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Check MPESA payment status
 */
async function checkMpesaStatus(checkoutRequestId: string): Promise<any> {
  const shortcode = process.env.MPESA_SHORTCODE || '8038267';
  try {
    const payment = await prisma.payment.findUnique({
      where: { checkoutRequestId }
    });
    if (!payment) return { success: false, error: 'Payment not found' };

    const token = await getMpesaAccessToken();

    const queryBody = {
      BusinessShortCode: shortcode,
      Password: Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY || ''}${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)}`).toString('base64'),
      Timestamp: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3),
      CheckoutRequestID: checkoutRequestId
    };

    const response = await fetch(process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query' : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryBody)
    });

    const result = await response.json();

    if (result.ResponseCode !== '0') {
      return { success: false, error: 'Query failed' };
    }

    const resultCode = result.Body.stkCallback?.ResultCode;
    if (resultCode === 0) {
      const amount = result.Body.stkCallback.CallbackMetadata.Item.find((item: any) => item.Name === 'Amount').Value;
      const receipt = result.Body.stkCallback.CallbackMetadata.Item.find((item: any) => item.Name === 'MpesaReceiptNumber').Value;
      const phone = result.Body.stkCallback.CallbackMetadata.Item.find((item: any) => item.Name === 'PhoneNumber').Value;

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          mpesaReceipt: receipt,
          completedAt: new Date(),
          phoneNumber: phone
        }
      });

      // Update subscription
      await prisma.user.update({
        where: { id: payment.userId },
        data: { subscriptionTier: 'PREMIUM' }
      });

      // Create notification via api (or direct)
      await fetch(`${process.env.NETLIFY_FUNCTIONS_BASE_PATH || '/.netlify/functions'}/notifications-api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: payment.userId,
          type: 'payment',
          title: `Payment Confirmed: KES ${amount}`,
          message: `KES ${amount} subscription payment successful! Receipt: ${receipt}. Premium access activated.`,
          priority: 'high',
          metadata: { amount, receipt, paymentId: payment.id }
        })
      });

      logger.info('M-PESA payment completed', { checkoutRequestId, receipt, amount });
      return { success: true, data: { status: 'success', amount, receipt, paymentId: payment.id } };
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' }
      });
      return { success: true, data: { status: 'failed' } };
    }
  } catch (error) {
    logger.error('Check MPESA status error', { checkoutRequestId, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get payment history
 */
async function getPaymentHistory(userId: string, limit = 20, offset = 0): Promise<any> {
  try {
    const userPayments = await prisma.payment.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
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
    const subscription = await createOrUpdateSubscription(userId, plan as any, paymentMethodId || 'unknown', 10); // default amount
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
    const userSubs = await prisma.subscription.findMany({
      where: { userId }
    });
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
    const subscription = await prisma.subscription.updateMany({
      where: { id: subscriptionId, userId },
      data: { status: 'cancelled' }
    });
    if (subscription.count === 0) {
      return { success: false, error: 'Subscription not found' };
    }
    logger.info('Subscription cancelled', { subscriptionId, userId });
    return { success: true, data: { id: subscriptionId, status: 'cancelled' } };
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