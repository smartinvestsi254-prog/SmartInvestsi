/**
 * Advanced Banking System API for SmartInvest - Enhanced with DB, Limits, Confidentiality
 */

import { Handler } from '@netlify/functions';
import prisma from './lib/prisma';
import { hashPin, verifyPin, generateTransactionRef, generateAccountId } from './utils/pin-utils';
import logger from './logger';
import { withPolicyCompliance } from './policy-compliance';
import prisma from './lib/prisma';
import { hashPin, verifyPin } from './utils/pin-utils'; // Assume utils created

const MAX_TXN_KES = 500000;
const CURRENCY_RATES = {
  KES: 1,
  USD: 130, // Approx KES per USD
  EUR: 143, // Approx
  BTC: 6500000, // Mock BTC in KES
  ETH: 390000 // Mock
};

const PIN_CONFIG = {
  minLength: 4,
  maxLength: 6,
  maxAttempts: 3,
  lockoutDuration: 15 * 60 * 1000,
};

// Auth guard
function getUserId(event: any, isAdminCheck = false): string | null {
  const userId = event.headers['x-user-id'] || event.headers['x-admin-id'];
  const role = event.headers['x-role'];
  if (!userId) return null;
  if (isAdminCheck && role !== 'ADMIN') return null;
  return userId;
}

// P2P limit check
function checkP2pLimit(amount: number, currency: string): {valid: boolean, error: string} {
  const kesEquivalent = amount * (CURRENCY_RATES[currency as keyof typeof CURRENCY_RATES] || 130);
  if (kesEquivalent > MAX_TXN_KES) {
    return {valid: false, error: `Transfer exceeds 500,000 KES limit (current: ${kesEquivalent.toLocaleString()} KES)`};
  }
  return {valid: true};
}

interface CreateAccountData {
  userId: string;
  accountType: string;
  currency: string;
}

// Generate account ID
function generateAccountId(): string {
  return `SI-ACCT-${Date.now().toString().slice(-5)}`;
}

// ... other helpers like hashPin from previous

export const handler: Handler = withPolicyCompliance(async (event) => {
  const { httpMethod, path, body, headers } = event;
  const clientUserId = getUserId(event);

  try {
    if (!['GET', 'POST', 'PUT'].includes(httpMethod)) return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };

    const data = body ? JSON.parse(body) : {};
    const userId = data.userId || clientUserId;

    if (!userId) return { statusCode: 401, body: JSON.stringify({ success: false, error: 'User ID required (x-user-id header)' }) };

    // Confidentiality: Check data.userId matches client unless admin
    const isAdmin = headers['x-role'] === 'ADMIN';
    if (!isAdmin && data.userId && data.userId !== userId) {
      return { statusCode: 403, body: JSON.stringify({ success: false, error: 'Access denied: Own data only' }) };
    }

    let result;

    switch (true) {
      case path.includes('/banking/accounts') && httpMethod === 'POST':
        result = await createBankAccount({ ...data, userId });
        break;
      case path.includes('/banking/accounts') && httpMethod === 'GET':
        result = await getUserAccounts(userId);
        break;
      case path.includes('/banking/summary/'):
        const accountId = path.split('/summary/')[1].split('/')[0];
        result = await getAccountSummary(userId, accountId);
        break;
      case path.includes('/banking/transfer') && httpMethod === 'POST':
        result = await p2pTransfer(data, userId);
        break;
      // Add other endpoints similarly with DB, limits
      case path.includes('/banking/assets'):
        result = await getUserAssets(userId);
        break;
      case path.includes('/banking/sync'):
        result = await syncBalances(userId);
        break;
      default:
        return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Endpoint not found' }) };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Banking API error', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Internal error' }) };
  }
}, 'advanced-banking', true);

