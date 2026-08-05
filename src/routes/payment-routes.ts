/**
 * Payment Routes Integration
 * Unified payment processing for PayPal, Google Pay, M-Pesa, and other payment methods
 */

import express, { Request, Response, Router } from 'express';
import { getPayPalService, initializePayPalService } from '../lib/paypal-service';
import { getGooglePayService, getGoogleWalletService, initializeGooglePayService, initializeGoogleWalletService } from '../lib/google-pay-service';
import { connectToDatabase } from '../lib/mongodb';

const router: Router = express.Router();

// Middleware to ensure payment services are initialized
router.use(async (req: Request, res: Response, next) => {
  try {
    // Initialize services if not already done
    if (!req.app.locals.paypalService) {
      req.app.locals.paypalService = initializePayPalService();
    }
    if (!req.app.locals.googlePayService) {
      req.app.locals.googlePayService = initializeGooglePayService();
    }
    if (!req.app.locals.googleWalletService) {
      req.app.locals.googleWalletService = initializeGoogleWalletService();
    }
    next();
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('Payment service initialization error:', error);
    res.status(500).json({ error: 'Payment service not available' });
  }
});

/**
 * PayPal Routes
 */

/**
 * POST /api/payments/paypal/create-order
 * Create a PayPal order
 */
router.post('/paypal/create-order', async (req: Request, res: Response) => {
  try {
    const { amount, currency, description } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paypalService = getPayPalService();
    const result = await paypalService.createOrder(amount.toString(), currency || 'USD', description);

    res.json(result);
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('PayPal order creation error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

/**
 * POST /api/payments/paypal/capture-order
 * Capture a PayPal order
 */
router.post('/paypal/capture-order', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const paypalService = getPayPalService();
    const result = await paypalService.captureOrder(orderId);

    // Store payment in MongoDB
    if (result.success) {
      try {
        const { db } = await connectToDatabase();
        await db.collection('payments').insertOne({
          provider: 'paypal',
          orderId: result.orderId,
          status: result.status,
          transactionId: result.transactionId,
          userId: (req as any).user?.id || 'anonymous',
          createdAt: new Date(),
          metadata: result.data,
        });
      } catch (dbError) {
          const { warn } = require('../utils/logger');
          warn('Failed to store payment in MongoDB:', dbError);
        }
    }

    res.json(result);
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('PayPal capture order error:', error);
    res.status(500).json({ error: 'Failed to capture PayPal order' });
  }
});

/**
 * GET /api/payments/paypal/order/:orderId
 * Get PayPal order details
 */
router.get('/paypal/order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const paypalService = getPayPalService();
    const result = await paypalService.getOrderDetails(orderId);

    res.json(result);
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('PayPal order details error:', error);
    res.status(500).json({ error: 'Failed to get PayPal order details' });
  }
});

/**
 * POST /api/payments/paypal/refund
 * Refund a PayPal payment
 */
router.post('/paypal/refund', async (req: Request, res: Response) => {
  try {
    const { captureId, amount } = req.body;

    if (!captureId) {
      return res.status(400).json({ error: 'Capture ID is required' });
    }

    const paypalService = getPayPalService();
    const result = await paypalService.refundPayment(captureId, amount);

    res.json(result);
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('PayPal refund error:', error);
    res.status(500).json({ error: 'Failed to refund PayPal payment' });
  }
});

/**
 * POST /api/payments/paypal/webhook
 * Handle PayPal webhook events
 */
router.post('/paypal/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const event = JSON.parse((req.body as any).toString());

    const paypalService = getPayPalService();
    await paypalService.handleWebhookEvent(event);

    // Store webhook in MongoDB
    try {
      const { db } = await connectToDatabase();
      await db.collection('webhooks').insertOne({
        provider: 'paypal',
        eventType: event.event_type,
        reference: event.resource?.id,
        processed: true,
        createdAt: new Date(),
        data: event,
      });
    } catch (dbError) {
      const { warn } = require('../utils/logger');
      warn('Failed to store webhook in MongoDB:', dbError);
    }

    res.json({ received: true });
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('PayPal webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Google Pay Routes
 */

/**
 * POST /api/payments/google-pay/request
 * Get Google Pay request for client
 */
router.post('/google-pay/request', async (req: Request, res: Response) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const googlePayService = getGooglePayService();
    const paymentRequest = googlePayService.generatePaymentRequest(amount.toString(), currency || 'USD');

    res.json({
      success: true,
      paymentRequest,
      message: 'Google Pay payment request generated',
    });
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('Google Pay request error:', error);
    res.status(500).json({ error: 'Failed to generate Google Pay request' });
  }
});

