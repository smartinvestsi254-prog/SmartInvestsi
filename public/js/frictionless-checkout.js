// Frictionless Checkout - One-Click Payments for SmartInvest
// Supports PayPal Express, Stripe Elements, Apple Pay, Google Pay
// Backend integration ready

class FrictionlessCheckout {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || '/api/payments';
    this.stripeKey = options.stripeKey || 'pk_test_...';
    this.paypalClientId = options.paypalClientId || '';
    this.supportedMethods = ['stripe', 'paypal', 'mpesa', 'crypto'];
    this.init();
  }

  init() {
    this.loadStripe();
    this.loadPayPal();
    this.bindButtons();
    this.detectWalletSupport();
  }

  loadStripe() {
    if (window.Stripe) return;
    const stripeScript = document.createElement('script');
    stripeScript.src = `https://js.stripe.com/v3/?publishableKey=${this.stripeKey}`;
    stripeScript.async = true;
    document.head.appendChild(stripeScript);
  }

  loadPayPal() {
    if (window.paypal) return;
    const paypalScript = document.createElement('script');
    paypalScript.src = `https://www.paypal.com/sdk/js?client-id=${this.paypalClientId}&components=buttons`;
    paypalScript.async = true;
    document.head.appendChild(paypalScript);
  }

  bindButtons() {
    document.querySelectorAll('[data-checkout]').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleCheckout(e));
    });
  }

  async handleCheckout(e) {
    e.preventDefault();
    const btn = e.target;
    const amount = btn.dataset.amount;
    const gateway = btn.dataset.gateway || 'stripe';
    const plan = btn.dataset.plan || 'premium';

    if (!amount) return alert('Amount required');

    try {
      // Show loading
      btn.disabled = true;
      btn.textContent = 'Processing...';

      const response = await fetch(`${this.apiUrl}/${gateway}/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'usd', plan, userId: 'user123' })
      });

      const data = await response.json();

      if (data.success) {
        switch(gateway) {
          case 'stripe':
            await this.stripeCheckout(data.data.clientSecret);
            break;
          case 'paypal':
            this.paypalCheckout(data.data.approvalUrl);
            break;
          case 'mpesa':
            this.mpesaSTK(data.data.checkoutRequestId);
            break;
        }
      } else {
        alert(data.error || 'Payment failed');
      }
    } catch (error) {
      alert('Checkout error: ' + error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Pay Now';
    }
  }

  async stripeCheckout(clientSecret) {
    const stripe = window.Stripe(this.stripeKey);
    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: stripe.elements().create('card'),
        billing_details: { name: 'Customer' }
      }
    });

    if (error) {
      alert('Payment failed: ' + error.message);
    } else {
      alert('Payment successful!');
      window.location.reload();
    }
  }

  paypalCheckout(approvalUrl) {
    window.location.href = approvalUrl;
  }

  mpesaSTK(checkoutId) {
    // MPESA STK callback handled by webhook
    alert('MPESA STK sent to phone. Check your SMS.');
  }

  detectWalletSupport() {
    if ('ApplePaySession' in window) {
      document.querySelectorAll('[data-gateway="applepay"]').forEach(btn => btn.style.display = 'block');
    }
    if (window.google && window.google.payments) {
      document.querySelectorAll('[data-gateway="googlepay"]').forEach(btn => btn.style.display = 'block');
    }
  }
}

// Global instance
window.frictionlessCheckout = new FrictionlessCheckout({
  apiUrl: '/api/payments',
  stripeKey: window.STRIPE_PUBLISHABLE_KEY, // Frontend safe
  paypalClientId: window.PAYPAL_CLIENT_ID // Frontend safe
});
