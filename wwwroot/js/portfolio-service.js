/**
 * Portfolio Service for SmartInvestsi
 * Handles portfolio management and analytics
 */

class PortfolioService {
  constructor() {
    this.baseUrl = '/.netlify/functions';
  }

  /**
   * Get user's portfolios
   */
  async getPortfolios() {
    try {
      const response = await fetch(`${this.baseUrl}/portfolio-api`, {
        method: 'GET',
        headers: window.AuthService ? window.AuthService.getAuthHeaders() : {}
      });

      const data = await response.json();

      if (data.success) {
        return data.portfolios || [];
      } else {
        console.error('Failed to get portfolios:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Portfolio fetch error:', error);
      return [];
    }
  }

  /**
   * Create new portfolio
   */
  async createPortfolio(name) {
    try {
      const response = await fetch(`${this.baseUrl}/portfolio-api`, {
        method: 'POST',
        headers: window.AuthService ? window.AuthService.getAuthHeaders() : {},
        body: JSON.stringify({ action: 'create', name })
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification(`Portfolio "${name}" created successfully!`, 'success');
        return data.portfolio;
      } else {
        this.showNotification(data.error || 'Failed to create portfolio', 'error');
        return null;
      }
    } catch (error) {
      console.error('Portfolio creation error:', error);
      this.showNotification('Network error. Please try again.', 'error');
      return null;
    }
  }

  /**
   * Update portfolio holdings
   */
  async updateHoldings(portfolioId, holdings) {
    try {
      const response = await fetch(`${this.baseUrl}/portfolio-api/${portfolioId}`, {
        method: 'POST',
        headers: window.AuthService ? window.AuthService.getAuthHeaders() : {},
        body: JSON.stringify({ action: 'update-holdings', holdings })
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification('Portfolio updated successfully!', 'success');
        return data.portfolio;
      } else {
        this.showNotification(data.error || 'Failed to update portfolio', 'error');
        return null;
      }
    } catch (error) {
      console.error('Portfolio update error:', error);
      this.showNotification('Network error. Please try again.', 'error');
      return null;
    }
  }

  /**
   * Get portfolio analytics
   */
  async getPortfolioAnalytics(portfolioId) {
    try {
      const response = await fetch(`${this.baseUrl}/portfolio-api/analytics/${portfolioId}`, {
        method: 'GET',
        headers: window.AuthService ? window.AuthService.getAuthHeaders() : {}
      });

      const data = await response.json();

      if (data.success) {
        return data.analytics;
      } else {
        console.error('Failed to get analytics:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      return null;
    }
  }

  /**
   * Calculate portfolio value
   */
  calculatePortfolioValue(holdings) {
    return holdings.reduce((total, holding) => total + holding.value, 0);
  }

  /**
   * Calculate total gain/loss
   */
  calculateTotalGainLoss(holdings) {
    const totalInvested = holdings.reduce((sum, h) => sum + (h.averagePrice * h.quantity), 0);
    const totalValue = this.calculatePortfolioValue(holdings);
    return {
      totalInvested,
      totalValue,
      gainLoss: totalValue - totalInvested,
      gainLossPercent: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0
    };
  }

  /**
   * Get top performers
   */
  getTopPerformers(holdings, limit = 5) {
    return holdings
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, limit);
  }

  /**
   * Get worst performers
   */
  getWorstPerformers(holdings, limit = 5) {
    return holdings
      .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
      .slice(0, limit);
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(value) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Private method
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-black' :
      'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Create global instance
const portfolioService = new PortfolioService();

// Make it globally available
window.PortfolioService = portfolioService;