/**
 * Banking Trial System API for SmartInvest
 * Trial banking with P2P transactions and withdrawals, self-updating with unique user IDs
 */

import { Handler } from '@netlify/functions';
import logger from './logger';
import { withPolicyCompliance } from './policy-compliance';

interface TrialUser {
  trialId: string; // Unique, clear ID like "SI-TRIAL-12345"
  userId: string; // Link to main user account
  balance: {
    USD: number;
    EUR: number;
    KES: number;
    BTC: number;
    ETH: number;
  };
  transactionHistory: TrialTransaction[];
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
  trialEndsAt: string; // 30 days from creation
}

interface TrialTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'p2p_transfer' | 'currency_exchange';
  amount: number;
  currency: string;
  fromTrialId?: string;
  toTrialId?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  fee?: number;
  exchangeRate?: number;
}

interface WithdrawalRequest {
  id: string;
  trialId: string;
  amount: number;
  currency: string;
  method: 'bank_transfer' | 'mobile_money' | 'crypto_wallet';
  destination: string; // Account number, phone, or wallet address
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

// Mock data - replace with real database
const mockTrialUsers: TrialUser[] = [];
const mockTransactions: TrialTransaction[] = [];
const mockWithdrawals: WithdrawalRequest[] = [];

// Trial settings
const TRIAL_DURATION_DAYS = 30;
const INITIAL_BALANCE = {
  USD: 1000,
  EUR: 850,
  KES: 150000,
  BTC: 0.05,
  ETH: 0.5
};

const WITHDRAWAL_FEES = {
  bank_transfer: { USD: 5, EUR: 4, KES: 100 },
  mobile_money: { USD: 2, EUR: 1.5, KES: 50 },
  crypto_wallet: { BTC: 0.0001, ETH: 0.001 }
};

const EXCHANGE_RATES = {
  USD_EUR: 0.85,
  USD_KES: 150,
  BTC_USD: 50000,
  ETH_USD: 3000
};

/**
 * Generate unique trial ID
 */
function generateTrialId(): string {
  const counter = mockTrialUsers.length + 1;
  return `SI-TRIAL-${counter.toString().padStart(5, '0')}`;
}

/**
 * Create trial account for user
 */
async function createTrialAccount(userId: string): Promise<any> {
  try {
    // Check if user already has a trial account
    const existingTrial = mockTrialUsers.find(t => t.userId === userId && t.isActive);
    if (existingTrial) {
      return { success: false, error: 'User already has an active trial account' };
    }

    const trialId = generateTrialId();
    const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const trialUser: TrialUser = {
      trialId,
      userId,
      balance: { ...INITIAL_BALANCE },
      transactionHistory: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true,
      trialEndsAt
    };

    mockTrialUsers.push(trialUser);

    // Add initial deposit transaction
    const initialDeposit: TrialTransaction = {
      id: `txn_${Date.now()}_initial`,
      type: 'deposit',
      amount: INITIAL_BALANCE.USD,
      currency: 'USD',
      description: 'Trial account initial balance',
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    trialUser.transactionHistory.push(initialDeposit);
    mockTransactions.push(initialDeposit);

    logger.info('Trial account created', { userId, trialId });

    return { success: true, data: trialUser };
  } catch (error) {
    logger.error('Create trial account error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get trial account details
 */
async function getTrialAccount(userId: string): Promise<any> {
  try {
    const trialUser = mockTrialUsers.find(t => t.userId === userId && t.isActive);

    if (!trialUser) {
      return { success: false, error: 'No active trial account found' };
    }

    // Self-update: Check if trial has expired
    if (new Date() > new Date(trialUser.trialEndsAt)) {
      trialUser.isActive = false;
      logger.info('Trial account expired', { userId, trialId: trialUser.trialId });
    }

    return { success: true, data: trialUser };
  } catch (error) {
    logger.error('Get trial account error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Perform P2P transfer
 */
async function p2pTransfer(fromUserId: string, toTrialId: string, amount: number, currency: string, description: string): Promise<any> {
  try {
    const fromTrial = mockTrialUsers.find(t => t.userId === fromUserId && t.isActive);
    const toTrial = mockTrialUsers.find(t => t.trialId === toTrialId && t.isActive);

    if (!fromTrial) {
      return { success: false, error: 'Sender trial account not found or inactive' };
    }

    if (!toTrial) {
      return { success: false, error: 'Recipient trial account not found or inactive' };
    }

    if (fromTrial.balance[currency as keyof typeof fromTrial.balance] < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Perform transfer
    fromTrial.balance[currency as keyof typeof fromTrial.balance] -= amount;
    toTrial.balance[currency as keyof typeof toTrial.balance] += amount;

    fromTrial.lastActivity = new Date().toISOString();
    toTrial.lastActivity = new Date().toISOString();

    // Create transaction records
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const debitTransaction: TrialTransaction = {
      id: `${transactionId}_debit`,
      type: 'p2p_transfer',
      amount: -amount,
      currency,
      toTrialId,
      description: `Transfer to ${toTrialId}: ${description}`,
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    const creditTransaction: TrialTransaction = {
      id: `${transactionId}_credit`,
      type: 'p2p_transfer',
      amount,
      currency,
      fromTrialId: fromTrial.trialId,
      description: `Transfer from ${fromTrial.trialId}: ${description}`,
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    fromTrial.transactionHistory.push(debitTransaction);
    toTrial.transactionHistory.push(creditTransaction);

    mockTransactions.push(debitTransaction, creditTransaction);

    logger.info('P2P transfer completed', { fromUserId, toTrialId, amount, currency });

    return { success: true, data: { debitTransaction, creditTransaction } };
  } catch (error) {
    logger.error('P2P transfer error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Request withdrawal
 */
async function requestWithdrawal(userId: string, amount: number, currency: string, method: string, destination: string): Promise<any> {
  try {
    const trialUser = mockTrialUsers.find(t => t.userId === userId && t.isActive);

    if (!trialUser) {
      return { success: false, error: 'Trial account not found or inactive' };
    }

    if (trialUser.balance[currency as keyof typeof trialUser.balance] < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Calculate fee
    let fee = 0;
    if (method === 'bank_transfer' && WITHDRAWAL_FEES.bank_transfer[currency as keyof typeof WITHDRAWAL_FEES.bank_transfer]) {
      fee = WITHDRAWAL_FEES.bank_transfer[currency as keyof typeof WITHDRAWAL_FEES.bank_transfer];
    } else if (method === 'mobile_money' && WITHDRAWAL_FEES.mobile_money[currency as keyof typeof WITHDRAWAL_FEES.mobile_money]) {
      fee = WITHDRAWAL_FEES.mobile_money[currency as keyof typeof WITHDRAWAL_FEES.mobile_money];
    } else if (method === 'crypto_wallet') {
      if (currency === 'BTC' && WITHDRAWAL_FEES.crypto_wallet.BTC) {
        fee = WITHDRAWAL_FEES.crypto_wallet.BTC;
      } else if (currency === 'ETH' && WITHDRAWAL_FEES.crypto_wallet.ETH) {
        fee = WITHDRAWAL_FEES.crypto_wallet.ETH;
      }
    }

    const totalAmount = amount + fee;

    if (trialUser.balance[currency as keyof typeof trialUser.balance] < totalAmount) {
      return { success: false, error: 'Insufficient balance including fees' };
    }

    const withdrawal: WithdrawalRequest = {
      id: `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trialId: trialUser.trialId,
      amount,
      currency,
      method: method as any,
      destination,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    mockWithdrawals.push(withdrawal);

    logger.info('Withdrawal requested', { userId, trialId: trialUser.trialId, amount, currency, method });

    return { success: true, data: withdrawal };
  } catch (error) {
    logger.error('Request withdrawal error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get withdrawal requests
 */
async function getWithdrawalRequests(userId: string): Promise<any> {
  try {
    const trialUser = mockTrialUsers.find(t => t.userId === userId && t.isActive);

    if (!trialUser) {
      return { success: false, error: 'Trial account not found' };
    }

    const withdrawals = mockWithdrawals.filter(w => w.trialId === trialUser.trialId);

    return { success: true, data: withdrawals };
  } catch (error) {
    logger.error('Get withdrawal requests error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Currency exchange
 */
async function exchangeCurrency(userId: string, fromCurrency: string, toCurrency: string, amount: number): Promise<any> {
  try {
    const trialUser = mockTrialUsers.find(t => t.userId === userId && t.isActive);

    if (!trialUser) {
      return { success: false, error: 'Trial account not found or inactive' };
    }

    if (trialUser.balance[fromCurrency as keyof typeof trialUser.balance] < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Calculate exchange rate
    let exchangeRate = 1;
    if (fromCurrency === 'USD' && toCurrency === 'EUR') {
      exchangeRate = EXCHANGE_RATES.USD_EUR;
    } else if (fromCurrency === 'USD' && toCurrency === 'KES') {
      exchangeRate = EXCHANGE_RATES.USD_KES;
    } else if (fromCurrency === 'BTC' && toCurrency === 'USD') {
      exchangeRate = 1 / EXCHANGE_RATES.BTC_USD;
    } else if (fromCurrency === 'ETH' && toCurrency === 'USD') {
      exchangeRate = 1 / EXCHANGE_RATES.ETH_USD;
    } else {
      return { success: false, error: 'Currency pair not supported' };
    }

    const convertedAmount = fromCurrency === 'USD' ? amount * exchangeRate : amount / exchangeRate;

    // Perform exchange
    trialUser.balance[fromCurrency as keyof typeof trialUser.balance] -= amount;
    trialUser.balance[toCurrency as keyof typeof trialUser.balance] += convertedAmount;

    trialUser.lastActivity = new Date().toISOString();

    // Create transaction record
    const transaction: TrialTransaction = {
      id: `txn_${Date.now()}_exchange`,
      type: 'currency_exchange',
      amount: -amount,
      currency: fromCurrency,
      description: `Exchanged ${amount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency}`,
      status: 'completed',
      timestamp: new Date().toISOString(),
      exchangeRate
    };

    trialUser.transactionHistory.push(transaction);
    mockTransactions.push(transaction);

    logger.info('Currency exchange completed', { userId, fromCurrency, toCurrency, amount, convertedAmount });

    return { success: true, data: { transaction, convertedAmount } };
  } catch (error) {
    logger.error('Exchange currency error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get transaction history
 */
async function getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<any> {
  try {
    const trialUser = mockTrialUsers.find(t => t.userId === userId && t.isActive);

    if (!trialUser) {
      return { success: false, error: 'Trial account not found' };
    }

    const transactions = trialUser.transactionHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit);

    return {
      success: true,
      data: transactions,
      pagination: {
        total: trialUser.transactionHistory.length,
        limit,
        offset,
        hasMore: offset + limit < trialUser.transactionHistory.length
      }
    };
  } catch (error) {
    logger.error('Get transaction history error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Self-update system (simulate periodic updates)
 */
async function selfUpdateTrialAccounts(): Promise<any> {
  try {
    const now = new Date();
    let updatedCount = 0;

    mockTrialUsers.forEach(trial => {
      if (trial.isActive && now > new Date(trial.trialEndsAt)) {
        trial.isActive = false;
        updatedCount++;
        logger.info('Trial account auto-expired', { trialId: trial.trialId });
      }
    });

    // Simulate interest accrual (for demo)
    mockTrialUsers.forEach(trial => {
      if (trial.isActive) {
        const interest = trial.balance.USD * 0.001; // 0.1% daily interest
        trial.balance.USD += interest;

        const interestTransaction: TrialTransaction = {
          id: `txn_${Date.now()}_interest`,
          type: 'deposit',
          amount: interest,
          currency: 'USD',
          description: 'Daily interest accrual',
          status: 'completed',
          timestamp: new Date().toISOString()
        };

        trial.transactionHistory.push(interestTransaction);
        mockTransactions.push(interestTransaction);
      }
    });

    return { success: true, data: { updatedAccounts: updatedCount, interestAccrued: mockTrialUsers.filter(t => t.isActive).length } };
  } catch (error) {
    logger.error('Self-update error', { error: error.message });
    return { success: false, error: error.message };
  }
}

export const handler: Handler = withPolicyCompliance(async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (!['GET', 'POST', 'PUT'].includes(httpMethod)) {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = body ? JSON.parse(body) : {};
    const userId = data.userId || 'anonymous';

    let result;

    if (path.includes('/trial/create') && httpMethod === 'POST') {
      result = await createTrialAccount(userId);
    } else if (path.includes('/trial/account') && httpMethod === 'GET') {
      result = await getTrialAccount(userId);
    } else if (path.includes('/trial/transfer') && httpMethod === 'POST') {
      const { toTrialId, amount, currency, description } = data;
      if (!toTrialId || !amount || !currency) {
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, error: 'Recipient trial ID, amount, and currency are required' })
        };
      }
      result = await p2pTransfer(userId, toTrialId, amount, currency, description || 'P2P Transfer');
    } else if (path.includes('/trial/withdraw') && httpMethod === 'POST') {
      const { amount, currency, method, destination } = data;
      if (!amount || !currency || !method || !destination) {
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, error: 'Amount, currency, method, and destination are required' })
        };
      }
      result = await requestWithdrawal(userId, amount, currency, method, destination);
    } else if (path.includes('/trial/withdrawals') && httpMethod === 'GET') {
      result = await getWithdrawalRequests(userId);
    } else if (path.includes('/trial/exchange') && httpMethod === 'POST') {
      const { fromCurrency, toCurrency, amount } = data;
      if (!fromCurrency || !toCurrency || !amount) {
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, error: 'From currency, to currency, and amount are required' })
        };
      }
      result = await exchangeCurrency(userId, fromCurrency, toCurrency, amount);
    } else if (path.includes('/trial/transactions') && httpMethod === 'GET') {
      const limit = parseInt(new URLSearchParams(path.split('?')[1] || '').get('limit') || '50');
      const offset = parseInt(new URLSearchParams(path.split('?')[1] || '').get('offset') || '0');
      result = await getTransactionHistory(userId, limit, offset);
    } else if (path.includes('/trial/self-update') && httpMethod === 'POST') {
      result = await selfUpdateTrialAccounts();
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Banking Trial API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
}, 'banking-trial', true);