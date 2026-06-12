/**
 * Banking Dashboard Error Handler (TypeScript)
 * Comprehensive error handling for banking operations
 */

interface BankingError {
  code: string;
  message: string;
  details?: any;
}

interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

class BankingDashboardErrorHandler {
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  };

  private errorMap: Map<string, string> = new Map([
    ['INVALID_ACCOUNT', 'Invalid account selected'],
    ['INSUFFICIENT_FUNDS', 'Insufficient funds in account'],
    ['TRANSFER_FAILED', 'Transfer failed. Please try again.'],
    ['VERIFICATION_REQUIRED', 'Verification is required'],
    ['RATE_LIMIT', 'Too many requests. Please wait.'],
    ['NETWORK_ERROR', 'Network error. Please check your connection.'],
    ['TIMEOUT', 'Request timed out. Please try again.'],
    ['UNAUTHORIZED', 'Unauthorized access'],
    ['SERVER_ERROR', 'Server error. Please try again later.']
  ]);

  /**
   * Handle banking operation error
   */
  handleBankingError(error: any, context: string): void {
    const bankingError: BankingError = this.parseBankingError(error);
    console.error(`[Banking ${context}] ${bankingError.code}: ${bankingError.message}`, bankingError.details);
    this.showError(bankingError.message);
  }

  /**
   * Parse banking error
   */
  private parseBankingError(error: any): BankingError {
    if (error?.code) {
      return {
        code: error.code,
        message: this.errorMap.get(error.code) || error.message || 'Unknown error',
        details: error.details
      };
    }

    if (error?.response?.status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: error.response.data
      };
    }

    if (error?.response?.status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: this.errorMap.get('UNAUTHORIZED') || 'Unauthorized',
        details: error.response.data
      };
    }

    if (error?.response?.status === 429) {
      return {
        code: 'RATE_LIMIT',
        message: this.errorMap.get('RATE_LIMIT') || 'Rate limited',
        details: error.response.data
      };
    }

    if (error?.response?.status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: this.errorMap.get('SERVER_ERROR') || 'Server error',
        details: error.response.data
      };
    }

    if (error?.message?.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: this.errorMap.get('TIMEOUT') || 'Request timeout',
        details: error
      };
    }

    return {
      code: 'UNKNOWN',
      message: error?.message || 'An unknown error occurred',
      details: error
    };
  }

  /**
   * Retry banking operation
   */
  async retryBankingOperation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.delayMs;

    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.retryConfig.maxAttempts - 1) {
          console.warn(`Retry attempt ${attempt + 1} for ${context}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(
            delay * this.retryConfig.backoffMultiplier,
            this.retryConfig.maxDelayMs
          );
        }
      }
    }

    if (lastError) {
      this.handleBankingError(lastError, context);
    }

    throw lastError;
  }

  /**
   * Validate account data
   */
  validateAccountData(account: any): void {
    if (!account || typeof account !== 'object') {
      throw new Error('Invalid account data');
    }

    if (!account.accountId) {
      throw new Error('Missing account ID');
    }

    if (!account.currency) {
      throw new Error('Missing currency');
    }

    if (typeof account.currentBalance !== 'number') {
      throw new Error('Invalid balance');
    }
  }

  /**
   * Format currency safely
   */
  formatCurrency(amount: number, currency: string): string {
    try {
      if (typeof amount !== 'number' || isNaN(amount)) {
        return `${currency} 0.00`;
      }

      return `${currency} ${amount.toFixed(2)}`;
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `${currency} 0.00`;
    }
  }

  /**
   * Safe HTML sanitization
   */
  sanitizeHtml(text: string): string {
    try {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    } catch (error) {
      console.error('HTML sanitization error:', error);
      return String(text).replace(/[<>]/g, '');
    }
  }

  /**
   * Show error alert
   */
  private showError(message: string): void {
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');

    if (errorAlert && errorMessage) {
      errorMessage.textContent = this.sanitizeHtml(message);
      errorAlert.classList.add('show');

      setTimeout(() => {
        errorAlert.classList.remove('show');
      }, 5000);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message: string): void {
    const successAlert = document.getElementById('successAlert');
    const successMessage = document.getElementById('successMessage');

    if (successAlert && successMessage) {
      successMessage.textContent = this.sanitizeHtml(message);
      successAlert.classList.add('show');

      setTimeout(() => {
        successAlert.classList.remove('show');
      }, 5000);
    }
  }

  /**
   * Set loading state
   */
  setLoading(show: boolean): void {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      if (show) {
        spinner.classList.add('show');
      } else {
        spinner.classList.remove('show');
      }
    }
  }

  /**
   * Handle unhandled promise rejection
   */
  handleUnhandledRejection(error: PromiseRejectionEvent): void {
    console.error('Unhandled promise rejection:', error.reason);
    this.handleBankingError(error.reason, 'Unhandled Rejection');
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event);
    });

    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleBankingError(event.error, 'Global Error');
    });
  }
}

// Initialize error handler
const bankingErrorHandler = new BankingDashboardErrorHandler();
bankingErrorHandler.setupGlobalHandlers();

// Export for use in other modules
export default BankingDashboardErrorHandler;