async function createBankAccount(data: CreateAccountData): Promise<any> {
  try {
    const { userId, accountType, currency } = data;

    // Check existing
    const existing = await prisma.bankAccount.findFirst({
      where: { userId, accountType, currency, status: 'active' }
    });
    if (existing) return { success: false, error: 'Account exists' };

    const accountId = generateAccountId();

    const account = await prisma.bankAccount.create({
      data: {
        accountId,
        userId,
        type: accountType,
        currency,
        // other fields default
      }
    });

    logger.info('Account created', { userId, accountId });
    return { success: true, data: account };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getUserAccounts(userId: string): Promise<any> {
  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    include: { user: true }
  });

  // Calculate available
  for (const acc of accounts) {
    const holdsTotal = (acc.holds as any[]).reduce((sum, h: any) => new Date(h.expiresAt) > new Date() ? sum + h.amount : sum, 0);
    acc.availableBalance = acc.balance - holdsTotal;
  }

  return { success: true, data: accounts };
}

async function getAccountSummary(userId: string, accountId: string): Promise<any> {
  const account = await prisma.bankAccount.findFirst({
    where: { accountId, userId }
  });
  if (!account) return { success: false, error: 'Account not found' };

  // Recent txns
  const txns = await prisma.transaction.findMany({
    where: {
      OR: [{ fromAccountId: accountId }, { toAccountId: accountId }]
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  // Monthly spending etc (implement logic)

  const summary = { /* compute */ };
  return { success: true, data: summary };
}

async function p2pTransfer(data: any, clientUserId: string): Promise<any> {
  const { fromAccountId, toAccountId, amount, currency, description, pin } = data;

  // Auth check
  const fromAccount = await prisma.bankAccount.findFirst({
    where: { accountId: fromAccountId, userId: clientUserId }
  });
  const toAccount = await prisma.bankAccount.findFirst({
    where: { accountId: toAccountId }
  });

  if (!fromAccount || !toAccount) return { success: false, error: 'Account not found' };
  if (fromAccount.status !== 'active') return { success: false, error: 'Account inactive' };
  if (currency !== fromAccount.currency) return { success: false, error: 'Currency mismatch' };

  // P2P LIMIT
  const limitCheck = checkP2pLimit(amount, currency);
  if (!limitCheck.valid) return { success: false, error: limitCheck.error };

  // PIN verification
  if (!fromAccount.transactionPin) {
    return { success: false, error: 'Transaction PIN not set' };
  }
  const pinVerified = await verifyPin(fromAccount.transactionPin, data.pin);
  if (!pinVerified) {
    return { success: false, error: 'Invalid PIN' };
  }

  const fee = amount * 0.005; // 0.5%
  const total = amount + fee;
  if (fromAccount.availableBalance < total) return { success: false, error: 'Insufficient balance' };

  return await prisma.$transaction(async (tx) => {
    // Update balances
    await tx.bankAccount.update({
      where: { accountId: fromAccountId },
      data: { balance: { decrement: total }, lastActivity: new Date() }
    });
    await tx.bankAccount.update({
      where: { accountId: toAccountId },
      data: { balance: { increment: amount }, lastActivity: new Date() }
    });

    // Create txn
    const txn = await tx.transaction.create({
      data: {
        transactionId: generateTransactionRef(),
        userId: clientUserId,
        fromAccountId,
        toAccountId,
        amount,
        currency,
        description,
        status: 'completed',
        fee,
        pinVerified: true,
        autoApproved: true,
        reference: generateTransactionRef()
      }
    });

    // Update assets
    await tx.assetHolding.upsert({
      where: { userId_symbol: { userId: clientUserId, symbol: currency } },
      update: { quantity: { decrement: amount }, valueUSD: /* calc */ },
      create: { userId: clientUserId, assetType: 'cash', symbol: currency, quantity: -amount }
    });
    // Similar for toAccount user

    return { success: true, data: txn };
  });
}

async function getUserAssets(userId: string): Promise<any> {
  const assets = await prisma.assetHolding.findMany({ where: { userId } });
  return { success: true, data: assets };
}

async function syncBalances(userId: string): Promise<any> {
  // Reconciliation logic
  // Update valueUSD based on current rates
  // ... implement
  return { success: true, message: 'Balances synced' };
}

// Add other functions similarly (setupPin etc with prisma)

// Export handler

