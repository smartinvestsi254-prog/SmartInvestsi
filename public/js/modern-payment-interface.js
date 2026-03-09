/**
 * Modern Payment Interface with Transaction Recording
 * Handles payment UI, processing, and transaction history
 * Integrates with SmartInvest corporate theme
 */

class ModernPaymentInterface {
  constructor(config = {}) {
    this.config = {
      apiBase: config.apiBase || '/api',
      theme: config.theme || 'modern',
      recordPayments: config.recordPayments !== false,
      currencies: config.currencies || ['KES', 'USD', 'GHS', 'NGN', 'ZAR'],
      methods: config.methods || ['mpesa', 'paystack', 'stripe', 'paypal', 'flutterwave'],
      ...config
    };
    this.currentTransaction = null;
    this.transactionHistory = [];
    this.init();
  }

  init() {
    this.createPaymentModal();
    this.setupEventListeners();
    this.loadTransactionHistory();
  }

  /**
   * Create modern payment modal UI
   */
  createPaymentModal() {
    const modal = document.createElement('div');
    modal.id = 'modernPaymentModal';
    modal.className = 'modern-payment-modal';
    modal.innerHTML = `
      <div class="payment-modal-overlay"></div>
      <div class="payment-modal-content">
        <!-- Close Button -->
        <button class="payment-close-btn" aria-label="Close payment modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Header -->
        <div class="payment-header">
          <h2 class="payment-title">💳 Make a Payment</h2>
          <p class="payment-subtitle">Secure, fast payment processing</p>
        </div>

        <!-- Payment Progress Steps -->
        <div class="payment-steps">
          <div class="payment-step active" data-step="1">
            <div class="step-number">1</div>
            <div class="step-label">Details</div>
          </div>
          <div class="payment-step-connector"></div>
          <div class="payment-step" data-step="2">
            <div class="step-number">2</div>
            <div class="step-label">Method</div>
          </div>
          <div class="payment-step-connector"></div>
          <div class="payment-step" data-step="3">
            <div class="step-number">3</div>
            <div class="step-label">Confirm</div>
          </div>
        </div>

        <!-- Step 1: Payment Details -->
        <form class="payment-form" id="paymentDetailsForm">
          <div class="form-group">
            <label for="paymentAmount" class="form-label">Amount</label>
            <div class="amount-input-wrapper">
              <select id="paymentCurrency" class="currency-select">
                ${this.config.currencies.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
              <input 
                type="number" 
                id="paymentAmount" 
                placeholder="0.00" 
                min="0.01" 
                step="0.01"
                required
                class="form-control"
              >
            </div>
            <small class="form-text">Enter the amount you want to pay</small>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="paymentPhone" class="form-label">Phone Number</label>
              <input 
                type="tel" 
                id="paymentPhone" 
                placeholder="+254..." 
                required
                class="form-control"
              >
              <small class="form-text">Your mobile number for payment</small>
            </div>

            <div class="form-group">
              <label for="paymentEmail" class="form-label">Email</label>
              <input 
                type="email" 
                id="paymentEmail" 
                placeholder="you@example.com" 
                required
                class="form-control"
              >
              <small class="form-text">Receipt will be sent here</small>
            </div>
          </div>

          <div class="form-group">
            <label for="paymentDescription" class="form-label">Description</label>
            <input 
              type="text" 
              id="paymentDescription" 
              placeholder="What are you paying for?" 
              required
              class="form-control"
            >
            <small class="form-text">Visible in transaction history</small>
          </div>

          <button type="button" class="btn-next-step">Continue to Payment Method →</button>
        </form>

        <!-- Step 2: Payment Method Selection -->
        <div class="payment-methods-container" style="display: none;">
          <div class="methods-grid">
            ${this.createPaymentMethodButtons()}
          </div>
        </div>

        <!-- Step 3: Confirmation -->
        <div class="payment-confirmation" style="display: none;">
          <div class="confirmation-summary">
            <h3>Payment Summary</h3>
            <div class="summary-row">
              <span>Amount:</span>
              <strong id="confirmAmount">-</strong>
            </div>
            <div class="summary-row">
              <span>Method:</span>
              <strong id="confirmMethod">-</strong>
            </div>
            <div class="summary-row">
              <span>Email:</span>
              <strong id="confirmEmail">-</strong>
            </div>
            <div class="summary-row">
              <span>Description:</span>
              <strong id="confirmDescription">-</strong>
            </div>
          </div>

          <div class="confirmation-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1z"></path>
            </svg>
            <span>Your payment information is encrypted and secure</span>
          </div>

          <div class="confirmation-actions">
            <button type="button" class="btn-back-step">← Back</button>
            <button type="button" class="btn-confirm-payment">Confirm Payment</button>
          </div>
        </div>

        <!-- Processing State -->
        <div class="payment-processing" style="display: none;">
          <div class="loading-spinner"></div>
          <p class="processing-text">Processing your payment...</p>
          <p class="processing-subtext">Please do not close this window</p>
        </div>

        <!-- Success/Error States -->
        <div class="payment-result" style="display: none;">
          <div class="result-content"></div>
        </div>
      </div>
    </modal>`;

    document.body.appendChild(modal);
    this.paymentModal = modal;
  }

