/**
 * Enhanced Dashboard Error Handler
 * Provides centralized error handling for the enhanced dashboard
 * with retry logic, user feedback, and security measures
 */

class EnhancedDashboardErrorHandler {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000; // milliseconds
    this.maxRetryDelay = 10000; // milliseconds
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.handleError('Global Error', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('Unhandled Promise Rejection', event.reason);
    });
  }

  /**
   * Fetch with timeout and retry logic
   */
  async fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Retry fetch with exponential backoff
   */
  async retryFetch(url, options = {}, timeout = 5000) {
    let lastError;
    let delay = this.retryDelay;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await this.fetchWithTimeout(url, options, timeout);
      } catch (error) {
        lastError = error;
        if (attempt < this.retryAttempts - 1) {
          console.warn(`Retry attempt ${attempt + 1} after ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, this.maxRetryDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Handle error with user feedback
   */
  handleError(context, error, userMessage = null) {
    const message = userMessage || this.getErrorMessage(error);
    console.error(`[${context}] ${message}`, error);
    this.showError(message);
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (!error) return 'An unknown error occurred';
    
    if (error.name === 'AbortError') {
      return 'Request timed out. Please try again.';
    }
    
    if (error instanceof TypeError) {
      return 'Network error. Please check your connection.';
    }
    
    if (error.message) {
      return error.message;
    }
    
    return String(error);
  }

  /**
   * Show error to user
   */
  showError(message) {
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
  showSuccess(message) {
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
  setLoading(show = true) {
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
   * Sanitize HTML to prevent XSS
   */
  sanitizeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Validate API response
   */
  validateResponse(data) {
    if (!data) {
      throw new Error('Empty response received');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  }

  /**
   * Safe JSON parse
   */
  safeJsonParse(json, fallback = null) {
    try {
      return JSON.parse(json);
    } catch (error) {
      console.error('JSON parse error:', error);
      return fallback;
    }
  }
}

// Initialize error handler
const dashboardErrorHandler = new EnhancedDashboardErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedDashboardErrorHandler;
}
