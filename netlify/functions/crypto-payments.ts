/**
 * Crypto Payments API for SmartInvest
 * Handles cryptocurrency payment intents and wallet operations
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface CryptoPaymentIntent {
  id: string;
  amount: number;
  currency: string;
  cryptoCurrency: 'btc' | 'eth' | 'usdc' | 'usdt';
  walletAddress: string;
  status: 'pending' | 'received' | 'confirmed' | 'failed';
  userId: string;
  txHash?: string;
  createdAt: string;
  expiresAt: string;
}

interface WalletBalance {
  currency: string;
  balance: number;
  address: string;
}

// Mock data - replace with real crypto wallet integration
const mockCryptoPayments: CryptoPaymentIntent[] = [];
const mockWalletBalances: WalletBalance[] = [
  { currency: 'btc', balance: 0.05, address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
  { currency: 'eth', balance: 2.5, address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
  { currency: 'usdc', balance: 1000, address: '0xA0b86a33E6441e88C5F2712C3E9b74F5F5F5F5F5' }
];

/**
 * Create crypto payment intent
 */
async function createCryptoPaymentIntent(data: any): Promise<any> {
  try {
    const { amount, currency, cryptoCurrency, userId } = data;

    // Generate unique wallet address for this payment
    const walletAddress = generateWalletAddress(cryptoCurrency);

    const intent: CryptoPaymentIntent = {
      id: `crypto_${Date.now()}`,
      amount,
      currency: currency || 'usd',
      cryptoCurrency,
      walletAddress,
      status: 'pending',
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    };

    mockCryptoPayments.push(intent);

    logger.info('Crypto payment intent created', {
      intentId: intent.id,
      userId,
      cryptoCurrency,
      amount
    });

    return { success: true, data: intent };
  } catch (error) {
    logger.error('Create crypto intent error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Check crypto payment status
 */
async function checkCryptoPaymentStatus(intentId: string): Promise<any> {
  try {
    const intent = mockCryptoPayments.find(p => p.id === intentId);
    if (!intent) {
      return { success: false, error: 'Payment intent not found' };
    }

    // Simulate blockchain confirmation
    if (intent.status === 'pending' && Math.random() > 0.7) {
      intent.status = 'received';
      intent.txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    }

    if (intent.status === 'received' && Math.random() > 0.8) {
      intent.status = 'confirmed';
    }

    return { success: true, data: intent };
  } catch (error) {
    logger.error('Check crypto status error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get wallet balances
 */
async function getWalletBalances(userId: string): Promise<any> {
  try {
    // In production, get real balances from wallet service
    return { success: true, data: mockWalletBalances };
  } catch (error) {
    logger.error('Get wallet balances error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Send crypto payment
 */
async function sendCryptoPayment(data: any): Promise<any> {
  try {
    const { fromCurrency, toAddress, amount, userId } = data;

    // Simulate crypto transfer
    const wallet = mockWalletBalances.find(w => w.currency === fromCurrency);
    if (!wallet || wallet.balance < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    wallet.balance -= amount;

    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    logger.info('Crypto payment sent', { userId, fromCurrency, toAddress, amount, txHash });

    return { success: true, data: { txHash, amount, toAddress } };
  } catch (error) {
    logger.error('Send crypto payment error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get crypto exchange rates
 */
async function getExchangeRates(): Promise<any> {
  try {
    // Mock exchange rates - in production, fetch from crypto API
    const rates = {
      btc_usd: 45000,
      eth_usd: 3000,
      usdc_usd: 1,
      usdt_usd: 1,
      lastUpdated: new Date().toISOString()
    };

    return { success: true, data: rates };
  } catch (error) {
    logger.error('Get exchange rates error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Convert fiat to crypto amount
 */
async function convertToCrypto(data: any): Promise<any> {
  try {
    const { fiatAmount, fiatCurrency, cryptoCurrency } = data;

    const rates = await getExchangeRates();
    if (!rates.success) {
      return rates;
    }

    const rateKey = `${cryptoCurrency.toLowerCase()}_${fiatCurrency.toLowerCase()}`;
    const rate = rates.data[rateKey];

    if (!rate) {
      return { success: false, error: 'Exchange rate not available' };
    }

    const cryptoAmount = fiatAmount / rate;

    return { success: true, data: { cryptoAmount, rate, fiatAmount } };
  } catch (error) {
    logger.error('Convert to crypto error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Generate mock wallet address
 */
function generateWalletAddress(cryptoCurrency: string): string {
  const prefixes = {
    btc: '1',
    eth: '0x',
    usdc: '0x',
    usdt: '0x'
  };

  const prefix = prefixes[cryptoCurrency as keyof typeof prefixes] || '0x';
  return prefix + Math.random().toString(36).substr(2, 40);
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (httpMethod !== 'POST' && httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = body ? JSON.parse(body) : {};
    const userId = data.userId || 'anonymous';

    let result;

    if (path.includes('/create-intent')) {
      result = await createCryptoPaymentIntent(data);
    } else if (path.includes('/status/')) {
      const intentId = path.split('/status/')[1];
      result = await checkCryptoPaymentStatus(intentId);
    } else if (path.includes('/balances')) {
      result = await getWalletBalances(userId);
    } else if (path.includes('/send')) {
      result = await sendCryptoPayment(data);
    } else if (path.includes('/rates')) {
      result = await getExchangeRates();
    } else if (path.includes('/convert')) {
      result = await convertToCrypto(data);
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
    logger.error('Crypto payments API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};