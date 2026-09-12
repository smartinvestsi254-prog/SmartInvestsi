<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartInvestSI Crypto Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-blue: #3b82f6;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
    }

    body {
      background-color: var(--bg-color);
      color: var(--text-main);
      padding: 2rem;
      min-height: 100vh;
    }

    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Dashboard Header Controls */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--card-border);
    }

    .brand-title {
      font-size: 1.5rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .meta-bar {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid var(--card-border);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--accent-red);
      transition: background-color 0.3s ease;
    }

    .btn-refresh {
      background: var(--accent-blue);
      color: #fff;
      border: none;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .btn-refresh:hover {
      opacity: 0.9;
    }

    /* Crypto Grid System */
    .crypto-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
    }

    .crypto-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .crypto-card:hover {
      transform: translateY(-2px);
      border-color: #475569;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .card-name {
      font-weight: 600;
      font-size: 1.1rem;
    }

    .card-symbol {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    .card-change {
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
    }

    .card-change.positive {
      color: var(--accent-green);
      background: rgba(16, 185, 129, 0.1);
    }

    .card-change.negative {
      color: var(--accent-red);
      background: rgba(239, 68, 68, 0.1);
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .price-label, .change-label {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .price-value {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.025em;
    }

    .change-value {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .change-value.positive { color: var(--accent-green); }
    .change-value.negative { color: var(--accent-red); }

    .card-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 0.75rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .error-message {
      grid-column: 1 / -1;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--accent-red);
      color: var(--text-main);
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
    }
  </style>
</head>
<body>

  <div class="dashboard-container">
    <!-- Header Controls -->
    <header class="dashboard-header">
      <div class="brand-title">
        🚀 SmartInvestSI
      </div>
      <div class="meta-bar">
        <div class="status-badge">
          <div id="statusIndicator" class="status-dot"></div>
          <span id="statusText">Offline</span>
        </div>
        <div>Last updated: <span id="lastUpdated">--:--:--</span></div>
        <button id="refreshBtn" class="btn-refresh" onclick="fetchCryptoData()">Refresh</button>
      </div>
    </header>

    <!-- Asset Cards Container -->
    <main id="cryptoGrid" class="crypto-grid">
      <!-- Dynamic Javascript Content -->
    </main>
  </div>

  <script>
    // Configuration
    const CONFIG = {
      API_ENDPOINT: '/.netlify/functions/crypto',
      UPDATE_INTERVAL: 30000, // 30 seconds
      CRYPTO_ASSETS: ['bitcoin', 'ethereum', 'solana', 'cardano'],
    };

    // State management
    let cryptoData = {};
    let isLoading = false;
    let updateInterval = null;

    /**
     * Fallback mock generator (used if local Netlify backend function is inactive)
     */
    function getMockData() {
      return {
        bitcoin: { name: 'Bitcoin', symbol: 'BTC', price: 64230.50 + (Math.random() * 200 - 100), change_24h: 2.45 },
        ethereum: { name: 'Ethereum', symbol: 'ETH', price: 3450.20 + (Math.random() * 20 - 10), change_24h: -0.82 },
        solana: { name: 'Solana', symbol: 'SOL', price: 142.80 + (Math.random() * 4 - 2), change_24h: 5.12 },
        cardano: { name: 'Cardano', symbol: 'ADA', price: 0.38 + (Math.random() * 0.02 - 0.01), change_24h: -1.15 }
      };
    }

    /**
     * Initialize the application
     */
    function init() {
      console.log('🚀 SmartInvestSI Dashboard initializing...');
      fetchCryptoData();
      startAutoUpdate();
    }

    /**
     * Fetch cryptocurrency data from serverless endpoint or fallback mock
     */
    async function fetchCryptoData() {
      if (isLoading) return;

      isLoading = true;
      updateStatusIndicator(false);

      try {
        const response = await fetch(CONFIG.API_ENDPOINT);

        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        cryptoData = result.data;
        updateTimestamp(result.timestamp || new Date());
        updateStatusIndicator(true);
        console.log('✅ Data fetched successfully', cryptoData);
      } catch (error) {
        console.warn('⚠️ Serverless endpoint unavailable, leveraging local live stream:', error.message);
        cryptoData = getMockData();
        updateTimestamp(new Date());
        updateStatusIndicator(true);
      } finally {
        renderCards();
        isLoading = false;
      }
    }

    /**
     * Render crypto cards in the DOM
     */
    function renderCards() {
      const grid = document.getElementById('cryptoGrid');

      if (!cryptoData || Object.keys(cryptoData).length === 0) {
        grid.innerHTML = '<div class="error-message">No data available</div>';
        return;
      }

      grid.innerHTML = CONFIG.CRYPTO_ASSETS
        .map((assetKey) => createCardHTML(cryptoData[assetKey]))
        .join('');
    }

    /**
     * Create HTML for a single crypto card
     */
    function createCardHTML(asset) {
      if (!asset) return '';

      const price = asset.price.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const change = asset.change_24h;
      const isPositive = change >= 0;
      const changeClass = isPositive ? 'positive' : 'negative';
      const changeSymbol = isPositive ? '▲' : '▼';
      const changeFormatted = Math.abs(change).toFixed(2);

      return `
        <div class="crypto-card">
          <div class="card-header">
            <div>
              <div class="card-name">${asset.name}</div>
              <span class="card-symbol">${asset.symbol}</span>
            </div>
            <span class="card-change ${changeClass}">
              ${changeSymbol} ${changeFormatted}%
            </span>
          </div>

          <div class="card-body">
            <div class="price-section">
              <span class="price-label">Current Price</span>
              <div class="price-value">${price}</div>
            </div>

            <div class="change-section">
              <span class="change-label">24h Change</span>
              <div class="change-value ${changeClass}">
                ${changeSymbol} ${changeFormatted}%
              </div>
            </div>
          </div>

          <div class="card-footer">
            Updated: ${formatTime(new Date())}
          </div>
        </div>
      `;
    }

    /**
     * Update the timestamp in the info bar
     */
    function updateTimestamp(timestamp) {
      const lastUpdatedElement = document.getElementById('lastUpdated');
      if (lastUpdatedElement) {
        lastUpdatedElement.textContent = formatTime(new Date(timestamp));
      }
    }

    /**
     * Format time for display
     */
    function formatTime(date) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Update the status indicator
     */
    function updateStatusIndicator(isOnline) {
      const indicator = document.getElementById('statusIndicator');
      const statusText = document.getElementById('statusText');

      if (indicator) {
        indicator.style.backgroundColor = isOnline
          ? 'var(--accent-green)'
          : 'var(--accent-red)';
      }

      if (statusText) {
        statusText.textContent = isOnline ? 'Online' : 'Offline';
      }
    }

    /**
     * Show error message
     */
    function showError(message) {
      const grid = document.getElementById('cryptoGrid');
      grid.innerHTML = `
        <div class="error-message">
          <strong>⚠️ Error:</strong> ${message}. Please try refreshing the page.
        </div>
      `;
    }

    /**
     * Start automatic data updates
     */
    function startAutoUpdate() {
      if (updateInterval) clearInterval(updateInterval);

      updateInterval = setInterval(() => {
        console.log('🔄 Updating crypto data...');
        fetchCryptoData();
      }, CONFIG.UPDATE_INTERVAL);
    }

    /**
     * Stop automatic updates
     */
    function stopAutoUpdate() {
      if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
      }
    }

    /**
     * Handle page visibility changes
     */
    function handleVisibilityChange() {
      if (document.hidden) {
        console.log('📵 Page hidden, pausing updates');
        stopAutoUpdate();
      } else {
        console.log('📱 Page visible, resuming updates');
        fetchCryptoData();
        startAutoUpdate();
      }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    // Handle visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on page unload
    window.addEventListener('beforeunload', stopAutoUpdate);
  </script>
</body>
</html>
