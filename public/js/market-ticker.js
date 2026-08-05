/**
 * Market Ticker - SmartInvestsi
 * Displays live market data for crypto, stocks, and commodities
 */

class MarketTicker {
  constructor(config = {}) {
    this.config = {
      updateInterval: config.updateInterval || 5000, // 5 seconds
      symbols: config.symbols || ['BTC', 'ETH', 'GOLD', 'OIL', 'SP500', 'EURUSD'],
      mockData: config.mockData !== false, // Use mock data for demo
      ...config
    };

    this.ticker = null;
    this.prices = {};
    this.init();
  }

  init() {
    this.createTickerElement();
    this.startTicker();
  }

  createTickerElement() {
    // Check if ticker already exists
    if (document.getElementById('market-ticker')) {
      return;
    }

    const ticker = document.createElement('div');
    ticker.id = 'market-ticker';
    ticker.className = 'market-ticker';

    const tickerContent = document.createElement('div');
    tickerContent.className = 'ticker-content';

    ticker.appendChild(tickerContent);
    this.addTickerStyles();

    // Insert at top of body
    if (document.body.firstChild) {
      document.body.insertBefore(ticker, document.body.firstChild);
    } else {
      document.body.appendChild(ticker);
    }

    this.ticker = tickerContent;
  }

  startTicker() {
    // Initial update
    this.updatePrices();

    // Set interval for updates
    this.intervalId = setInterval(() => {
      this.updatePrices();
    }, this.config.updateInterval);
  }

  stopTicker() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async updatePrices() {
    try {
      if (this.config.mockData) {
        this.prices = this.generateMockPrices();
      } else {
        this.prices = await this.fetchRealPrices();
      }

      this.renderTicker();
    } catch (error) {
      console.warn('Market ticker error:', error);
      // Fallback to mock data
      this.prices = this.generateMockPrices();
      this.renderTicker();
    }
  }

  generateMockPrices() {
    const baseData = {
      BTC: { price: 67500, change: 2.5, symbol: '₿' },
      ETH: { price: 3450, change: 1.8, symbol: 'Ξ' },
      GOLD: { price: 2025, change: 0.5, symbol: '🥇' },
      OIL: { price: 78.5, change: -1.2, symbol: '🛢️' },
      SP500: { price: 5825, change: 0.8, symbol: '📈' },
      EURUSD: { price: 1.0935, change: 0.3, symbol: '€' }
    };

    // Add slight random variation
    Object.keys(baseData).forEach(symbol => {
      const variation = (Math.random() - 0.5) * 0.1;
      baseData[symbol].change += variation;
    });

    return baseData;
  }

  async fetchRealPrices() {
    try {
      // This would call real API endpoints
      // For now, return mock data
      return this.generateMockPrices();
    } catch (error) {
      console.warn('Could not fetch real prices:', error);
      return this.generateMockPrices();
    }
  }

  renderTicker() {
    if (!this.ticker) return;

    let html = '';

    this.config.symbols.forEach((symbol) => {
      const data = this.prices[symbol];
      if (!data) return;

      const changeClass = data.change >= 0 ? 'positive' : 'negative';
      const changeSymbol = data.change >= 0 ? '▲' : '▼';
      const displayPrice =
        typeof data.price === 'number'
          ? data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : data.price;

      html += `
        <div class="ticker-item ${changeClass}">
          <span class="ticker-symbol">${data.symbol || symbol}</span>
          <span class="ticker-label">${symbol}</span>
          <span class="ticker-price">${displayPrice}</span>
          <span class="ticker-change">
            ${changeSymbol} ${Math.abs(data.change).toFixed(2)}%
          </span>
        </div>
      `;
    });

    this.ticker.innerHTML = html;
  }

  addTickerStyles() {
    if (document.getElementById('market-ticker-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'market-ticker-styles';
    style.textContent = `
      #market-ticker {
        background: linear-gradient(90deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.2));
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        padding: 0.75rem 1rem;
        overflow-x: auto;
        position: sticky;
        top: 0;
        z-index: 999;
      }

      body.light-mode #market-ticker {
        background: linear-gradient(90deg, rgba(240, 240, 240, 0.9), rgba(250, 250, 250, 0.9));
        border-bottom-color: #e0e0e0;
      }

      .ticker-content {
        display: flex;
        gap: 2rem;
        min-width: max-content;
        animation: scroll 30s linear infinite;
      }

      .ticker-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.75rem;
        border-radius: 0.25rem;
        background: rgba(212, 175, 55, 0.05);
        border-left: 3px solid transparent;
        transition: all 0.2s ease;
        white-space: nowrap;
        font-size: 0.9rem;
      }

      .ticker-item:hover {
        background: rgba(212, 175, 55, 0.1);
        border-left-color: #d4af37;
      }

      .ticker-item.positive {
        color: #22c55e;
      }

      .ticker-item.negative {
        color: #ef4444;
      }

      .ticker-symbol {
        font-size: 1.2rem;
        font-weight: 600;
      }

      .ticker-label {
        font-weight: 600;
        min-width: 40px;
        opacity: 0.7;
      }

      .ticker-price {
        font-weight: 700;
        min-width: 80px;
        text-align: right;
      }

      .ticker-change {
        font-weight: 600;
        min-width: 60px;
        text-align: right;
      }

      body.light-mode .ticker-item {
        background: rgba(0, 0, 0, 0.05);
        border-left-color: transparent;
      }

      body.light-mode .ticker-item:hover {
        background: rgba(0, 0, 0, 0.1);
        border-left-color: #0066cc;
      }

      body.light-mode .ticker-item.positive {
        color: #059669;
      }

      body.light-mode .ticker-item.negative {
        color: #dc2626;
      }

      @keyframes scroll {
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(-100%);
        }
      }

      /* Pause animation on hover */
      .ticker-content:hover {
        animation-play-state: paused;
      }

      @media (max-width: 768px) {
        #market-ticker {
          padding: 0.5rem;
        }

        .ticker-content {
          gap: 1rem;
        }

        .ticker-item {
          padding: 0.2rem 0.5rem;
          font-size: 0.8rem;
        }

        .ticker-price {
          min-width: 60px;
        }

        .ticker-change {
          min-width: 50px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .ticker-content {
          animation: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  addSymbol(symbol, data) {
    this.prices[symbol] = data;
    this.renderTicker();
  }

  removeSymbol(symbol) {
    delete this.prices[symbol];
    const index = this.config.symbols.indexOf(symbol);
    if (index > -1) {
      this.config.symbols.splice(index, 1);
    }
    this.renderTicker();
  }

  updateSymbols(symbols) {
    this.config.symbols = symbols;
    this.prices = {};
    this.updatePrices();
  }

  destroy() {
    this.stopTicker();
    const tickerElement = document.getElementById('market-ticker');
    if (tickerElement) {
      tickerElement.remove();
    }
  }
}

// Initialize market ticker when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Check if ticker should be shown (not on all pages)
    if (!document.body.classList.contains('no-ticker')) {
      window.marketTicker = new MarketTicker({
        mockData: true,
        updateInterval: 5000
      });
    }
  });
} else {
  if (!document.body.classList.contains('no-ticker')) {
    window.marketTicker = new MarketTicker({
      mockData: true,
      updateInterval: 5000
    });
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarketTicker;
}
