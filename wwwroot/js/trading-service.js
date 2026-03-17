/**
 * Trading Service for SmartInvest
 * Handles trading operations and order management
 */

class TradingService {
  constructor() {
    this.baseUrl = '/.netlify/functions';
    this.orders = [];
    this.positions = [];
    this.listeners = new Set();
    this.updateInterval = null;
    this.updateDelay = 30000; // 30 seconds
  }

  /**
   * Initialize trading service
   */
  init() {
    this.loadFromStorage();
    this.startUpdates();
  }

  /**
   * Start periodic updates
   */
  startUpdates() {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.updatePositions();
      this.checkOrderStatus();
    }, this.updateDelay);
  }

  /**
   * Stop periodic updates
   */
  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Place market order
   */
  async placeMarketOrder(symbol, side, quantity, orderType = 'market') {
    try {
      this.notifyListeners('orderPlacing', { symbol, side, quantity });

      const response = await fetch(`${this.baseUrl}/trading-api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          symbol,
          side, // 'buy' or 'sell'
          quantity,
          type: orderType,
          timeInForce: 'GTC' // Good Till Cancelled
        })
      });

      const data = await response.json();

      if (data.success) {
        const order = {
          id: data.data.id,
          symbol,
          side,
          quantity,
          type: orderType,
          status: 'pending',
          timestamp: new Date().toISOString(),
          ...data.data
        };

        this.orders.unshift(order);
        this.saveToStorage();
        this.notifyListeners('orderPlaced', order);

        return order;
      } else {
        this.notifyListeners('orderError', { error: data.error, symbol, side, quantity });
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Place order error:', error);
      this.notifyListeners('orderError', { error: error.message, symbol, side, quantity });
      throw error;
    }
  }

  /**
   * Place limit order
   */
  async placeLimitOrder(symbol, side, quantity, price) {
    return this.placeMarketOrder(symbol, side, quantity, 'limit', { price });
  }

  /**
   * Place stop order
   */
  async placeStopOrder(symbol, side, quantity, stopPrice) {
    return this.placeMarketOrder(symbol, side, quantity, 'stop', { stopPrice });
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId) {
    try {
      const response = await fetch(`${this.baseUrl}/trading-api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
          order.status = 'cancelled';
          this.saveToStorage();
          this.notifyListeners('orderCancelled', order);
        }
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  /**
   * Get orders
   */
  async getOrders(status = null, limit = 50) {
    try {
      let url = `${this.baseUrl}/trading-api/orders?limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.orders = data.data;
        this.saveToStorage();
        return this.orders;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Get orders error:', error);
      return this.orders; // Return cached orders on error
    }
  }

  /**
   * Get positions
   */
  async getPositions() {
    try {
      const response = await fetch(`${this.baseUrl}/trading-api/positions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.positions = data.data;
        this.saveToStorage();
        this.notifyListeners('positionsUpdated', this.positions);
        return this.positions;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Get positions error:', error);
      return this.positions; // Return cached positions on error
    }
  }

  /**
   * Update positions
   */
  async updatePositions() {
    try {
      await this.getPositions();
    } catch (error) {
      // Silently fail for background updates
    }
  }

  /**
   * Check order status
   */
  async checkOrderStatus() {
    try {
      const pendingOrders = this.orders.filter(o => o.status === 'pending');
      if (pendingOrders.length === 0) return;

      const response = await fetch(`${this.baseUrl}/trading-api/orders/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          orderIds: pendingOrders.map(o => o.id)
        })
      });

      const data = await response.json();

      if (data.success) {
        data.data.forEach(orderUpdate => {
          const order = this.orders.find(o => o.id === orderUpdate.id);
          if (order && order.status !== orderUpdate.status) {
            order.status = orderUpdate.status;
            this.notifyListeners('orderStatusChanged', order);
          }
        });

        this.saveToStorage();
      }
    } catch (error) {
      // Silently fail for background updates
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance() {
    try {
      const response = await fetch(`${this.baseUrl}/trading-api/account/balance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.notifyListeners('balanceUpdated', data.data);
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Get balance error:', error);
      throw error;
    }
  }

  /**
   * Get trading fees
   */
  async getTradingFees() {
    try {
      const response = await fetch(`${this.baseUrl}/trading-api/fees`, {
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
      console.error('Get fees error:', error);
      throw error;
    }
  }

  /**
   * Calculate order value
   */
  async calculateOrderValue(symbol, quantity, side) {
    try {
      const response = await fetch(`${this.baseUrl}/trading-api/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          symbol,
          quantity,
          side
        })
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Calculate order value error:', error);
      throw error;
    }
  }

  /**
   * Validate order parameters
   */
  validateOrder(symbol, side, quantity, price = null) {
    const errors = [];

    if (!symbol || typeof symbol !== 'string') {
      errors.push('Invalid symbol');
    }

    if (!['buy', 'sell'].includes(side)) {
      errors.push('Invalid side');
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.push('Invalid quantity');
    }

    if (price !== null) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.push('Invalid price');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format quantity
   */
  formatQuantity(quantity) {
    return parseFloat(quantity).toLocaleString();
  }

  /**
   * Get order status color
   */
  getOrderStatusColor(status) {
    const colors = {
      pending: 'text-yellow-600',
      filled: 'text-green-600',
      cancelled: 'text-red-600',
      rejected: 'text-red-600',
      partial: 'text-blue-600'
    };
    return colors[status] || 'text-gray-600';
  }

  /**
   * Get position P&L color
   */
  getPnLColor(pnl) {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
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
        console.error('Trading listener error:', error);
      }
    });
  }

  /**
   * Get auth token
   */
  getAuthToken() {
    return localStorage.getItem('auth_token') || '';
  }

  /**
   * Load data from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('trading_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.orders = data.orders || [];
        this.positions = data.positions || [];
      }
    } catch (error) {
      console.error('Failed to load trading data from storage:', error);
    }
  }

  /**
   * Save data to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('trading_data', JSON.stringify({
        orders: this.orders,
        positions: this.positions
      }));
    } catch (error) {
      console.error('Failed to save trading data to storage:', error);
    }
  }
}

// Create global instance
const tradingService = new TradingService();

// Make it globally available
window.TradingService = tradingService;