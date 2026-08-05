/**
 * M-Pesa Pochi la Biashara Client-Side Integration
 * Handles UI and payment initiation from frontend
 */

class PochiPaymentHandler {
  constructor(options = {}) {
    this.apiBase = options.apiBase || '/api/pochi';
    this.callbacks = options.callbacks || {};
    this.pollInterval = options.pollInterval || 3000; // Poll every 3 seconds
    this.maxPolls = options.maxPolls || 20; // Max 60 seconds
  }

  /**
   * Initiate payment via STK Push
   */
  async initiateStkPush(phoneNumber, amount, accountRef = 'Payment') {
    try {
      // Validate inputs
      if (!phoneNumber) throw new Error('Phone number required');
      if (!amount || amount <= 0) throw new Error('Valid amount required');

      // Show loading state
      this.showLoading('Initiating payment prompt...');

      const response = await fetch(`${this.apiBase}/stk-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: this.formatPhone(phoneNumber),
          amount: parseInt(amount),
          accountReference: accountRef,
          description: `SmartInvest Payment - ${accountRef}`
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'STK Push failed');
      }

      // STK sent successfully
      this.showSuccess('Payment prompt sent! Enter your M-Pesa PIN on your phone.');

      // Store checkout ID for polling
      const checkoutId = data.checkoutRequestId;

      // Poll for payment status
      await this.pollPaymentStatus(checkoutId, {
        phoneNumber,
        amount,
        accountRef
      });

      return {
        success: true,
        checkoutId: checkoutId,
        message: 'Payment initiated'
      };
    } catch (error) {
      this.showError(error.message);
      throw error;
    }
  }

  /**
   * Poll for STK payment status
   */
  async pollPaymentStatus(checkoutId, context = {}) {
    let pollCount = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${this.apiBase}/query-stk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutRequestId: checkoutId })
        });

        const data = await response.json();

        if (data.resultCode === 0 || data.resultCode === '0') {
          // Payment successful
          this.showSuccess('✓ Payment successful!');
          if (this.callbacks.onSuccess) {
            this.callbacks.onSuccess({
              checkoutId,
              amount: context.amount,
              phone: context.phoneNumber,
              ...data
            });
          }
          return true;
        } else if (data.resultCode === 1032 || data.resultCode === '1032') {
          // Request timeout (user didn't enter PIN in time)
          this.showInfo('Payment request timed out. Please try again.');
          return false;
        } else if (data.resultCode !== 0) {
          // Other error
          this.showError(`Payment failed: ${data.resultDesc}`);
          if (this.callbacks.onFailure) {
            this.callbacks.onFailure({ ...data, context });
          }
          return false;
        }

        // Still pending, poll again
        pollCount++;
        if (pollCount < this.maxPolls) {
          setTimeout(poll, this.pollInterval);
        } else {
          this.showInfo('Payment check timeout. Please verify in your account.');
        }
      } catch (error) {
        console.error('Poll error:', error);
        if (pollCount < this.maxPolls) {
          setTimeout(poll, this.pollInterval);
        }
      }
    };

    return poll();
  }

  /**
   * Format phone number to M-Pesa standard (254...)
   */
  formatPhone(phone) {
    let clean = String(phone).replace(/[\s\-()]/g, '');

    if (clean.startsWith('+254')) {
      clean = '254' + clean.slice(4);
    } else if (clean.startsWith('0254')) {
      clean = '254' + clean.slice(4);
    } else if (clean.startsWith('254')) {
      // Already correct
    } else if (clean.startsWith('0')) {
      clean = '254' + clean.slice(1);
    } else {
      clean = '254' + clean;
    }

    return clean;
  }

  /**
   * Show loading message
   */
  showLoading(message) {
    this.showMessage(message, 'info');
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * Show info message
   */
  showInfo(message) {
    this.showMessage(message, 'info');
  }

  /**
   * Generic message display
   */
  showMessage(message, type = 'info') {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };

    const bgColors = {
      success: '#d1fae5',
      error: '#fee2e2',
      info: '#dbeafe',
      warning: '#fef3c7'
    };

    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      inset-block-end: 20px;
      inset-inline-end: 20px;
      padding: 16px 20px;
      background: ${bgColors[type]};
      color: ${colors[type]};
      border: 2px solid ${colors[type]};
      border-radius: 8px;
      max-inline-size: 400px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
    `;

    div.textContent = message;
    document.body.appendChild(div);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      div.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => div.remove(), 300);
    }, 5000);
  }

  /**
   * Get account info
   */
  async getAccountInfo() {
    try {
      const response = await fetch(`${this.apiBase}/info`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.apiBase}/test`);
      const data = await response.json();

      if (data.success) {
        this.showSuccess('✓ M-Pesa Pochi connection successful!');
        console.log('Pochi Config:', data.config);
      } else {
        this.showError('✗ Connection failed: ' + data.error);
      }

      return data;
    } catch (error) {
      this.showError('Connection test failed: ' + error.message);
      throw error;
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PochiPaymentHandler;
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
