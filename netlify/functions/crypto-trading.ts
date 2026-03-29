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

    // Validate order
    const validation = validateOrder(symbol, side, type, quantity, price, stopPrice);
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

    // Simulate order execution for market orders
    if (type === 'market') {
      const marketData = mockMarketData[symbol];
      if (marketData) {
        order.status = 'filled';
        order.filledQuantity = quantity;
        order.remainingQuantity = 0;
        order.price = marketData.price;
        order.fees = calculateFees(quantity, marketData.price);

        // Update position
        updatePosition(userId, order);
      }
    }

    logger.info('Order placed', {
      transactionId: transaction.id,
      userId,
      symbol,
      side,
      quantity,
      execPrice
    });

    return { success: true, data: transaction };
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
function validateOrder(symbol: string, side: string, type: string, quantity: number, price?: number, stopPrice?: number) {
  if (!mockMarketData[symbol]) {
    return { valid: false, error: 'Invalid symbol' };
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