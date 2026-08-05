/**
 * Unified Payment Service Handler
 * Consolidates all payment providers (PayPal, Google Pay, Stripe, M-Pesa, KCB)
 * Dynamic routing and fallback mechanism
 */

import { connectToDatabase } from './mongodb';
import { PayPalService } from './paypal-service';
import { GooglePayService } from './google-pay-service';
import paymentConfig from '../config/payment-services.config';

interface PaymentRequest {
  userId: string;
  email: string;
  amount: number;
  currency: string;
  description: string;
  preferredProvider?: string;
  metadata?: Record<string, any>;
}

interface PaymentResult {
  success: boolean;
  provider: string;
  transactionId?: string;
  orderId?: string;
  status?: string;
  message: string;
  data?: any;
  error?: string;
}

interface PaymentTransaction {
  userId: string;
  email: string;
  provider: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId: string;
  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

let paypalServiceInstance: PayPalService | null = null;
let googlePayServiceInstance: GooglePayService | null = null;

/**
 * Initialize all payment services
 */
export async function initializePaymentServices() {
  try {
    // Initialize PayPal
    if (paymentConfig.payment.paypal.enabled && !paypalServiceInstance) {
      paypalServiceInstance = new PayPalService({
        clientId: paymentConfig.payment.paypal.clientId,
        clientSecret: paymentConfig.payment.paypal.clientSecret,
        mode: paymentConfig.payment.paypal.mode,
        env: paymentConfig.payment.paypal.mode,
        returnUrl: paymentConfig.payment.paypal.returnUrl,
        cancelUrl: paymentConfig.payment.paypal.cancelUrl,
        receiverEmail: paymentConfig.payment.paypal.receiverEmail,
      });
      console.log('✓ PayPal service initialized');
    }

    // Initialize Google Pay
    if (paymentConfig.payment.googlePay.enabled && !googlePayServiceInstance) {
      googlePayServiceInstance = new GooglePayService(
        {
          merchantId: paymentConfig.payment.googlePay.merchantId,
          merchantName: paymentConfig.payment.googlePay.merchantName,
          email: paymentConfig.payment.googlePay.email,
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: ['CARD', 'PAYPAL'],
          environment: paymentConfig.payment.googlePay.environment,
        },
        paymentConfig.payment.googlePay.merchantPrivateKey
      );
      console.log('✓ Google Pay service initialized');
    }

    console.log('✓ All payment services initialized successfully');
  } catch (error) {
    console.error('✗ Payment service initialization error:', error);
    throw error;
  }
}

/**
 * Process payment using the best available provider
 */
export async function processPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
  const { userId, email, amount, currency, description, preferredProvider, metadata } = paymentRequest;

  try {
    // Log payment attempt
    await logPaymentAttempt({
      userId,
      email,
      amount,
      currency,
      provider: preferredProvider || 'auto',
      status: 'initiated',
    });

    let result: PaymentResult | null = null;
    let lastError: Error | null = null;

    // Get available providers in priority order
    const providers = preferredProvider
      ? [preferredProvider]
      : paymentConfig.getEnabledPaymentServices();

    for (const provider of providers) {
      try {
        result = await processPaymentWithProvider(
          provider,
          amount,
          currency,
          description,
          { userId, email, ...metadata }
        );

        if (result.success) {
          // Store successful transaction
          await storePaymentTransaction({
            userId,
            email,
            provider,
            amount,
            currency,
            status: 'completed',
            transactionId: result.transactionId || 'unknown',
            orderId: result.orderId,
            metadata: { ...metadata, provider },
          });

          return result;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`✗ Payment processing failed for ${provider}:`, error);
        // Continue to next provider
      }
    }

    // All providers failed
    const errorMessage = lastError?.message || 'All payment providers are currently unavailable';
    
    await storePaymentTransaction({
      userId,
      email,
      provider: preferredProvider || 'unknown',
      amount,
      currency,
      status: 'failed',
      transactionId: 'failed',
      metadata: { error: errorMessage, ...metadata },
    });

    return {
      success: false,
      provider: 'none',
      message: errorMessage,
      error: errorMessage,
    };
  } catch (error) {
    console.error('✗ Payment processing error:', error);
    return {
      success: false,
      provider: 'error',
      message: 'An unexpected error occurred during payment processing',
      error: (error as Error).message,
    };
  }
}

/**
 * Process payment with a specific provider
 */