/**
 * POST /api/payments/google-pay/process
 * Process Google Pay token
 */
router.post('/google-pay/process', async (req: Request, res: Response) => {
  try {
    const { token, amount, currency } = req.body;

    if (!token || !amount) {
      return res.status(400).json({ error: 'Token and amount are required' });
    }

    const googlePayService = getGooglePayService();
    const result = await googlePayService.processPaymentToken(token, amount.toString(), currency || 'USD');

    // Store payment in MongoDB
    if (result.success) {
      try {
        const { db } = await connectToDatabase();
        await db.collection('payments').insertOne({
          provider: 'google_pay',
          transactionId: result.transactionId,
          status: result.status,
          amount,
          currency: currency || 'USD',
          userId: (req as any).user?.id || 'anonymous',
          createdAt: new Date(),
          metadata: result.data,
        });
      } catch (dbError) {
        const { warn } = require('../utils/logger');
        warn('Failed to store payment in MongoDB:', dbError);
      }
    }

    res.json(result);
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('Google Pay process error:', error);
    res.status(500).json({ error: 'Failed to process Google Pay payment' });
  }
});

/**
 * POST /api/payments/google-pay/refund
 * Refund a Google Pay payment
 */
router.post('/google-pay/refund', async (req: Request, res: Response) => {
  try {
    const { transactionId, amount } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const googlePayService = getGooglePayService();
    const result = await googlePayService.refundTransaction(transactionId, amount);

    res.json(result);
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('Google Pay refund error:', error);
    res.status(500).json({ error: 'Failed to refund Google Pay payment' });
  }
});

/**
 * POST /api/payments/google-wallet/loyalty
 * Create Google Wallet loyalty pass
 */
router.post('/google-wallet/loyalty', async (req: Request, res: Response) => {
  try {
    const { userId, displayName } = req.body;

    if (!userId || !displayName) {
      return res.status(400).json({ error: 'User ID and display name are required' });
    }

    const googleWalletService = getGoogleWalletService();
    const result = await googleWalletService.createLoyaltyPass(userId, displayName);

    res.json(result);
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('Google Wallet loyalty pass error:', error);
    res.status(500).json({ error: 'Failed to create loyalty pass' });
  }
});

/**
 * GET /api/payments/status
 * Get unified payment status - check all payment systems
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        paypal: {
          configured: !!process.env.PAYPAL_CLIENT_ID,
          environment: process.env.PAYPAL_ENV || 'sandbox',
          available: true
        },
        googlePay: {
          configured: !!process.env.GOOGLE_MERCHANT_ID,
          environment: process.env.NODE_ENV || 'development',
          available: true
        },
        mpesa: {
          configured: !!process.env.MPESA_CONSUMER_KEY,
          available: true
        },
        bank: {
          configured: !!process.env.KCB_ACCOUNT_NUMBER,
          available: true
        },
        paystack: { available: false },
        flutterwave: { available: false },
        stripe: { available: false },
        crypto: { available: false },
        mongodb: {
          configured: !!process.env.MONGODB_URI,
        },
      },
    };

    // Test MongoDB connection
    try {
      const { db } = await connectToDatabase();
      await db.admin().ping();
      status.services.mongodb.status = 'connected';
    } catch (error) {
      status.services.mongodb.status = 'disconnected';
      status.services.mongodb.error = error instanceof Error ? error.message : 'Unknown error';
    }

    res.json(status);
  } catch (error) {
    const { error: logError } = require('../utils/logger');
    logError('Payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

/**
 * GET /api/payments/health
 * Health check for payment services
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      paypal: process.env.PAYPAL_ENV ? 'configured' : 'not configured',
      googlePay: process.env.GOOGLE_MERCHANT_ID ? 'configured' : 'not configured',      mpesa: process.env.MPESA_CONSUMER_KEY ? 'configured' : 'not configured',
      bank: process.env.KCB_ACCOUNT_NUMBER ? 'configured' : 'not configured',
      paystack: 'disabled',
      flutterwave: 'disabled',
      stripe: 'disabled',
      crypto: 'disabled'    },
  });
});

export default router;
