/**
 * M-Pesa Pochi la Biashara Payment Routes
 * Handles STK Push, callbacks, and business account operations
 */

const express = require('express');
const router = express.Router();
const MpesaPochi = require('../lib/mpesa-pochi');
const EmailService = require('../services/EmailService');
const PremiumAccessService = require('../services/PremiumAccessService');
const NotificationService = require('../services/NotificationService');

// Initialize Pochi handler
const pochi = new MpesaPochi({
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  businessShortCode: process.env.MPESA_NUMBER || process.env.MPESA_SHORTCODE,
  passKey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL,
  pochiAccountName: process.env.MPESA_POCHI_NAME || 'SmartInvest',
  env: process.env.MPESA_ENV || 'sandbox'
});

/**
 * GET /api/pochi/info
 * Get Pochi account information
 */
router.get('/info', async (req, res) => {
  try {
    return res.json({
      success: true,
      account: {
        name: pochi.pochiAccountName,
        shortCode: pochi.businessShortCode,
        environment: pochi.env,
        callbackUrl: pochi.callbackUrl
      }
    });
  } catch (error) {
    return res.json({ success: false, error: error.message });
  }
});

// Health/test endpoint for Pochi
router.get('/test', async (req, res) => {
  try {
    return res.json({
      success: true,
      message: 'Pochi route is reachable',
      config: {
        name: pochi.pochiAccountName,
        shortCode: pochi.businessShortCode,
        environment: pochi.env,
        callbackUrl: pochi.callbackUrl
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/pochi/stk-push
 * Initiate STK Push payment
 * Body: { phoneNumber, amount, accountReference, description }
 */
router.post('/stk-push', async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference, description } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber and amount are required'
      });
    }

    const result = await pochi.stkPush(
      phoneNumber,
      amount,
      accountReference || description || 'SmartInvest Payment'
    );

    if (result.success) {
      // Log successful request
      pochi.logTransaction('STK_PUSH', {
        phone: phoneNumber,
        amount: amount,
        checkoutId: result.checkoutRequestId,
        timestamp: new Date().toISOString()
      });

      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('STK Push error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pochi/query-stk
 * Query STK Push status
 * Body: { checkoutRequestId }
 */
router.post('/query-stk', async (req, res) => {
  try {
    const { checkoutRequestId } = req.body;

    if (!checkoutRequestId) {
      return res.status(400).json({
        success: false,
        error: 'checkoutRequestId is required'
      });
    }

    const result = await pochi.querySTKStatus(checkoutRequestId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pochi/callback
 * Webhook for M-Pesa payment callbacks
 */
router.post('/callback', express.json(), async (req, res) => {
  try {
    // Acknowledge receipt immediately
    res.json({ success: true });

    // Process callback asynchronously
    const validation = pochi.validateCallback(req.body);

    pochi.logTransaction('CALLBACK_RECEIVED', {
      validation: validation,
      timestamp: new Date().toISOString()
    });

    if (validation.valid && validation.status === 'success') {
      // ✅ FIXED: Payment successful - update database
      console.log('✓ Payment successful:', {
        receipt: validation.mpesaReceiptNumber,
        amount: validation.amount,
        phone: validation.phoneNumber,
        date: validation.transactionDate
      });

      // Update payment status in database
      try {
        // Log successful transaction
        console.log(`Recording payment: ${validation.mpesaReceiptNumber}`);
        pochi.logTransaction('PAYMENT_CONFIRMED', {
          receipt: validation.mpesaReceiptNumber,
          amount: validation.amount,
          phone: validation.phoneNumber,
          timestamp: new Date().toISOString()
        });

        const metadataItems = req.body?.Body?.stkCallback?.CallbackMetadata?.Item || [];
        const emailItem = metadataItems.find((item) => /email/i.test(item.Name));
        const recipientEmail = req.body?.customerEmail || req.body?.email || emailItem?.Value || null;

        const emailService = new EmailService();
        const premiumService = new PremiumAccessService();
        const notificationService = new NotificationService();

        if (recipientEmail) {
          console.log(`📧 Sending confirmation email to ${recipientEmail}`);
          await emailService.sendPaymentConfirmation({
            toEmail: recipientEmail,
            amount: validation.amount,
            receipt: validation.mpesaReceiptNumber,
            currency: 'KES'
          });
        } else {
          console.log('📧 No email found for payment confirmation');
        }

        console.log(`🔑 Granting premium access to ${validation.phoneNumber}`);
        await premiumService.grantPremiumAccess({
          phone: validation.phoneNumber,
          email: recipientEmail,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          reason: 'pochi_payment'
        });

        await notificationService.sendPaymentSuccessNotification({
          phone: validation.phoneNumber,
          amount: validation.amount,
          currency: 'KES'
        });
      } catch (updateError) {
        console.error('Error updating payment status:', updateError);
      }
    } else if (validation.valid && validation.status === 'failed') {
      console.log('✗ Payment failed:', validation.resultDesc);
      
      // ✅ FIXED: Update payment failure in database
      try {
        pochi.logTransaction('PAYMENT_FAILED', {
          phone: validation.phoneNumber,
          reason: validation.resultDesc,
          timestamp: new Date().toISOString()
        });

        const metadataItems = req.body?.Body?.stkCallback?.CallbackMetadata?.Item || [];
        const emailItem = metadataItems.find((item) => /email/i.test(item.Name));
        const recipientEmail = req.body?.customerEmail || req.body?.email || emailItem?.Value || null;

        const emailService = new EmailService();
        const notificationService = new NotificationService();
        const retryUrl = process.env.PAYMENT_RETRY_URL || 'https://smartinvest.example.com/payment/retry';

        console.log(`⚠️ Notifying user ${validation.phoneNumber} of payment failure`);
        await notificationService.sendPaymentFailureAlert({
          phone: validation.phoneNumber,
          reason: validation.resultDesc,
          retryUrl
        });

        if (recipientEmail) {
          await emailService.sendPaymentFailure({
            toEmail: recipientEmail,
            reason: validation.resultDesc
          });
        }
      } catch (failureError) {
        console.error('Error logging payment failure:', failureError);
      }
    }
  } catch (error) {
    console.error('Callback processing error:', error);
    // Still return 200 to acknowledge receipt
    res.json({ success: true });
  }
});

/**
 * POST /api/pochi/b2c-payment
 * Send money to customer (requires proper credentials)
 * Body: { phoneNumber, amount, description }
 */
router.post('/b2c-payment', async (req, res) => {
  try {
    const { phoneNumber, amount, description } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber and amount are required'
      });
    }

    // Verify admin authorization
    const auth = req.headers.authorization;
    if (!auth || !auth.includes('Bearer')) {
      return res.status(401).json({
        success: false,
        error: 'Admin authorization required'
      });
    }

    const result = await pochi.b2cPayment(
      phoneNumber,
      amount,
      description || 'Payment'
    );

    if (result.success) {
      pochi.logTransaction('B2C_PAYMENT', {
        phone: phoneNumber,
        amount: amount,
        timestamp: new Date().toISOString()
      });

      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pochi/balance
 * Check business account balance
 */
router.get('/balance', async (req, res) => {
  try {
    // Verify admin authorization
    const auth = req.headers.authorization;
    if (!auth || !auth.includes('Bearer')) {
      return res.status(401).json({
        success: false,
        error: 'Admin authorization required'
      });
    }

    const result = await pochi.checkBalance();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pochi/test
 * Test connection and configuration
 */
router.get('/test', async (req, res) => {
  try {
    const token = await pochi.getAccessToken();

    if (token) {
      return res.json({
        success: true,
        message: 'M-Pesa Pochi connection successful',
        config: {
          environment: pochi.env,
          shortCode: pochi.businessShortCode,
          accountName: pochi.pochiAccountName,
          hasPassKey: !!pochi.passKey,
          hasCallbackUrl: !!pochi.callbackUrl
        }
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
      hint: 'Check MPESA credentials in .env file'
    });
  }
});

module.exports = router;
