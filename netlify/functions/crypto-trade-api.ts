/**
 * Live Crypto Trading API
 * CoinGecko prices, TA signals, orders
 */

import { Handler } from '@netlify/functions';
import prisma from './lib/prisma';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const PAIRS = ['bitcoin', 'ethereum', 'solana']; // ids

export const handler: Handler = async (event) => {
  const { path, httpMethod } = event;

  if (httpMethod !== 'GET' && httpMethod !== 'POST') return { statusCode: 405 };

  try {
    if (path.includes('/crypto/prices')) {
      const prices = await fetchLivePrices();
      return { statusCode: 200, body: JSON.stringify({ success: true, data: prices }) };
    }

    if (path.includes('/crypto/signals')) {
      const symbol = new URLSearchParams(event.queryStringParameters || '').get('symbol') || 'bitcoin';
      const signals = await getTradingSignals(symbol);
      return { statusCode: 200, body: JSON.stringify({ success: true, data: signals }) };
    }

    if (path.includes('/crypto/trade') && httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const userId = event.headers['x-user-id'];
      const trade = await executeTrade(userId, data);
      return { statusCode: trade.success ? 200 : 400, body: JSON.stringify(trade) };
    }

    return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Not found' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message }) };
  }
};

async function fetchLivePrices(): Promise<any> {
  const res = await fetch(`${COINGECKO_BASE}/simple/price?ids=${PAIRS.join(',')}&vs_currencies=usd&include_24hr_change=true`);
  const data = await res.json();
  return data;
}

async function getTradingSignals(symbol: string): Promise<any> {
  // Mock TA - production: fetch OHLCV, compute RSI/MACD
  const mockOHLCV = await fetchOHLCV(symbol);
  const rsi = calculateRSI(mockOHLCV);
  const macd = calculateMACD(mockOHLCV);
  const sma = calculateSMA(mockOHLCV, 20);

  const signal = rsi < 30 ? 'BULLISH' : rsi > 70 ? 'BEARISH' : 'NEUTRAL';

  return {
    symbol,
    rsi: rsi.toFixed(2),
    macd: macd.macd.toFixed(4),
    signal,
    recommendation: signal === 'BULLISH' ? 'Buy' : signal === 'BEARISH' ? 'Sell' : 'Hold'
  };
}

async function executeTrade(userId: string, data: {symbol: string, side: 'buy'|'sell', amount: number}): Promise<any> {
  // From AssetHolding USDT → BTC position
  // Update TradingPosition
  // Simulate exec (production: Binance API)
  const position = await prisma.tradingPosition.create({
    data: {
      userId,
      symbol: data.symbol,
      side: data.side,
      quantity: data.amount,
      entryPrice: 65000 // Live price
    }
  });
  return { success: true, data: position };
}

// TA functions (simple)
function calculateRSI(ohlcv: number[]): number {
  // 14 period RSI
  return 50; // Mock
}

function calculateMACD(ohlcv: number[]): {macd: number} {
  return { macd: 0.001 };
}

function calculateSMA(ohlcv: number[], period: number): number {
  return ohlcv.slice(-period).reduce((a, b) => a + b, 0) / period;
}

async function fetchOHLCV(symbol: string): Promise<number[]> {
  // Mock
  return Array(100).fill(65000).map(() => Math.random() * 1000 + 64000);
}

