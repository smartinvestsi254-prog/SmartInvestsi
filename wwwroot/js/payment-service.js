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
    this.subPollingInterval = null;
  }

  /**
   * Initialize payment service
   */
  async init() {
    await this.loadStripe();
    await this.loadPayPal();
    this.initMpesa();
    this.startSubscriptionPolling();
  }

  /**
   * Load Stripe.js
   */
  async loadStripe() {
    if (window.Stripe) {
      this.stripe = window.Stripe('your_stripe_publishable_key');
      return;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => {
        this.stripe = window.Stripe('your_stripe_publishable_key');
        resolve(null);
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
      script.src = 'https://www.paypal.com/sdk/js?client-id=your_paypal_client_id&currency=USD';
      script.onload = () => {
        this.paypal = window.paypal;
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize M-Pesa
   */
  initMpesa() {
    this.mpesa = { initialized: true };
  }

  /**
   * Process payment with Stripe (add plan)
   */
  async processStripePayment(paymentMethodId, amount, currency = 'usd', plan = 'PREMIUM') {
    try {
      this.notifyListeners('paymentProcessing', { method: 'stripe' });

      const response = await fetch(`${this.baseUrl}/payments-api?path=/stripe/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          paymentMethodId,
          amount: Math.round(amount * 100),
          currency,
          plan
        })
      });

      const data = await response.json();

      if (data.success) {
        this.notifyListeners('paymentSuccess', {
          method: 'stripe',
          transactionId: data.data.id,
          amount,
          currency,
          plan
        });
        this.checkSubscriptionStatus();
        return data.data;
      } else {
        this.notifyListeners('paymentError', { method: 'stripe', error: data.error });
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      this.notifyListeners('paymentError', { method: 'stripe', error: error.message });
      throw error;
    }
  }

  /**
   * Process M-Pesa payment (add subscriptionType)
   */
  async processMpesaPayment(phoneNumber, amount, subscriptionType = 'PREMIUM') {
    try {
      this.notifyListeners('paymentProcessing', { method: 'mpesa' });

      const response = await fetch(`${this.baseUrl}/payments-api?path=/mpesa/stkpush`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          phoneNumber,
          amount,
          subscriptionType
        })
      });

      const data = await response.json();

      if (data.success) {
        this.notifyListeners('paymentPending', {
          method: 'mpesa',
          checkoutRequestId: data.data.checkoutRequestId,
          amount,
          subscriptionType
        });
        return data.data;
      } else {
        this.notifyListeners('paymentError', { method: 'mpesa', error: data.error });
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      this.notifyListeners('paymentError', { method: 'mpesa', error: error.message });
      throw error;
    }
  }

  /**
   * Process PayPal payment (add plan)
   */
  async processPayPalPayment(orderId, plan = 'PREMIUM') {
    try {
      this.notifyListeners('paymentProcessing', { method: 'paypal' });

      const response = await fetch(`${this.baseUrl}/payments-api?path=/paypal/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          orderId,
          plan
        })
      });

      const data = await response.json();

      if (data.success) {
        this.notifyListeners('paymentSuccess', {
          method: 'paypal',
          transactionId: data.data.id,
          amount: data.data.amount,
          currency: data.data.currency,
          plan
        });
        this.checkSubscriptionStatus();
        return data.data;
      } else {
        this.notifyListeners('paymentError', { method: 'paypal', error: data.error });
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('PayPal payment error:', error);
      this.notifyListeners('paymentError', { method: 'paypal', error: error.message });
      throw error;
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus() {
    try {
      const token = this.getAuthToken();
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${this.baseUrl}/payments-api?path=/subscription/get`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Get sub status error:', error);
      return null;
    }
  }

  /**
   * Check subscription status and poll for renewals
   */
  async checkSubscriptionStatus() {
    const subs = await this.getSubscriptionStatus();
    if (subs && subs.length > 0) {
      const activeSub = subs.find((s: any) => s.status === 'active');
      if (activeSub) {
        const daysLeft = Math.floor((new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 7) {
          this.notifyListeners('subscriptionWarning', { daysLeft, plan: activeSub.plan });
        }
      }
    }
  }

  /**
   * Start subscription polling
   */
  startSubscriptionPolling() {
    this.subPollingInterval = setInterval(() => {
      this.checkSubscriptionStatus();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.subPollingInterval) {
      clearInterval(this.subPollingInterval);
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
        if (data.data.status === 'success') {
          this.notifyListeners('paymentSuccess', {
            method: 'mpesa',
            receipt: data.data.receipt,
            amount: data.data.amount,
            plan: data.data.plan
          });
          this.checkSubscriptionStatus();
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

  // Existing methods unchanged...
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
      if (data.success) return data.data;
      throw new Error(data.error);
    } catch (error) {
      console.error('Get payment history error:', error);
      throw error;
    }
  }

  getPaymentMethods() {
    // Unchanged
  }

  addPaymentMethod(methodData) {
    // Unchanged
  }

  removePaymentMethod(methodId) {
    // Unchanged
  }

  formatAmount(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  }

  validateAmount(amount) {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0 && numAmount <= 10000;
  }

  getAuthToken() {
    return localStorage.getItem('auth_token') || '';
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

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

// Global instance
const paymentService = new PaymentService();
window.PaymentService = paymentService;

