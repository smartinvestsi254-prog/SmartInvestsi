/**
 * Payment Service for SmartInvest
 * Handles payment processing and transactions
 */

class PaymentService {
  constructor() {
    this.baseUrl = '/.netlify/functions';
    this.stripe = null;
    this.paypal = null;
    this.mpesa = null;
    this.listeners = new Set();
  }

  /**
   * Initialize payment service
   */
  async init() {
    await this.loadStripe();
    await this.loadPayPal();
    this.initMpesa();
  }

  /**
   * Load Stripe.js
   */
  async loadStripe() {
    if (window.Stripe) {
      this.stripe = window.Stripe('your_stripe_publishable_key'); // Replace with actual key
      return;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => {
        this.stripe = window.Stripe('your_stripe_publishable_key'); // Replace with actual key
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Load PayPal SDK
   */
  async loadPayPal() {
    if (window.paypal) {
      this.paypal = window.paypal;
      return;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://www.paypal.com/sdk/js?client-id=your_paypal_client_id&currency=USD'; // Replace with actual client ID
      script.onload = () => {
        this.paypal = window.paypal;
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize M-Pesa
   */
  initMpesa() {
    // M-Pesa integration would go here
    this.mpesa = {
      initialized: true
    };
  }

  /**
   * Process payment with Stripe
   */
  async processStripePayment(paymentMethodId, amount, currency = 'usd') {
    try {
      this.notifyListeners('paymentProcessing', { method: 'stripe' });

      const response = await fetch(`${this.baseUrl}/payments-api/stripe/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          paymentMethodId,
          amount: Math.round(amount * 100), // Convert to cents
          currency
        })
      });

      const data = await response.json();

      if (data.success) {
        this.notifyListeners('paymentSuccess', {
          method: 'stripe',
          transactionId: data.data.transactionId,
          amount,
          currency
        });
        return data.data;
      } else {
        this.notifyListeners('paymentError', {
          method: 'stripe',
          error: data.error
        });
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      this.notifyListeners('paymentError', {
        method: 'stripe',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create Stripe payment intent
   */
  async createStripePaymentIntent(amount, currency = 'usd') {
    try {
      const response = await fetch(`${this.baseUrl}/payments-api/stripe/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency
        })
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Create payment intent error:', error);
      throw error;
    }
  }

  /**
   * Process PayPal payment
   */
  async processPayPalPayment(orderId) {
    try {
      this.notifyListeners('paymentProcessing', { method: 'paypal' });

      const response = await fetch(`${this.baseUrl}/payments-api/paypal/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          orderId
        })
      });

      const data = await response.json();

      if (data.success) {
        this.notifyListeners('paymentSuccess', {
          method: 'paypal',
          transactionId: data.data.transactionId,
          amount: data.data.amount,
          currency: data.data.currency
        });
        return data.data;
      } else {
        this.notifyListeners('paymentError', {
          method: 'paypal',
          error: data.error
        });
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('PayPal payment error:', error);
      this.notifyListeners('paymentError', {
        method: 'paypal',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process M-Pesa payment
   */
  async processMpesaPayment(phoneNumber, amount) {
    try {
      this.notifyListeners('paymentProcessing', { method: 'mpesa' });

      const response = await fetch(`${this.baseUrl}/payments-api/mpesa/stkpush`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          phoneNumber,
          amount
        })
      });

      const data = await response.json();

      if (data.success) {
        this.notifyListeners('paymentPending', {
          method: 'mpesa',
          checkoutRequestId: data.data.checkoutRequestId,
          amount
        });
        return data.data;
      } else {
        this.notifyListeners('paymentError', {
          method: 'mpesa',
          error: data.error
        });
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      this.notifyListeners('paymentError', {
        method: 'mpesa',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check M-Pesa payment status
   */
  async checkMpesaPaymentStatus(checkoutRequestId) {
    try {
      const response = await fetch(`${this.baseUrl}/payments-api/mpesa/status/${checkoutRequestId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.status === 'completed') {
          this.notifyListeners('paymentSuccess', {
            method: 'mpesa',
            transactionId: data.data.transactionId,
            amount: data.data.amount
          });
        } else if (data.data.status === 'failed') {
          this.notifyListeners('paymentError', {
            method: 'mpesa',
            error: 'Payment failed'
          });
        }
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Check M-Pesa status error:', error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(limit = 20, offset = 0) {
    try {
      const response = await fetch(`${this.baseUrl}/payments-api/history?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Get payment history error:', error);
      throw error;
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods() {
    try {
      const response = await fetch(`${this.baseUrl}/payments-api/methods`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Get payment methods error:', error);
      throw error;
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(methodData) {
    try {
      const response = await fetch(`${this.baseUrl}/payments-api/methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(methodData)
      });

      const data = await response.json();

      if (data.success) {
        this.notifyListeners('paymentMethodAdded', data.data);
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Add payment method error:', error);
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(methodId) {
    try {
      const response = await fetch(`${this.baseUrl}/payments-api/methods/${methodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.notifyListeners('paymentMethodRemoved', methodId);
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Remove payment method error:', error);
      throw error;
    }
  }

  /**
   * Format amount for display
   */
  formatAmount(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  }

  /**
   * Validate payment amount
   */
  validateAmount(amount) {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0 && numAmount <= 10000; // Max $10,000
  }

  /**
   * Get auth token
   */
  getAuthToken() {
    return localStorage.getItem('auth_token') || '';
  }

  /**
   * Add event listener
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove event listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Payment listener error:', error);
      }
    });
  }
}

// Create global instance
const paymentService = new PaymentService();

// Make it globally available
window.PaymentService = paymentService;