// Shared TradingView Chart Controller - Binance/Bitget Style
// Usage: Include in HTML, init with: new TradingCharts('chart-id', options)

class TradingCharts {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.symbol = options.symbol || 'BINANCE:BTCUSDT';
    this.interval = options.interval || '15';
    this.theme = options.theme || 'dark';
    this.studies = options.studies || [];
    this.tvWidget = null;
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
      style: '1', // Candles
      locale: 'en',
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: true,
      save_image: false,
      studies: this.studies,
      study_ids: this.studies, // TradingView study IDs
      // Interactive features
      disabled_features: [],
      enabled_features: ['study_templates', 'header_widget', 'timeframes', 'header_saveload', 'header_compare', 'header_symbol_search']
    });
  }

  // Toggle indicators (Binance-style)
  toggleStudy(studyId, enable = true) {
    if (!this.tvWidget) return;
    const studies = this.tvWidget.getAllStudies();
    const study = studies.find(s => s.metaInfo().id === studyId);
    if (study && !enable) {
      this.tvWidget.removeEntity(study);
    } else if (enable) {
      this.tvWidget.saveStudy(studyId, { /* default inputs */ });
    }
  }

  // Common indicators
  enableSMA(period = 20) {
    this.toggleStudy(`MASimple@${period}`);
  }

  enableEMA(period = 12) {
    this.toggleStudy(`EMA@${period}`);
  }

  enableRSI() {
    this.toggleStudy('RelativeStrengthIndex@tv-basicstudies');
  }

  enableMACD() {
    this.toggleStudy('MACD@tv-basicstudies');
  }

  enableBollinger() {
    this.toggleStudy('BB@tv-basicstudies');
  }

  enableVolume() {
    this.toggleStudy('Volume@tv-basicstudies');
  }

  // Timeframe change
  setTimeframe(tf) {
    if (this.tvWidget) this.tvWidget.setResolution(tf);
  }

  // Symbol change
  setSymbol(symbol) {
    if (this.tvWidget) this.tvWidget.setSymbol(symbol, this.interval);
  }

  // Sync multiple charts
  static syncCharts(charts) {
    const master = charts[0];
    charts.slice(1).forEach(chart => {
      chart.tvWidget.onChartReady(() => {
        chart.tvWidget.headerReady().then(() => {
          const syncLink = chart.tvWidget.createSyncLink(master.tvWidget);
          master.tvWidget.applySyncLink(syncLink);
        });
      });
    });
  }
}

// Utility functions for UI toggles
function initIndicatorToggles(containerId = '#indicators') {
  const container = document.querySelector(containerId);
  if (!container) return;

  const indicators = [
    { id: 'sma20', label: 'SMA 20', fn: () => charts[0].enableSMA(20) },
    { id: 'sma50', label: 'SMA 50', fn: () => charts[0].enableSMA(50) },
    { id: 'sma200', label: 'SMA 200', fn: () => charts[0].enableSMA(200) },
    { id: 'ema12', label: 'EMA 12', fn: () => charts[0].enableEMA(12) },
    { id: 'rsi', label: 'RSI 14', fn: () => charts[0].enableRSI() },
    { id: 'macd', label: 'MACD', fn: () => charts[0].enableMACD() },
    { id: 'bb', label: 'Bollinger', fn: () => charts[0].enableBollinger() },
    { id: 'volume', label: 'Volume', fn: () => charts[0].enableVolume() }
  ];

  indicators.forEach(ind => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-outline-light me-2 mb-2 ta-toggle';
    btn.innerHTML = `<i class="fas fa-check me-1"></i>${ind.label}`;
    btn.onclick = ind.fn;
    container.appendChild(btn);
  });
}

// Timeframe buttons
function initTimeframes(timeframes = ['1', '5', '15', '60', '240', '1D', '1W']) {
  const bar = document.querySelector('#timeframe-bar') || document.createElement('div');
  bar.id = 'timeframe-bar';
  bar.className = 'btn-group mb-3';
  bar.innerHTML = timeframes.map(tf => 
    `<button class="btn btn-sm btn-outline-light timeframe-btn" data-tf="${tf}">${tf}</button>`
  ).join('');

  bar.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.onclick = () => {
      bar.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      charts[0]?.setTimeframe(btn.dataset.tf);
    };
  });

  document.body.appendChild(bar);
}

// Global charts array for sync
let charts = [];

// Export for HTML usage
window.TradingCharts = TradingCharts;
window.initIndicatorToggles = initIndicatorToggles;
window.initTimeframes = initTimeframes;