  /**
   * Create payment method buttons
   */
  createPaymentMethodButtons() {
    const methods = {
      mpesa: { name: 'M-Pesa', icon: '📱', color: '#33CC33' },
      paystack: { name: 'Paystack', icon: '💳', color: '#0066FF' },
      stripe: { name: 'Stripe', icon: '💰', color: '#635BFF' },
      paypal: { name: 'PayPal', icon: '🅿️', color: '#003087' },
      flutterwave: { name: 'Flutterwave', icon: '🌊', color: '#F00080' }
    };

    return this.config.methods
      .map(method => {
        const m = methods[method];
        return `
          <button 
            type="button" 
            class="payment-method-btn" 
            data-method="${method}"
            style="border-color: ${m.color}"
          >
            <div class="method-icon">${m.icon}</div>
            <div class="method-name">${m.name}</div>
            <div class="method-select-indicator"></div>
          </button>
        `;
      })
      .join('');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const modal = this.paymentModal;

    // Close button
    modal.querySelector('.payment-close-btn').addEventListener('click', () => {
      this.closePaymentModal();
    });

    // Overlay click
    modal.querySelector('.payment-modal-overlay').addEventListener('click', () => {
      this.closePaymentModal();
    });

    // Next step button
    modal.querySelector('.btn-next-step').addEventListener('click', (e) => {
      e.preventDefault();
      this.validateDetailsAndContinue();
    });

    // Payment method selection
    modal.querySelectorAll('.payment-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectPaymentMethod(btn);
      });
    });

    // Back button
    modal.querySelector('.btn-back-step')?.addEventListener('click', () => {
      this.goToStep(2);
    });

    // Confirm payment
    modal.querySelector('.btn-confirm-payment')?.addEventListener('click', () => {
      this.processPayment();
    });
  }

  /**
   * Show payment modal with transition
   */
  showPaymentModal() {
    this.paymentModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close payment modal
   */
  closePaymentModal() {
    this.paymentModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    this.resetPaymentForm();
  }

  /**
   * Validate details and move to method selection
   */
  validateDetailsAndContinue() {
    const form = this.paymentModal.querySelector('#paymentDetailsForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    this.currentTransaction = {
      amount: parseFloat(this.paymentModal.querySelector('#paymentAmount').value),
      currency: this.paymentModal.querySelector('#paymentCurrency').value,
      phone: this.paymentModal.querySelector('#paymentPhone').value,
      email: this.paymentModal.querySelector('#paymentEmail').value,
      description: this.paymentModal.querySelector('#paymentDescription').value,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    this.goToStep(2);
  }

  /**
   * Select payment method
   */
  selectPaymentMethod(btn) {
    this.paymentModal.querySelectorAll('.payment-method-btn').forEach(b => {
      b.classList.remove('selected');
    });
    btn.classList.add('selected');

    this.currentTransaction.method = btn.dataset.method;
    this.currentTransaction.methodName = btn.querySelector('.method-name').textContent;

    // Show confirmation
    this.goToStep(3);
  }

  /**
   * Go to specific step
   */
  goToStep(step) {
    const modal = this.paymentModal;

    // Hide all content
    modal.querySelector('#paymentDetailsForm').style.display = 'none';
    modal.querySelector('.payment-methods-container').style.display = 'none';
    modal.querySelector('.payment-confirmation').style.display = 'none';

    // Show current step
    if (step === 1) {
      modal.querySelector('#paymentDetailsForm').style.display = 'block';
    } else if (step === 2) {
      modal.querySelector('.payment-methods-container').style.display = 'block';
    } else if (step === 3) {
      this.updateConfirmationSummary();
      modal.querySelector('.payment-confirmation').style.display = 'block';
    }

    // Update step indicators
    modal.querySelectorAll('.payment-step').forEach(s => {
      s.classList.remove('active', 'completed');
      const stepNum = parseInt(s.dataset.step);
      if (stepNum < step) s.classList.add('completed');
      if (stepNum === step) s.classList.add('active');
    });
  }

  /**
   * Update confirmation summary
   */
  updateConfirmationSummary() {
    if (!this.currentTransaction) return;

    const modal = this.paymentModal;
    modal.querySelector('#confirmAmount').textContent = 
      `${this.currentTransaction.currency} ${this.currentTransaction.amount.toFixed(2)}`;
    modal.querySelector('#confirmMethod').textContent = this.currentTransaction.methodName;
    modal.querySelector('#confirmEmail').textContent = this.currentTransaction.email;
    modal.querySelector('#confirmDescription').textContent = this.currentTransaction.description;
  }

  /**
   * Process payment
   */
  async processPayment() {
    if (!this.currentTransaction) return;

    this.showProcessingState();

    try {
      const response = await fetch(`${this.config.apiBase}/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...this.currentTransaction,
          reference: this.generateReference()
        })
      });

      const result = await response.json();

      if (result.success) {
        this.currentTransaction.id = result.transactionId;
        this.currentTransaction.reference = result.reference;
        this.currentTransaction.status = 'completed';
        
        // Record payment in history
        if (this.config.recordPayments) {
          await this.recordTransaction(this.currentTransaction);
        }

        this.showPaymentSuccess(result);
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }
    } catch (error) {
      this.showPaymentError(error.message);
    }
  }

  /**
   * Record transaction in history
   */
  async recordTransaction(transaction) {
    try {
      await fetch(`${this.config.apiBase}/payments/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });

      // Also store locally
      this.transactionHistory.unshift(transaction);
      localStorage.setItem('smartinvest_transactions', JSON.stringify(this.transactionHistory));
    } catch (error) {
      console.error('Failed to record transaction:', error);
    }
  }

  /**
   * Show processing state
   */
  showProcessingState() {
    const modal = this.paymentModal;
    modal.querySelector('.payment-confirmation').style.display = 'none';
    modal.querySelector('.payment-processing').style.display = 'flex';
  }

  /**
   * Show payment success
   */
  showPaymentSuccess(result) {
    const modal = this.paymentModal;
    const resultContainer = modal.querySelector('.payment-result');
    
    resultContainer.innerHTML = `
      <div class="result-content success">
        <div class="result-icon">✓</div>
        <h3>Payment Successful!</h3>
        <p>Your payment has been processed successfully.</p>
        <div class="result-details">
          <div class="detail-row">
            <span>Transaction ID:</span>
            <code>${result.transactionId}</code>
          </div>
          <div class="detail-row">
            <span>Amount:</span>
            <strong>${this.currentTransaction.currency} ${this.currentTransaction.amount.toFixed(2)}</strong>
          </div>
          <div class="detail-row">
            <span>Reference:</span>
            <code>${result.reference}</code>
          </div>
        </div>
        <p class="result-note">A receipt has been sent to ${this.currentTransaction.email}</p>
        <button class="btn-close-payment">Close</button>
      </div>
    `;

    modal.querySelector('.payment-processing').style.display = 'none';
    resultContainer.style.display = 'block';

    resultContainer.querySelector('.btn-close-payment').addEventListener('click', () => {
      this.closePaymentModal();
    });
  }

  /**
   * Show payment error
   */
  showPaymentError(message) {
    const modal = this.paymentModal;
    const resultContainer = modal.querySelector('.payment-result');
    
    resultContainer.innerHTML = `
      <div class="result-content error">
        <div class="result-icon">✕</div>
        <h3>Payment Failed</h3>
        <p>${message}</p>
        <button class="btn-retry-payment">Try Again</button>
        <button class="btn-close-payment">Close</button>
      </div>
    `;

    modal.querySelector('.payment-processing').style.display = 'none';
    resultContainer.style.display = 'block';

    resultContainer.querySelector('.btn-retry-payment')?.addEventListener('click', () => {
      this.goToStep(2);
    });

    resultContainer.querySelector('.btn-close-payment').addEventListener('click', () => {
      this.closePaymentModal();
    });
  }

  /**
   * Load transaction history
   */
  loadTransactionHistory() {
    const stored = localStorage.getItem('smartinvest_transactions');
    if (stored) {
      try {
        this.transactionHistory = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load transaction history:', error);
      }
    }
  }

  /**
   * Get transaction history
   */
  getTransactionHistory() {
    return this.transactionHistory;
  }

  /**
   * Generate unique payment reference
   */
  generateReference() {
    return `SMI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Reset payment form
   */
  resetPaymentForm() {
    const modal = this.paymentModal;
    modal.querySelector('#paymentDetailsForm').reset();
    modal.querySelector('.payment-result').innerHTML = '';
    modal.querySelector('.payment-result').style.display = 'none';
    modal.querySelector('.payment-processing').style.display = 'none';
    this.goToStep(1);
    this.currentTransaction = null;
  }
}

// Initialize payment interface globally
window.PaymentInterface = new ModernPaymentInterface({
  apiBase: '/api',
  recordPayments: true
});

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModernPaymentInterface;
}