async function processPaymentWithProvider(
  provider: string,
  amount: number,
  currency: string,
  description: string,
  metadata: Record<string, any>
): Promise<PaymentResult> {
  switch (provider) {
    case 'paypal':
      return await processPayPalPayment(amount, currency, description, metadata);

    case 'googlePay':
      return await processGooglePayPayment(amount, currency, description, metadata);

    case 'stripe':
      return await processStripePayment(amount, currency, description, metadata);

    case 'mpesa':
      return await processMpesaPayment(amount, currency, description, metadata);

    case 'kcbBank':
      return await processKCBPayment(amount, currency, description, metadata);

    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

/**
 * Process PayPal payment
 */
async function processPayPalPayment(
  amount: number,
  currency: string,
  description: string,
  metadata: Record<string, any>
): Promise<PaymentResult> {
  if (!paypalServiceInstance) {
    throw new Error('PayPal service not initialized');
  }

  try {
    const result = await paypalServiceInstance.createOrder(amount.toString(), currency, description);
    return {
      success: result.success,
      provider: 'paypal',
      orderId: result.orderId,
      transactionId: result.transactionId,
      status: result.status,
      message: result.message,
      data: result.data,
    };
  } catch (error) {
    throw new Error(`PayPal payment failed: ${(error as Error).message}`);
  }
}

/**
 * Process Google Pay payment
 */
async function processGooglePayPayment(
  amount: number,
  currency: string,
  description: string,
  metadata: Record<string, any>
): Promise<PaymentResult> {
  if (!googlePayServiceInstance) {
    throw new Error('Google Pay service not initialized');
  }

  try {
    // Generate payment request
    const paymentRequest = googlePayServiceInstance.generatePaymentRequest(amount.toString(), currency);
    
    return {
      success: true,
      provider: 'googlePay',
      message: 'Google Pay payment request generated',
      data: { paymentRequest },
    };
  } catch (error) {
    throw new Error(`Google Pay payment failed: ${(error as Error).message}`);
  }
}

/**
 * Process Stripe payment
 */
async function processStripePayment(
  amount: number,
  currency: string,
  description: string,
  metadata: Record<string, any>
): Promise<PaymentResult> {
  // Stripe payments are currently disabled/unsupported.
  // Future implementation would route to Stripe SDK or API here.
  const { warn } = require('../utils/logger');
  warn('Stripe payment requested but not available');

  return {
    success: false,
    provider: 'stripe',
    message: 'Stripe payments are currently unavailable',
  };
}

/**
 * Process M-Pesa payment
 */
async function processMpesaPayment(
  amount: number,
  currency: string,
  description: string,
  metadata: Record<string, any>
): Promise<PaymentResult> {
  // M-Pesa running as a stub for now; real implementation would
  // call Safaricom Daraja API to perform Lipa Na M-Pesa transaction.
  const { info } = require('../utils/logger');
  info('Stub M-Pesa payment for amount', amount, currency);

  return {
    success: true,
    provider: 'mpesa',
    message: 'M-Pesa payment accepted (stub)',
    data: { reference: `MPESA_${Date.now()}` }
  };
}

/**
 * Process KCB Bank manual payment
 */
async function processKCBPayment(
  amount: number,
  currency: string,
  description: string,
  metadata: Record<string, any>
): Promise<PaymentResult> {
  const kcbConfig = paymentConfig.payment.kcbBank;
  
  return {
    success: true,
    provider: 'kcbBank',
    message: 'KCB Bank manual payment details provided',
    data: {
      bankName: kcbConfig.bankName,
      accountName: kcbConfig.accountName,
      accountNumber: kcbConfig.accountNumber,
      branchName: kcbConfig.branchName,
      amount,
      currency,
      description,
      manualVerification: true,
    },
  };
}

/**
 * Store payment transaction in MongoDB
 */
async function storePaymentTransaction(transaction: Partial<PaymentTransaction>) {
  try {
    const { db } = await connectToDatabase();
    
    const document = {
      ...transaction,
      updatedAt: new Date(),
      createdAt: transaction.createdAt || new Date(),
    };

    const result = await db.collection('payments').insertOne(document as any);
    console.log(`✓ Payment transaction stored: ${result.insertedId}`);
    return result.insertedId;
  } catch (error) {
    console.error('✗ Failed to store payment transaction:', error);
    // Don't throw - payment was processed, just logging failed
  }
}

/**
 * Log payment attempt for auditing
 */
async function logPaymentAttempt(attempt: Record<string, any>) {
  try {
    const { db } = await connectToDatabase();
    
    await db.collection('auditLogs').insertOne({
      ...attempt,
      action: 'payment_attempt',
      timestamp: new Date(),
    });
  } catch (error) {
    console.warn('✗ Failed to log payment attempt:', error);
  }
}

/**
 * Verify payment status
 */
export async function verifyPaymentStatus(transactionId: string, provider: string): Promise<any> {
  try {
    const { db } = await connectToDatabase();
    
    const transaction = await db.collection('payments').findOne({
      transactionId,
      provider,
    });

    return transaction;
  } catch (error) {
    console.error('✗ Failed to verify payment status:', error);
    throw error;
  }
}

/**
 * Get payment history for a user
 */
export async function getUserPaymentHistory(userId: string, limit: number = 50) {
  try {
    const { db } = await connectToDatabase();
    
    const payments = await db
      .collection('payments')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return payments;
  } catch (error) {
    console.error('✗ Failed to retrieve payment history:', error);
    throw error;
  }
}

/**
 * Check if email has payment methods configured
 */
export async function checkEmailPaymentMethods(email: string): Promise<{
  paypal: boolean;
  googlePay: boolean;
  stripe: boolean;
  mpesa: boolean;
  kcbBank: boolean;
}> {
  return {
    paypal: email === paymentConfig.payment.paypal.receiverEmail,
    googlePay: email === paymentConfig.payment.googlePay.email,
    stripe: !!paymentConfig.payment.stripe.enabled,
    mpesa: !!paymentConfig.payment.mpesa.enabled,
    kcbBank: !!paymentConfig.payment.kcbBank.enabled,
  };
}

export default {
  initializePaymentServices,
  processPayment,
  verifyPaymentStatus,
  getUserPaymentHistory,
  checkEmailPaymentMethods,
};
