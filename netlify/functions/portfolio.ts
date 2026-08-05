/**
 * Portfolio Management Functions for SmartInvestsi
 * Handles portfolio creation, updates, and analytics
 */

import logger from './logger';

interface Portfolio {
  id: string;
  userId: string;
  name: string;
  holdings: Holding[];
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

interface Holding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
}

// Mock portfolio database
const MOCK_PORTFOLIOS: Portfolio[] = [
  {
    id: '1',
    userId: '2', // Demo user
    name: 'My Investment Portfolio',
    holdings: [
      {
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 150,
        currentPrice: 175,
        value: 1750,
        gainLoss: 250,
        gainLossPercent: 16.67
      },
      {
        symbol: 'GOOGL',
        quantity: 5,
        averagePrice: 2500,
        currentPrice: 2700,
        value: 13500,
        gainLoss: 1000,
        gainLossPercent: 8.00
      }
    ],
    totalValue: 15250,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

/**
 * Get user's portfolios
 */
function getUserPortfolios(userId: string): Portfolio[] {
  return MOCK_PORTFOLIOS.filter(p => p.userId === userId);
}

/**
 * Get specific portfolio
 */
function getPortfolio(portfolioId: string, userId: string): Portfolio | null {
  const portfolio = MOCK_PORTFOLIOS.find(p => p.id === portfolioId && p.userId === userId);
  return portfolio || null;
}

/**
 * Create new portfolio
 */
function createPortfolio(userId: string, name: string): Portfolio {
  const newPortfolio: Portfolio = {
    id: Date.now().toString(),
    userId,
    name,
    holdings: [],
    totalValue: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  MOCK_PORTFOLIOS.push(newPortfolio);

  logger.info('Portfolio created', { portfolioId: newPortfolio.id, userId, name });

  return newPortfolio;
}

/**
 * Update portfolio holdings
 */
function updatePortfolioHoldings(portfolioId: string, userId: string, holdings: Holding[]): Portfolio | null {
  const portfolioIndex = MOCK_PORTFOLIOS.findIndex(p => p.id === portfolioId && p.userId === userId);

  if (portfolioIndex === -1) {
    return null;
  }

  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

  MOCK_PORTFOLIOS[portfolioIndex] = {
    ...MOCK_PORTFOLIOS[portfolioIndex],
    holdings,
    totalValue,
    updatedAt: new Date().toISOString()
  };

  logger.info('Portfolio updated', { portfolioId, userId, holdingCount: holdings.length, totalValue });

  return MOCK_PORTFOLIOS[portfolioIndex];
}

/**
 * Calculate portfolio analytics
 */
function calculatePortfolioAnalytics(portfolio: Portfolio) {
  const totalInvested = portfolio.holdings.reduce((sum, h) => sum + (h.averagePrice * h.quantity), 0);
  const totalGainLoss = portfolio.totalValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  const topPerformers = portfolio.holdings
    .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
    .slice(0, 3);

  const worstPerformers = portfolio.holdings
    .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
    .slice(0, 3);

  return {
    totalInvested,
    totalValue: portfolio.totalValue,
    totalGainLoss,
    totalGainLossPercent,
    topPerformers,
    worstPerformers,
    diversification: calculateDiversification(portfolio.holdings)
  };
}

/**
 * Calculate portfolio diversification
 */
function calculateDiversification(holdings: Holding[]): { [sector: string]: number } {
  // Mock sector allocation - in production, this would use real market data
  const sectorMap: { [symbol: string]: string } = {
    'AAPL': 'Technology',
    'GOOGL': 'Technology',
    'MSFT': 'Technology',
    'AMZN': 'Consumer',
    'TSLA': 'Automotive',
    'JPM': 'Financial',
    'JNJ': 'Healthcare'
  };

  const sectors: { [sector: string]: number } = {};

  holdings.forEach(holding => {
    const sector = sectorMap[holding.symbol] || 'Other';
    sectors[sector] = (sectors[sector] || 0) + holding.value;
  });

  // Convert to percentages
  const totalValue = Object.values(sectors).reduce((sum, value) => sum + value, 0);
  Object.keys(sectors).forEach(sector => {
    sectors[sector] = (sectors[sector] / totalValue) * 100;
  });

  return sectors;
}

// Export for testing
export {
  getUserPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolioHoldings,
  calculatePortfolioAnalytics,
  MOCK_PORTFOLIOS
};