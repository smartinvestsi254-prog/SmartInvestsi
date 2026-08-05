// enhanced-dashboard.js - Dashboard functionality for all 20 features

const API_BASE = '/api/features';
const userEmail = localStorage.getItem('si_user_email') || 'user@smartinvestsi';

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboardData();
  await checkUserTier();
});

async function checkUserTier() {
  try {
    const response = await fetch(`${API_BASE}/user-tier`, {
      headers: { 'x-user-email': userEmail }
    });
    const data = await response.json();
    document.getElementById('userTier').textContent = data.tier || 'FREE';
  } catch (error) {
    console.error('Error checking tier:', error);
  }
}

async function loadDashboardData() {
  try {
    // Load portfolios
    const portfoliosRes = await fetch(`${API_BASE}/portfolios`, {
      headers: { 'x-user-email': userEmail }
    });
    const portfolios = await portfoliosRes.json();
    
    if (portfolios.success) {
      const totalValue = portfolios.portfolios.reduce((sum, p) => sum + (p.totalValue || 0), 0);
      document.getElementById('portfolioValue').textContent = `$${totalValue.toFixed(2)}`;
      document.getElementById('statsPortfolios').textContent = portfolios.portfolios.length;
      
      const totalHoldings = portfolios.portfolios.reduce((sum, p) => sum + (p.holdings?.length || 0), 0);
      document.getElementById('statsHoldings').textContent = totalHoldings;
    }
    
    // Load alerts
    const alertsRes = await fetch(`${API_BASE}/alerts/price`, {
      headers: { 'x-user-email': userEmail }
    });
    const alerts = await alertsRes.json();
    
    if (alerts.success) {
      document.getElementById('statsAlerts').textContent = alerts.alerts?.length || 0;
    }
    
    // Load dividends
    const dividendsRes = await fetch(`${API_BASE}/dividends`, {
      headers: { 'x-user-email': userEmail }
    });
    const dividends = await dividendsRes.json();
    
    if (dividends.success) {
      const total = dividends.summary?.total || 0;
      document.getElementById('statsDividends').textContent = `$${total.toFixed(2)}`;
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Feature functions
function loadPortfolios() {
  window.location.href = '/portfolios.html';
}

async function showCreatePortfolio() {
  const name = prompt('Enter portfolio name:');
  if (!name) return;
  
  try {
    const response = await fetch(`${API_BASE}/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ name, currency: 'USD' })
    });
    
    const data = await response.json();
    if (data.success) {
      alert(`Portfolio "${name}" created successfully!`);
      loadDashboardData();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error creating portfolio:', error);
    alert('Failed to create portfolio');
  }
}

async function analyzeRebalancing() {
  const portfolios = await fetch(`${API_BASE}/portfolios`, {
    headers: { 'x-user-email': userEmail }
  }).then(r => r.json());
  
  if (!portfolios.success || portfolios.portfolios.length === 0) {
    alert('No portfolios found');
    return;
  }
  
  const portfolioId = portfolios.portfolios[0].id;
  window.location.href = `/rebalancing.html?portfolioId=${portfolioId}`;
}

function setTargetAllocation() {
  window.location.href = '/portfolio-settings.html';
}

async function getMarketQuote() {
  const symbol = prompt('Enter stock symbol (e.g., AAPL):');
  if (!symbol) return;
  
  try {
    const response = await fetch(`${API_BASE}/market/quote/${symbol}`, {
      headers: { 'x-user-email': userEmail }
    });
    const data = await response.json();
    
    if (data.success) {
      const quote = data.quote;
      alert(`${quote.symbol}: $${quote.price}\nChange: ${quote.change} (${quote.changePercent}%)`);
    } else {
      alert('Quote not found');
    }
  } catch (error) {
    console.error('Error fetching quote:', error);
    alert('Failed to fetch quote');
  }
}

function viewWatchlist() {
  window.location.href = '/watchlist.html';
}

async function createPriceAlert() {
  const symbol = prompt('Enter stock symbol:');
  if (!symbol) return;
  
  const targetPrice = prompt('Enter target price:');
  if (!targetPrice) return;
  
  const condition = prompt('Condition (ABOVE/BELOW/CROSSES):');
  if (!condition) return;
  
  try {
    const response = await fetch(`${API_BASE}/alerts/price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({
        symbol,
        targetPrice: parseFloat(targetPrice),
        condition
      })
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Price alert created successfully!');
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error creating alert:', error);
    alert('Failed to create alert');
  }
}

function viewAlerts() {
  window.location.href = '/alerts.html';
}

function viewDividends() {
  window.location.href = '/dividends.html';
}

function dividendCalendar() {
  window.location.href = '/dividend-calendar.html';
}

function viewNews() {
  window.location.href = '/news.html';
}

function newsAlerts() {
  window.location.href = '/news-alerts.html';
}

function viewTraders() {
  window.location.href = '/traders.html';
}

function viewSocialFeed() {
  window.location.href = '/social-feed.html';
}

function compareTraders() {
  window.location.href = '/compare-traders.html';
}

function startCopyTrading() {
  window.location.href = '/copy-trading.html';
}

function createRoboPortfolio() {
  window.location.href = '/robo-advisor.html';
}

function getRoboAdvice() {
  window.location.href = '/robo-advisor-recommendations.html';
}

function linkBankAccount() {
  window.location.href = '/bank-linking.html';
}

function manageBankAccounts() {
  window.location.href = '/bank-accounts.html';
}

function setupAutoInvest() {
  window.location.href = '/auto-invest-setup.html';
}

function viewAutoInvest() {
  window.location.href = '/auto-invest.html';
}

function manageWallets() {
  window.location.href = '/wallets.html';
}

function exchangeCurrency() {
  window.location.href = '/currency-exchange.html';
}

async function generateReferralCode() {
  try {
    const response = await fetch(`${API_BASE}/referral/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      }
    });
    
    const data = await response.json();
    if (data.success) {
      const code = data.referral.referralCode;
      const text = `Check out SmartInvest Africa! Use my referral code: ${code}`;
      alert(text);
      navigator.clipboard.writeText(text);
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error generating referral code:', error);
  }
}

function viewReferralRewards() {
  window.location.href = '/referral-rewards.html';
}

function browseCourses() {
  window.location.href = '/courses.html';
}

function viewEnrolled() {
  window.location.href = '/my-courses.html';
}

function viewTaxReport() {
  window.location.href = '/tax-report.html';
}

function harvestTaxLoss() {
  window.location.href = '/tax-harvesting.html';
}

function buyFractionalShares() {
  window.location.href = '/fractional-shares.html';
}

function viewOrders() {
  window.location.href = '/orders.html';
}

function compareBenchmarks() {
  window.location.href = '/benchmark-comparison.html';
}

function viewPerformance() {
  window.location.href = '/performance.html';
}

function manageNotifications() {
  window.location.href = '/notification-settings.html';
}

function setupWhatsApp() {
  window.location.href = '/whatsapp-setup.html';
}

function downloadApps() {
  alert('iOS: https://apps.apple.com/smartinvest\nAndroid: https://play.google.com/store/apps/smartinvest');
}

function viewAppFeatures() {
  window.location.href = '/mobile-app-features.html';
}

function changeLanguage() {
  const languages = ['English', 'Swahili', 'French', 'Arabic', 'Portuguese'];
  const selected = prompt(`Select language:\n${languages.join('\n')}`);
  if (selected) {
    localStorage.setItem('language', selected.toLowerCase());
    alert(`Language changed to ${selected}`);
    location.reload();
  }
}

function viewLanguages() {
  window.location.href = '/languages.html';
}
