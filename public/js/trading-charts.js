/**
 * Shared TradingView Chart Controller - Binance/Bitget Trading Style
 * Compatible with TradingView Public Widget Script (tv.js)
 */

class TradingCharts {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.symbol = options.symbol || 'BINANCE:BTCUSDT';
    this.interval = options.interval || '15';
    this.theme = options.theme || 'dark';
    this.tvWidget = null;
    this.activeStudies = new Map(); // Tracks created indicator studies

    this.init();
  }

  init() {
    this.tvWidget = new TradingView.widget({
      container_id: this.containerId,
      width: '100%',
      height: '100%',
      symbol: this.symbol,
      interval: this.interval,
      timezone: 'Etc/UTC',
      theme: this.theme,
      style: '1', // Candle style
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      
      // Binance/Bitget Dark Palette Override
      overrides: {
        'paneProperties.background': '#12161c',
        'paneProperties.backgroundType': 'solid',
        'paneProperties.vertGridProperties.color': '#1f2630',
        'paneProperties.horzGridProperties.color': '#1f2630',
        'symbolWatermarkProperties.transparency': 90,
        'scalesProperties.textColor': '#848e9c',
        
        // Binance Green / Red Candlesticks
        'mainSeriesProperties.candleStyle.upColor': '#0ECB81',
        'mainSeriesProperties.candleStyle.downColor': '#F6465D',
        'mainSeriesProperties.candleStyle.drawWick': true,
        'mainSeriesProperties.candleStyle.drawBorder': true,
        'mainSeriesProperties.candleStyle.borderColor': '#0ECB81',
        'mainSeriesProperties.candleStyle.borderUpColor': '#0ECB81',
        'mainSeriesProperties.candleStyle.borderDownColor': '#F6465D',
        'mainSeriesProperties.candleStyle.wickUpColor': '#0ECB81',
        'mainSeriesProperties.candleStyle.wickDownColor': '#F6465D',
      },

      // Binance UI Feature Adjustments
      disabled_features: [
        'header_symbol_search',
        'header_compare',
        'timeframes_toolbar'
      ],
      enabled_features: [
        'study_templates',
        'side_toolbar_in_widget_header',
        'header_in_multi_chart_mode'
      ]
    });
  }

  /**
   * Safe Indicator Toggler
   * @param {string} name - Official TV Indicator Name
   * @param {object} inputs - Configuration parameters (e.g. { length: 20 })
   */
  toggleStudy(name, inputs = {}) {
    if (!this.tvWidget) return;

    this.tvWidget.onChartReady(() => {
      const chart = this.tvWidget.chart();

      if (this.activeStudies.has(name)) {
        // Remove active study
        const studyEntity = this.activeStudies.get(name);
        chart.removeEntity(studyEntity);
        this.activeStudies.delete(name);
      } else {
        // Add new study
        chart.createStudy(name, false, false, Object.values(inputs), (entity) => {
          this.activeStudies.set(name, entity);
        });
      }
    });
  }

  // --- Binance/Bitget Default Indicator Triggers ---
  
  toggleSMA(period = 20) {
    this.toggleStudy('Moving Average', { length: period });
  }

  toggleEMA(period = 12) {
    this.toggleStudy('Moving Average Exponential', { length: period });
  }

  toggleRSI(period = 14) {
    this.toggleStudy('Relative Strength Index', { length: period });
  }

  toggleMACD() {
    this.toggleStudy('MACD');
  }

  toggleBollinger() {
    this.toggleStudy('Bollinger Bands');
  }

  toggleVolume() {
    this.toggleStudy('Volume');
  }

  // --- Controls ---

  setTimeframe(tf) {
    if (this.tvWidget) {
      this.tvWidget.onChartReady(() => {
        this.tvWidget.chart().setResolution(tf);
      });
    }
  }

  setSymbol(symbol) {
    if (this.tvWidget) {
      this.tvWidget.onChartReady(() => {
        this.tvWidget.chart().setSymbol(symbol);
      });
    }
  }
}

// Global charts container
let charts = [];

// Binance/Bitget Style Indicator Control Bar
function initIndicatorToggles(containerId = '#indicators') {
  const container = document.querySelector(containerId);
  if (!container) return;

  const indicators = [
    { key: 'MA20', label: 'MA(20)', action: (chart) => chart.toggleSMA(20) },
    { key: 'MA50', label: 'MA(50)', action: (chart) => chart.toggleSMA(50) },
    { key: 'EMA12', label: 'EMA(12)', action: (chart) => chart.toggleEMA(12) },
    { key: 'BOL', label: 'BOLL', action: (chart) => chart.toggleBollinger() },
    { key: 'RSI', label: 'RSI', action: (chart) => chart.toggleRSI() },
    { key: 'MACD', label: 'MACD', action: (chart) => chart.toggleMACD() },
    { key: 'VOL', label: 'VOL', action: (chart) => chart.toggleVolume() }
  ];

  container.innerHTML = '';
  
  indicators.forEach(ind => {
    const btn = document.createElement('button');
    btn.className = 'exchange-btn exchange-btn-outline';
    btn.textContent = ind.label;
    
    btn.onclick = () => {
      btn.classList.toggle('active');
      if (charts[0]) ind.action(charts[0]);
    };
    
    container.appendChild(btn);
  });
}

// Exchange-style Timeframe Selector Bar
function initTimeframes(timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'], containerId = '#timeframe-bar') {
  const container = document.querySelector(containerId);
  if (!container) return;

  // Map exchange label to TradingView Resolution format
  const tfMap = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '1h': '60',
    '4h': '240',
    '1D': 'D',
    '1W': 'W'
  };

  container.className = 'exchange-timeframe-bar';
  container.innerHTML = timeframes.map((tf, idx) => `
    <button class="timeframe-btn ${idx === 2 ? 'active' : ''}" data-tf="${tfMap[tf] || tf}">
      ${tf}
    </button>
  `).join('');

  container.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (charts[0]) charts[0].setTimeframe(btn.dataset.tf);
    };
  });
}

// Expose bindings to global window object
window.TradingCharts = TradingCharts;
window.initIndicatorToggles = initIndicatorToggles;
window.initTimeframes = initTimeframes;
