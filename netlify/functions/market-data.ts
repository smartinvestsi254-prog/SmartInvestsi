/**
 * Market Data Functions for SmartInvestsi
 * Provides real-time and historical market data
 */

import logger from './logger';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  lastUpdated: string;
}

interface HistoricalData {
  symbol: string;
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

// Mock market data - in production, this would connect to real market data APIs
const MOCK_MARKET_DATA: { [symbol: string]: MarketData } = {
  'AAPL': {
    symbol: 'AAPL',
    price: 175.50,
    change: 2.30,
    changePercent: 1.33,
    volume: 52847392,
    marketCap: 2800000000000,
    lastUpdated: new Date().toISOString()
  },
  'GOOGL': {
    symbol: 'GOOGL',
    price: 2700.00,
    change: -15.25,
    changePercent: -0.56,
    volume: 1234567,
    marketCap: 1800000000000,
    lastUpdated: new Date().toISOString()
  },
  'MSFT': {
    symbol: 'MSFT',
    price: 335.20,
    change: 5.80,
    changePercent: 1.76,
    volume: 23456789,
    marketCap: 2500000000000,
    lastUpdated: new Date().toISOString()
  },
  'TSLA': {
    symbol: 'TSLA',
    price: 245.80,
    change: -8.90,
    changePercent: -3.49,
    volume: 45678912,
    marketCap: 780000000000,
    lastUpdated: new Date().toISOString()
  }
};

/**
 * Get current market data for a symbol
 */
function getMarketData(symbol: string): MarketData | null {
  const data = MOCK_MARKET_DATA[symbol.toUpperCase()];
  if (!data) {
    logger.warn('Market data requested for unknown symbol', { symbol });
    return null;
  }

  // Update last updated time
  data.lastUpdated = new Date().toISOString();

  return data;
}

/**
 * Get market data for multiple symbols
 */
function getMultipleMarketData(symbols: string[]): MarketData[] {
  return symbols
    .map(symbol => getMarketData(symbol))
    .filter(data => data !== null) as MarketData[];
}

/**
 * Get market overview (popular stocks)
 */
function getMarketOverview(): MarketData[] {
  const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA'];
  return getMultipleMarketData(popularSymbols);
}

/**
 * Get historical data (mock implementation)
 */
function getHistoricalData(symbol: string, period: '1D' | '1W' | '1M' | '3M' | '1Y' = '1M'): HistoricalData | null {
  const currentData = getMarketData(symbol);
  if (!currentData) {
    return null;
  }

  // Generate mock historical data
  const dataPoints = period === '1D' ? 24 : period === '1W' ? 7 : period === '1M' ? 30 : period === '3M' ? 90 : 365;
  const intervalHours = period === '1D' ? 1 : 24;

  const historicalData: HistoricalData = {
    symbol,
    data: []
  };

  let currentPrice = currentData.price * 0.95; // Start slightly lower

  for (let i = dataPoints; i >= 0; i--) {
    const date = new Date();
    date.setHours(date.getHours() - (i * intervalHours));

    const volatility = 0.02; // 2% daily volatility
    const change = (Math.random() - 0.5) * 2 * volatility;
    currentPrice = currentPrice * (1 + change);

    const high = currentPrice * (1 + Math.random() * 0.01);
    const low = currentPrice * (1 - Math.random() * 0.01);
    const open = currentPrice * (1 + (Math.random() - 0.5) * 0.005);

    historicalData.data.push({
      date: date.toISOString(),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(currentPrice * 100) / 100,
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
  }

  return historicalData;
}

/**
 * Search for symbols
 */
function searchSymbols(query: string): MarketData[] {
  const upperQuery = query.toUpperCase();
  return Object.values(MOCK_MARKET_DATA)
    .filter(data =>
      data.symbol.toUpperCase().includes(upperQuery) ||
      data.symbol.toLowerCase().includes(query.toLowerCase())
    );
}

/**
 * Get market indices
 */
function getMarketIndices(): Array<{ name: string; value: number; change: number; changePercent: number }> {
  return [
    { name: 'S&P 500', value: 4200.50, change: 15.20, changePercent: 0.36 },
    { name: 'NASDAQ', value: 12800.75, change: -25.30, changePercent: -0.20 },
    { name: 'DOW JONES', value: 33500.25, change: 45.80, changePercent: 0.14 }
  ];
}

// Export for testing
export {
  getMarketData,
  getMultipleMarketData,
  getMarketOverview,
  getHistoricalData,
  searchSymbols,
  getMarketIndices,
  MOCK_MARKET_DATA
};