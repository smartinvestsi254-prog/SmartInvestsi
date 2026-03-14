/**
 * Market Data Service for SmartInvestsi
 * Handles real-time market data and quotes
 */

class MarketDataService {
  constructor() {
    this.baseUrl = '/.netlify/functions';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get quote for a symbol
   */
  async getQuote(symbol) {
    try {
      const cacheKey = `quote_${symbol}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await fetch(`${this.baseUrl}/market-data-api/quote/${symbol}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        this.setCached(cacheKey, data.data);
        return data.data;
      } else {
        console.error('Failed to get quote:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Quote fetch error:', error);
      return null;
    }
  }

  /**
   * Get quotes for multiple symbols
   */
  async getQuotes(symbols) {
    try {
      const cacheKey = `quotes_${symbols.join(',')}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await fetch(`${this.baseUrl}/market-data-api/batch?symbols=${symbols.join(',')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        this.setCached(cacheKey, data.data);
        return data.data;
      } else {
        console.error('Failed to get quotes:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Quotes fetch error:', error);
      return [];
    }
  }

  /**
   * Get market overview
   */
  async getMarketOverview() {
    try {
      const cacheKey = 'market_overview';
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await fetch(`${this.baseUrl}/market-data-api/overview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        this.setCached(cacheKey, data.data);
        return data.data;
      } else {
        console.error('Failed to get market overview:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Market overview fetch error:', error);
      return [];
    }
  }

  /**
   * Get market indices
   */
  async getMarketIndices() {
    try {
      const cacheKey = 'market_indices';
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await fetch(`${this.baseUrl}/market-data-api/indices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        this.setCached(cacheKey, data.data);
        return data.data;
      } else {
        console.error('Failed to get market indices:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Market indices fetch error:', error);
      return [];
    }
  }

  /**
   * Get historical data
   */
  async getHistoricalData(symbol, period = '1M') {
    try {
      const cacheKey = `history_${symbol}_${period}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await fetch(`${this.baseUrl}/market-data-api/history/${symbol}/${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        this.setCached(cacheKey, data.data);
        return data.data;
      } else {
        console.error('Failed to get historical data:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Historical data fetch error:', error);
      return null;
    }
  }

  /**
   * Search for symbols
   */
  async searchSymbols(query) {
    try {
      const response = await fetch(`${this.baseUrl}/market-data-api/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        console.error('Failed to search symbols:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Symbol search error:', error);
      return [];
    }
  }

  /**
   * Format price
   */
  formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  }

  /**
   * Format change
   */
  formatChange(change, changePercent) {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  }

  /**
   * Get change color class
   */
  getChangeColorClass(change) {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  }

  /**
   * Format volume
   */
  formatVolume(volume) {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  }

  /**
   * Format market cap
   */
  formatMarketCap(marketCap) {
    if (!marketCap) return 'N/A';

    if (marketCap >= 1000000000000) {
      return `$${(marketCap / 1000000000000).toFixed(2)}T`;
    } else if (marketCap >= 1000000000) {
      return `$${(marketCap / 1000000000).toFixed(2)}B`;
    } else if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(2)}M`;
    }

    return `$${marketCap.toLocaleString()}`;
  }

  // Cache management
  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  clearCache() {
    this.cache.clear();
  }
}

// Create global instance
const marketDataService = new MarketDataService();

// Make it globally available
window.MarketDataService = marketDataService;