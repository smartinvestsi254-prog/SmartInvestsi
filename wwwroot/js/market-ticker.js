/**
 * SmartInvestsi Market Ticker (wwwroot version)
 * Lightweight scrolling ticker for crypto, stocks, and commodities
 * Include with: <script src="/wwwroot/js/market-ticker.js"></script>
 */

(function () {
    'use strict';

    const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'GOLD', 'OIL', 'SP500', 'EURUSD'];
    const UPDATE_INTERVAL = 5000; // 5 seconds

    // Base mock data (used for demo / offline fallback)
    const BASE_DATA = {
        BTC: { price: 67500, change: 2.5, symbol: '₿' },
        ETH: { price: 3450, change: 1.8, symbol: 'Ξ' },
        GOLD: { price: 2025, change: 0.5, symbol: '🥇' },
        OIL: { price: 78.5, change: -1.2, symbol: '🛢️' },
        SP500: { price: 5825, change: 0.8, symbol: '📈' },
        EURUSD: { price: 1.0935, change: 0.3, symbol: '€' }
    };

    class MarketTicker {
        constructor(config) {
            this.config = {
                symbols: (config && config.symbols) || DEFAULT_SYMBOLS,
                updateInterval: (config && config.updateInterval) || UPDATE_INTERVAL,
                mockData: config && config.mockData !== false
            };
            this.ticker = null;
            this.prices = {};
            this.intervalId = null;
        }

        init() {
            this.createTickerElement();
            this.startTicker();
        }

        createTickerElement() {
            if (document.getElementById('market-ticker')) return;

            const ticker = document.createElement('div');
            ticker.id = 'market-ticker';
            ticker.className = 'market-ticker';

            const content = document.createElement('div');
            content.className = 'ticker-content';
            ticker.appendChild(content);

            this.addTickerStyles();

            if (document.body.firstChild) {
                document.body.insertBefore(ticker, document.body.firstChild);
            } else {
                document.body.appendChild(ticker);
            }

            this.ticker = content;
        }

        startTicker() {
            this.updatePrices();
            this.intervalId = setInterval(() => this.updatePrices(), this.config.updateInterval);
        }

        stopTicker() {
            if (this.intervalId) clearInterval(this.intervalId);
        }

        async updatePrices() {
            try {
                this.prices = this.generateMockPrices();
                this.renderTicker();
            } catch (err) {
                console.warn('Market ticker error:', err);
                this.prices = this.generateMockPrices();
                this.renderTicker();
            }
        }

        generateMockPrices() {
            const data = JSON.parse(JSON.stringify(BASE_DATA));
            Object.keys(data).forEach(function (sym) {
                data[sym].change += (Math.random() - 0.5) * 0.1;
            });
            return data;
        }

        renderTicker() {
            if (!this.ticker) return;
            var html = '';
            var self = this;
            this.config.symbols.forEach(function (symbol) {
                var d = self.prices[symbol];
                if (!d) return;
                var changeClass = d.change >= 0 ? 'positive' : 'negative';
                var changeArrow = d.change >= 0 ? '▲' : '▼';
                var displayPrice = typeof d.price === 'number'
                    ? d.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : d.price;
                html += '<div class="ticker-item ' + changeClass + '">' +
                    '<span class="ticker-symbol">' + (d.symbol || symbol) + '</span>' +
                    '<span class="ticker-label">' + symbol + '</span>' +
                    '<span class="ticker-price">' + displayPrice + '</span>' +
                    '<span class="ticker-change">' + changeArrow + ' ' + Math.abs(d.change).toFixed(2) + '%</span>' +
                    '</div>';
            });
            this.ticker.innerHTML = html;
        }

        addTickerStyles() {
            if (document.getElementById('market-ticker-styles')) return;

            var style = document.createElement('style');
            style.id = 'market-ticker-styles';
            style.textContent = [
                '#market-ticker {',
                '  background: linear-gradient(90deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2));',
                '  backdrop-filter: blur(10px);',
                '  border-bottom: 1px solid rgba(212,175,55,0.2);',
                '  padding: 0.75rem 1rem;',
                '  overflow-x: auto;',
                '  position: sticky;',
                '  top: 0;',
                '  z-index: 999;',
                '}',
                'body.light-mode #market-ticker {',
                '  background: linear-gradient(90deg, rgba(240,240,240,0.9), rgba(250,250,250,0.9));',
                '  border-bottom-color: #e0e0e0;',
                '}',
                '.ticker-content {',
                '  display: flex;',
                '  gap: 2rem;',
                '  min-width: max-content;',
                '  animation: scroll 30s linear infinite;',
                '}',
                '.ticker-item {',
                '  display: flex;',
                '  align-items: center;',
                '  gap: 0.5rem;',
                '  padding: 0.25rem 0.75rem;',
                '  border-radius: 0.25rem;',
                '  background: rgba(212,175,55,0.05);',
                '  border-left: 3px solid transparent;',
                '  transition: all 0.2s ease;',
                '  white-space: nowrap;',
                '  font-size: 0.9rem;',
                '}',
                '.ticker-item:hover {',
                '  background: rgba(212,175,55,0.1);',
                '  border-left-color: #d4af37;',
                '}',
                '.ticker-item.positive { color: #22c55e; }',
                '.ticker-item.negative { color: #ef4444; }',
                '.ticker-symbol { font-size: 1.2rem; font-weight: 600; }',
                '.ticker-label { font-weight: 600; min-width: 40px; opacity: 0.7; }',
                '.ticker-price { font-weight: 700; min-width: 80px; text-align: right; }',
                '.ticker-change { font-weight: 600; min-width: 60px; text-align: right; }',
                'body.light-mode .ticker-item { background: rgba(0,0,0,0.05); }',
                'body.light-mode .ticker-item.positive { color: #059669; }',
                'body.light-mode .ticker-item.negative { color: #dc2626; }',
                '@keyframes scroll {',
                '  0% { transform: translateX(0); }',
                '  100% { transform: translateX(-100%); }',
                '}',
                '.ticker-content:hover { animation-play-state: paused; }',
                '@media (max-width: 768px) {',
                '  #market-ticker { padding: 0.5rem; }',
                '  .ticker-content { gap: 1rem; }',
                '  .ticker-item { padding: 0.2rem 0.5rem; font-size: 0.8rem; }',
                '  .ticker-price { min-width: 60px; }',
                '  .ticker-change { min-width: 50px; }',
                '}',
                '@media (prefers-reduced-motion: reduce) {',
                '  .ticker-content { animation: none; }',
                '}'
            ].join('\n');
            document.head.appendChild(style);
        }

        destroy() {
            this.stopTicker();
            var el = document.getElementById('market-ticker');
            if (el) el.remove();
        }
    }

    // Auto-initialize unless body has .no-ticker class
    function autoInit() {
        if (!document.body.classList.contains('no-ticker')) {
            window.marketTicker = new MarketTicker({ mockData: true });
            window.marketTicker.init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    // Export
    window.MarketTicker = MarketTicker;
})();