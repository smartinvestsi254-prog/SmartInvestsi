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

// Mock data - replace with real trading engine
const mockOrders: TradeOrder[] = [];
const mockPositions: Position[] = [];
const mockMarketData: { [symbol: string]: MarketData } = {
  'BTC/USD': {
    symbol: 'BTC/USD',
    price: 45000,
    change: 500,
    changePercent: 1.12,
    volume: 1250000,
    high: 46000,
    low: 44000,
    lastUpdated: new Date().toISOString()
  },
  'ETH/USD': {
    symbol: 'ETH/USD',
    price: 3000,
    change: -50,
    changePercent: -1.64,
    volume: 850000,
    high: 3100,
    low: 2950,
    lastUpdated: new Date().toISOString()
  }
};

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

    mockOrders.push(order);

    logger.info('Order placed', {
      orderId: order.id,
      userId,
      symbol,
      side,
      quantity,
      type
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
    let orders = mockOrders.filter(o => o.userId === userId);

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

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
    // In production, calculate from actual trades
    return { success: true, data: mockPositions };
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
      const data = mockMarketData[symbol];
      if (!data) {
        return { success: false, error: 'Symbol not found' };
      }
      return { success: true, data };
    }

    return { success: true, data: Object.values(mockMarketData) };
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
    // Mock order book data
    const orderBook = {
      symbol,
      bids: [
        [mockMarketData[symbol]?.price - 10, 1.5],
        [mockMarketData[symbol]?.price - 20, 2.0],
        [mockMarketData[symbol]?.price - 30, 1.8]
      ],
      asks: [
        [mockMarketData[symbol]?.price + 10, 1.2],
        [mockMarketData[symbol]?.price + 20, 2.5],
        [mockMarketData[symbol]?.price + 30, 1.9]
      ],
      lastUpdated: new Date().toISOString()
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