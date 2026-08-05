/**
 * M-Pesa Pochi la Biashara (Business Account) Integration
 * Handles payment processing via business wallet
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

class MpesaPochi {
  constructor(config = {}) {
    this.consumerKey = config.consumerKey || process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = config.consumerSecret || process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = config.businessShortCode || process.env.MPESA_NUMBER || process.env.MPESA_SHORTCODE;
    this.passKey = config.passKey || process.env.MPESA_PASSKEY;
    this.callbackUrl = config.callbackUrl || process.env.MPESA_CALLBACK_URL;
    this.pochiAccountName = config.pochiAccountName || 'SmartInvest';
    this.env = config.env || process.env.MPESA_ENV || 'sandbox';
    this.initiatorPassword = config.initiatorPassword || process.env.MPESA_INITIATOR_PASSWORD;
    this.publicKey = config.publicKey || process.env.MPESA_PUBLIC_KEY || process.env.MPESA_PUBLIC_KEY_B64;
    
    this.baseUrl = this.env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Get OAuth token from Safaricom Daraja API
   */
  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const url = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` }
      });

      if (!response.ok) {
        throw new Error(`Auth failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      throw new Error(`Failed to get M-Pesa token: ${error.message}`);
    }
  }

  /**
   * Generate password for M-Pesa requests
   */
  generatePassword(timestamp) {
    return Buffer.from(
      `${this.businessShortCode}${this.passKey}${timestamp}`
    ).toString('base64');
  }

  /**
   * Get current timestamp in required format
   */
  getTimestamp() {
    const now = new Date();
    return now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
  }

  /**
   * Initiate STK Push (prompt user on phone)
   */
  async stkPush(phoneNumber, amount, accountReference = 'Payment') {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: parseInt(amount),
        PartyA: this.formatPhoneNumber(phoneNumber),
        PartyB: this.businessShortCode,
        PhoneNumber: this.formatPhoneNumber(phoneNumber),
        CallBackURL: this.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: `${this.pochiAccountName} Payment`
      };

      const response = await fetch(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errorMessage || 'STK Push failed');
      }

      return {
        success: true,
        requestId: data.RequestId,
        responseCode: data.ResponseCode,
        responseDesc: data.ResponseDescription,
        checkoutRequestId: data.CheckoutRequestId,
        message: 'STK prompt sent successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Query STK Push Status
   */
  async querySTKStatus(checkoutRequestId) {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await fetch(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      return {
        success: response.ok,
        responseCode: data.ResponseCode,
        responseDesc: data.ResponseDescription,
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * B2C Payment (Send money to customer)
   */
  async b2cPayment(phoneNumber, amount, description = 'Payout') {
    try {
      const token = await this.getAccessToken();

      const payload = {
        InitiatorName: this.pochiAccountName,
        SecurityCredential: await this.getSecurityCredential(),
        CommandID: 'BusinessPayment',
        Amount: parseInt(amount),
        PartyA: this.businessShortCode,
        PartyB: this.formatPhoneNumber(phoneNumber),
        Remarks: description,
        QueueTimeOutURL: this.callbackUrl,
        ResultURL: this.callbackUrl
      };

      const response = await fetch(
        `${this.baseUrl}/mpesa/b2c/v1/paymentrequest`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errorMessage || 'B2C Payment failed');
      }

      return {
        success: true,
        conversationId: data.ConversationID,
        originatorConversationId: data.OriginatorConversationID,
        responseCode: data.ResponseCode,
        responseDesc: data.ResponseDescription
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Account Balance Query
   */
  async checkBalance() {
    try {
      const token = await this.getAccessToken();

      const payload = {
        Initiator: this.pochiAccountName,
        SecurityCredential: await this.getSecurityCredential(),
        CommandID: 'GetAccount',
        PartyA: this.businessShortCode,
        IdentifierType: 1,
        Remarks: 'Balance Check',
        QueueTimeOutURL: this.callbackUrl,
        ResultURL: this.callbackUrl
      };

      const response = await fetch(
        `${this.baseUrl}/mpesa/accountbalance/v1/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      return {
        success: response.ok,
        responseCode: data.ResponseCode,
        responseDesc: data.ResponseDescription,
        conversationId: data.ConversationID
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process callback response from M-Pesa
   */
  validateCallback(callbackData) {
    try {
      const { Body } = callbackData;

      if (!Body || !Body.stkCallback) {
        return { valid: false, error: 'Invalid callback structure' };
      }

      const { stkCallback } = Body;
      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

      if (ResultCode === 0) {
        // Payment successful
        const metadata = CallbackMetadata?.Item || [];
        const extractedData = {};

        metadata.forEach(item => {
          extractedData[item.Name] = item.Value;
        });

        return {
          valid: true,
          status: 'success',
          checkoutRequestId: CheckoutRequestID,
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          mpesaReceiptNumber: extractedData.MpesaReceiptNumber,
          transactionDate: extractedData.TransactionDate,
          phoneNumber: extractedData.PhoneNumber,
          amount: extractedData.Amount
        };
      } else {
        // Payment failed or cancelled
        return {
          valid: true,
          status: 'failed',
          checkoutRequestId: CheckoutRequestID,
          resultCode: ResultCode,
          resultDesc: ResultDesc
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Format phone number to M-Pesa format (254xxx...)
   */
  formatPhoneNumber(phone) {
    // Remove common separators and country code prefixes
    let clean = phone.replace(/[\s\-()]/g, '');

    if (clean.startsWith('+254')) {
      clean = '254' + clean.slice(4);
    } else if (clean.startsWith('0254')) {
      clean = '254' + clean.slice(4);
    } else if (clean.startsWith('254')) {
      // Already correct format
    } else if (clean.startsWith('0')) {
      clean = '254' + clean.slice(1);
    } else {
      clean = '254' + clean;
    }

    return clean;
  }

  /**
   * Generate security credential using M-Pesa public key encryption
   */
  async getSecurityCredential() {
    if (!this.initiatorPassword) {
      throw new Error('MPESA_INITIATOR_PASSWORD is required to generate security credential');
    }

    if (!this.publicKey) {
      throw new Error('MPESA_PUBLIC_KEY or MPESA_PUBLIC_KEY_B64 is required to generate security credential');
    }

    let publicKey = this.publicKey;
    if (!publicKey.includes('BEGIN')) {
      publicKey = Buffer.from(publicKey, 'base64').toString('utf8');
    }

    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      Buffer.from(this.initiatorPassword)
    );

    return encrypted.toString('base64');
  }

  /**
   * Generate transaction reference
   */
  generateTransactionRef() {
    return `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Log transaction details
   */
  logTransaction(type, details) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] M-Pesa ${type}:`, JSON.stringify(details, null, 2));
  }
}

module.exports = MpesaPochi;
