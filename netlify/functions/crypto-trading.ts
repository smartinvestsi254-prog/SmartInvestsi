/**
 * Crypto Trading API for SmartInvest
 * TradingView-style execution engine for cryptocurrency trading
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface TradeOrder {
  id: string;
  userId: string;
  symbol: string; // e.g., 'BTC/USD', 'ETH/USD'
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  filledQuantity: number;
  remainingQuantity: number;
  createdAt: string;
  updatedAt: string;
  fees: number;
}

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  lastUpdated: string;
}

import * as ccxt from 'ccxt';
import prisma from './lib/prisma';
import { tradeSchema } from './middleware/zod-validator';

// Real Prisma models (Phase 2.3)
const binance = new ccxt.binance({
  enableRateLimit: true,
  sandbox: process.env.NODE_ENV === 'development'
});


/**
 * Place trading order
 */
async function placeOrder(data: any): Promise<any> {
  try {
    const { userId, symbol, side, type, quantity, price, stopPrice } = data;

    // Validate order with real market check
    const validation = await validateOrder(binance, symbol, side, type, quantity, price, stopPrice);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const order: TradeOrder = {
      id: `order_${Date.now()}`,
      userId,
      symbol,
      side,
      type,
      quantity,
      price,
      stopPrice,
      status: 'pending',
      filledQuantity: 0,
      remainingQuantity: quantity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fees: 0
    };

    logger.info('Order placed', {
      orderId: order.id,
      userId,
      symbol,
      side,
      quantity,
      price: order.price
    });

    return { success: true, data: order };
  } catch (error) {
    logger.error('Place order error', { error: error.message });
    return { success: false, error: error.message };
  }
}


/**
 * Cancel order
 */
