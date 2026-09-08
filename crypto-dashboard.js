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
 * Initialize the application
 */
function init() {
  console.log('🚀 SmartInvestSI Dashboard initializing...');
  fetchCryptoData();
  startAutoUpdate();
}

/**
 * Fetch cryptocurrency data from the serverless function
 */
async function fetchCryptoData() {
  if (isLoading) return;

  isLoading = true;
  updateStatusIndicator(false);

  try {
    const response = await fetch(CONFIG.API_ENDPOINT);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch data');
    }

    cryptoData = result.data;
    renderCards();
    updateTimestamp(result.timestamp);
    updateStatusIndicator(true);
    console.log('✅ Data fetched successfully', cryptoData);
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    showError(error.message);
    updateStatusIndicator(false);
  } finally {
    isLoading = false;
  }
}

/**
 * Render crypto cards in the DOM
 */
function renderCards() {
  const grid = document.getElementById('cryptoGrid');

  if (Object.keys(cryptoData).length === 0) {
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