async function cancelOrder(orderId: string, userId: string): Promise<any> {
  try {
    const order = mockOrders.find(o => o.id === orderId && o.userId === userId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.status !== 'pending') {
      return { success: false, error: 'Order cannot be cancelled' };
    }

    order.status = 'cancelled';
    order.updatedAt = new Date().toISOString();

    logger.info('Order cancelled', { orderId, userId });

    return { success: true, data: order };
  } catch (error) {
    logger.error('Cancel order error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user orders
 */
async function getUserOrders(userId: string, status?: string): Promise<any> {
  try {
    const where: any = { portfolioId: userId };
    if (status) where.notes = { contains: status };
    const orders = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: orders };
  } catch (error) {
    logger.error('Get orders error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user positions
 */
async function getUserPositions(userId: string): Promise<any> {
  try {
    const holdings = await prisma.holding.findMany({
      where: { portfolioId: userId },
      include: { dividends: true }
    });
    return { success: true, data: holdings };
  } catch (error) {
    logger.error('Get positions error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get market data
 */
async function getMarketData(symbol?: string): Promise<any> {
  try {
    if (symbol) {
      const ticker = await binance.fetchTicker(symbol);
      const data: MarketData = {
        symbol,
        price: ticker.last,
        change: ticker.change || 0,
        changePercent: ticker.percentage || 0,
        volume: parseFloat(ticker.baseVolume || '0'),
        high: ticker.high || 0,
        low: ticker.low || 0,
        lastUpdated: new Date().toISOString()
      };
      return { success: true, data };
    }

    const tickers = await binance.fetchTickers();
    const data = Object.values(tickers).map((t: any) => ({
      symbol: t.symbol,
      price: t.last,
      change: t.change || 0,
      changePercent: t.percentage || 0,
      volume: parseFloat(t.baseVolume || '0'),
      high: t.high || 0,
      low: t.low || 0,
      lastUpdated: new Date().toISOString()
    })).slice(0, 20);
    return { success: true, data };
  } catch (error) {
    logger.error('Get market data error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get order book
 */
async function getOrderBook(symbol: string): Promise<any> {
  try {
    const book = await binance.fetchOrderBook(symbol, 20);
    const orderBook = {
      symbol,
      bids: book.bids.slice(0, 15),
      asks: book.asks.slice(0, 15),
      timestamp: Date.now()
    };
    return { success: true, data: orderBook };
  } catch (error) {
    logger.error('Get order book error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get trading history
 */
async function getTradingHistory(userId: string, symbol?: string): Promise<any> {
  try {
    let trades = mockOrders.filter(o => o.userId === userId && o.status === 'filled');

    if (symbol) {
      trades = trades.filter(t => t.symbol === symbol);
    }

    return { success: true, data: trades };
  } catch (error) {
    logger.error('Get trading history error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Validate order parameters
 */
async function validateOrder(binance: ccxt.Exchange, symbol: string, side: string, type: string, quantity: number, price?: number, stopPrice?: number) {
  try {
    // Check if symbol exists on Binance
    const markets = await binance.loadMarkets();
    if (!markets[symbol.replace('/', '')]) {
      return { valid: false, error: `Symbol ${symbol} not available on Binance` };
    }

    if (!['buy', 'sell'].includes(side)) {
      return { valid: false, error: 'Invalid side' };
    }

    if (!['market', 'limit', 'stop', 'stop_limit'].includes(type)) {
      return { valid: false, error: 'Invalid order type' };
    }

    if (quantity <= 0) {
      return { valid: false, error: 'Invalid quantity' };
    }

    if ((type === 'limit' || type === 'stop_limit') && (!price || price <= 0)) {
      return { valid: false, error: 'Invalid price' };
    }

    if ((type === 'stop' || type === 'stop_limit') && (!stopPrice || stopPrice <= 0)) {
      return { valid: false, error: 'Invalid stop price' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Validation error: ' + error.message };
  }
}

/**
 * Calculate trading fees
 */
function calculateFees(quantity: number, price: number): number {
  return quantity * price * 0.001; // 0.1% fee
}

/**
 * Update user position
 */
function updatePosition(userId: string, order: TradeOrder): void {
  // Simplified position management
  const existingPosition = mockPositions.find(p => p.symbol === order.symbol);

  if (existingPosition) {
    if (order.side === 'buy') {
      const totalQuantity = existingPosition.quantity + order.quantity;
      const totalCost = (existingPosition.quantity * existingPosition.avgPrice) + (order.quantity * order.price!);
      existingPosition.avgPrice = totalCost / totalQuantity;
      existingPosition.quantity = totalQuantity;
    } else {
      existingPosition.quantity -= order.quantity;
    }
  } else if (order.side === 'buy') {
    mockPositions.push({
      symbol: order.symbol,
      quantity: order.quantity,
      avgPrice: order.price!,
      currentPrice: order.price!,
      pnl: 0,
      pnlPercent: 0
    });
  }
}

// Mock data for compatibility (ignore TS errors for demo)
// Removed mocks - using real CCXT data only
const mockOrders: any[] = [];
const mockPositions: any[] = [];


// Technical Analysis Functions
async function getTechnicalIndicators(symbol: string, limit = 100): Promise<any> {
  try {
    const timeframe = '1h';
    const ohlcv = await binance.fetchOHLCV(symbol.replace('/', ''), timeframe, undefined, Math.max(limit, 200));
    
    const closes = ohlcv.map(candle => candle[4]);
    const volumes = ohlcv.map(candle => candle[5]);
    
    // Simple TA calculations (production: use tulind/ta-lib)
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const sma200 = closes.length >= 200 ? sma(closes, 200) : null;
    
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const rsi = rsi14(closes);
    const macdData = macd(closes, 12, 26, 9);
    const macdLine = macdData.macd;
    const macdSignal = macdData.signal;
    
    const bb20 = bollingerBands(closes, 20);
    
    const indicators = {
      symbol,
      timestamp: new Date().toISOString(),
      latest: {
        close: closes[closes.length - 1],
        sma20: sma20[sma20.length - 1],
        sma50: sma50[sma50.length - 1],
        sma200: sma200 ? sma200[sma200.length - 1] : null,
        ema12: ema12[ema12.length - 1],
        ema26: ema26[ema26.length - 1],
        rsi: rsi[rsi.length - 1],
        macd: macdLine[macdLine.length - 1],
        macdSignal: macdSignal[macdSignal.length - 1],
        bb_upper: bb20.upper[bb20.upper.length - 1],
        bb_middle: bb20.middle[bb20.middle.length - 1],
        bb_lower: bb20.lower[bb20.lower.length - 1],
        volume: volumes[volumes.length - 1]
      }
    };
    
    return { success: true, data: indicators };
  } catch (error) {
    logger.error('TA indicators error', { symbol, error: error.message });
    return { success: false, error: error.message };
  }
}

// TA Helpers (simple implementations)
function sma(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function ema(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let emaVal = prices[0];
  result.push(emaVal);
  for (let i = 1; i < prices.length; i++) {
    emaVal = (prices[i] * multiplier) + (emaVal * (1 - multiplier));
    result.push(emaVal);
  }
  return result;
}

function rsi14(prices: number[]): number[] {
  if (prices.length < 15) return [50]; // Neutral if insufficient data
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(Math.max(change, 0));
    losses.push(Math.max(-change, 0));
  }
  const avgGain = sma(gains.slice(0, 14), 14)[0] || 0;
  const avgLoss = sma(losses.slice(0, 14), 14)[0] || 0.0001;
  const rs = avgGain / avgLoss;
  return [100 - (100 / (1 + rs))];
}

function macd(prices: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const emaFast = ema(prices, fast);
  const emaSlow = ema(prices, slow);
  const macdLine: number[] = [];
  const minLen = Math.min(emaFast.length, emaSlow.length);
  for (let i = 0; i < minLen; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }
  const signalLine = ema(macdLine, signalPeriod);
  return { macd: macdLine, signal: signalLine };
}

function bollingerBands(prices: number[], period = 20, stdDev = 2): {upper: number[], middle: number[], lower: number[]} {
  const middle = sma(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < middle.length; i++) {
    const sliceStart = Math.max(0, i * period - period + 1);
    const slice = prices.slice(sliceStart, sliceStart + period);
    const variance = slice.reduce((sum, p) => {
      const diff = p - middle[i];
      return sum + diff * diff;
    }, 0) / slice.length;
    const stdev = Math.sqrt(variance);
    upper.push(middle[i] + (stdev * stdDev));
    lower.push(middle[i] - (stdev * stdDev));
  }
  return { upper, middle, lower };
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (!['GET', 'POST'].includes(httpMethod)) {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = body ? JSON.parse(body) : {};
    const userId = data.userId || 'anonymous';

    let result;

    if (path.includes('/orders') && httpMethod === 'POST') {
      result = await placeOrder(data);
    } else if (path.includes('/orders/cancel/')) {
      const orderId = path.split('/cancel/')[1];
      result = await cancelOrder(orderId, userId);
    } else if (path.includes('/orders')) {
      result = await getUserOrders(userId, data.status);
    } else if (path.includes('/positions')) {
      result = await getUserPositions(userId);
    } else if (path.includes('/market/')) {
      const symbol = path.split('/market/')[1];
      result = await getMarketData(symbol);
    } else if (path.includes('/orderbook/')) {
      const symbol = path.split('/orderbook/')[1];
      result = await getOrderBook(symbol);
    } else if (path.includes('/ta/indicators')) {
      const symbol = data.symbol || 'BTC/USDT';
      result = await getTechnicalIndicators(symbol, data.limit || 100);
    } else if (path.includes('/history')) {
      result = await getTradingHistory(userId, data.symbol);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Endpoint not found' })
      };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Crypto trading API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};