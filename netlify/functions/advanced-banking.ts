/**
 * Advanced Banking System API for SmartInvest
 * Closed-loop currency system with P2P transactions, verified deposits/withdrawals,
 * and sophisticated balance management like private financial companies
 */

import { Handler } from '@netlify/functions';
import logger from './logger';
import { withPolicyCompliance } from './policy-compliance';

interface BankAccount {
  accountId: string; // Unique account ID like "SI-ACCT-XXXXX"
  userId: string;
  ownerId: string; // User who owns this account
  accountType: 'checking' | 'savings' | 'investment';
  currency: string;
  balance: number;
  availableBalance: number; // Balance minus holds
  accountStatus: 'active' | 'frozen' | 'closed';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycLevel: 'basic' | 'advanced' | 'premium';
  transactionPin?: string; // Hashed PIN for transaction approval
  pinAttempts: number; // Failed PIN attempts counter
  pinLockedUntil?: string; // When PIN is locked due to failed attempts
  createdAt: string;
  lastActivity: string;
  holds: AccountHold[];
}

interface AccountHold {
  holdId: string;
  amount: number;
  reason: 'pending_transaction' | 'fraud_review' | 'regulatory_hold';
  expiresAt: string;
  createdAt: string;
}

interface P2PTransaction {
  transactionId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'auto_approved';
  fee: number;
  exchangeRate?: number;
  pinVerified: boolean; // Whether PIN was verified for auto-approval
  autoApproved: boolean; // Whether transaction was auto-approved with PIN
  createdAt: string;
  completedAt?: string;
  reference: string;
}

interface DepositWithdrawal {
  requestId: string;
  accountId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  method: 'bank_transfer' | 'mobile_money' | 'crypto_wallet';
  externalAccount: {
    accountNumber?: string;
    bankName?: string;
    phoneNumber?: string;
    walletAddress?: string;
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocuments: string[]; // URLs to uploaded documents
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

interface UserVerification {
  userId: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
  addressVerified: boolean;
  kycDocuments: {
    idDocument?: string;
    addressProof?: string;
    selfie?: string;
  };
  verificationLevel: 'none' | 'basic' | 'advanced' | 'premium';
  lastVerificationUpdate: string;
}

interface BankingWorkflow {
  stepId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  requiredActions: string[];
  estimatedCompletion: string;
  dependencies: string[];
}

interface AccountSummary {
  accountId: string;
  accountType: string;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  pendingTransactions: number;
  lastTransaction: {
    amount: number;
    description: string;
    timestamp: string;
  } | null;
  monthlySpending: number;
  accountHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

// Mock data - replace with real database
const mockAccounts: BankAccount[] = [];
const mockTransactions: P2PTransaction[] = [];
const mockDepositWithdrawals: DepositWithdrawal[] = [];
const mockVerifications: UserVerification[] = [];
const mockWorkflows: BankingWorkflow[] = [];

// System constants
const VERIFICATION_REQUIREMENTS = {
  deposit: {
    minAmount: 100,
    maxDaily: 10000,
    requiresId: true,
    requiresAddress: false
  },
  withdrawal: {
    minAmount: 50,
    maxDaily: 5000,
    requiresId: true,
    requiresAddress: true
  }
};

const TRANSACTION_FEES = {
  p2p: { percentage: 0.5, min: 0.01, max: 10 },
  deposit: { percentage: 1.0, min: 1, max: 50 },
  withdrawal: { percentage: 2.0, min: 2, max: 100 }
};

const CURRENCY_CONFIG = {
  USD: { symbol: '$', decimals: 2, minTransaction: 0.01 },
  EUR: { symbol: '€', decimals: 2, minTransaction: 0.01 },
  KES: { symbol: 'KSh', decimals: 2, minTransaction: 1 },
  BTC: { symbol: '₿', decimals: 8, minTransaction: 0.00000001 },
  ETH: { symbol: 'Ξ', decimals: 6, minTransaction: 0.000001 }
};

// PIN Security Configuration
const PIN_CONFIG = {
  minLength: 4,
  maxLength: 6,
  maxAttempts: 3,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  hashRounds: 12
};

/**
 * Generate unique account ID
 */
function generateAccountId(): string {
  const counter = mockAccounts.length + 1;
  return `SI-ACCT-${counter.toString().padStart(5, '0')}`;
}

/**
 * Generate transaction reference
 */
function generateTransactionRef(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

/**
 * Hash PIN using simple hash (in production, use bcrypt)
 */
function hashPin(pin: string): string {
  // Simple hash for demo - in production use proper hashing
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Verify PIN
 */
function verifyPin(hashedPin: string, inputPin: string): boolean {
  return hashedPin === hashPin(inputPin);
}

/**
 * Check if PIN is locked
 */
function isPinLocked(account: BankAccount): boolean {
  if (!account.pinLockedUntil) return false;
  return new Date(account.pinLockedUntil) > new Date();
}

/**
 * Handle failed PIN attempt
 */
function handleFailedPinAttempt(account: BankAccount): void {
  account.pinAttempts += 1;

  if (account.pinAttempts >= PIN_CONFIG.maxAttempts) {
    account.pinLockedUntil = new Date(Date.now() + PIN_CONFIG.lockoutDuration).toISOString();
    account.pinAttempts = 0; // Reset attempts after lockout
  }
}

/**
 * Reset PIN attempts on successful verification
 */
function resetPinAttempts(account: BankAccount): void {
  account.pinAttempts = 0;
  account.pinLockedUntil = undefined;
}

/**
 * Create bank account for user
 */
async function createBankAccount(data: any): Promise<any> {
  try {
    const { userId, accountType, currency } = data;

    // Check if user already has this type of account
    const existingAccount = mockAccounts.find(
      a => a.userId === userId && a.accountType === accountType && a.currency === currency && a.accountStatus === 'active'
    );

    if (existingAccount) {
      return { success: false, error: 'Account type already exists for this currency' };
    }

    const accountId = generateAccountId();
    const account: BankAccount = {
      accountId,
      userId,
      ownerId: userId, // Account is owned by the user
      accountType,
      currency,
      balance: 0,
      availableBalance: 0,
      accountStatus: 'active',
      verificationStatus: 'unverified',
      kycLevel: 'basic',
      pinAttempts: 0,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      holds: []
    };

    mockAccounts.push(account);

    // Create initial workflow
    const workflow: BankingWorkflow = {
      stepId: `workflow_${accountId}_setup`,
      title: 'Account Setup & Verification',
      description: 'Complete account setup and verification process',
      status: 'in_progress',
      requiredActions: [
        'Verify email address',
        'Complete basic KYC',
        'Set up transaction PIN for auto-approval',
        'Link external accounts for deposits/withdrawals'
      ],
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      dependencies: []
    };

    mockWorkflows.push(workflow);

    logger.info('Bank account created', { userId, accountId, accountType, currency });

    return { success: true, data: { account, workflow } };
  } catch (error) {
    logger.error('Create bank account error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user accounts
 */
async function getUserAccounts(userId: string): Promise<any> {
  try {
    const accounts = mockAccounts.filter(a => a.userId === userId);

    // Calculate available balances (balance minus holds)
    accounts.forEach(account => {
      const totalHolds = account.holds
        .filter(hold => new Date(hold.expiresAt) > new Date())
        .reduce((sum, hold) => sum + hold.amount, 0);
      account.availableBalance = account.balance - totalHolds;
    });

    return { success: true, data: accounts };
  } catch (error) {
    logger.error('Get user accounts error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get account summary (sophisticated display)
 */
async function getAccountSummary(userId: string, accountId: string): Promise<any> {
  try {
    const account = mockAccounts.find(a => a.accountId === accountId && a.userId === userId);

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Get recent transactions
    const accountTransactions = mockTransactions.filter(
      t => t.fromAccountId === accountId || t.toAccountId === accountId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const lastTransaction = accountTransactions[0] ? {
      amount: accountTransactions[0].fromAccountId === accountId ? -accountTransactions[0].amount : accountTransactions[0].amount,
      description: accountTransactions[0].description,
      timestamp: accountTransactions[0].createdAt
    } : null;

    // Calculate monthly spending (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyTransactions = accountTransactions.filter(
      t => new Date(t.createdAt) > thirtyDaysAgo && t.fromAccountId === accountId
    );
    const monthlySpending = monthlyTransactions.reduce((sum, t) => sum + t.amount + t.fee, 0);

    // Calculate account health
    let accountHealth: AccountSummary['accountHealth'] = 'excellent';
    const pendingCount = accountTransactions.filter(t => t.status === 'pending').length;

    if (pendingCount > 5 || monthlySpending > account.balance * 0.8) {
      accountHealth = 'poor';
    } else if (pendingCount > 2 || monthlySpending > account.balance * 0.5) {
      accountHealth = 'fair';
    } else if (pendingCount > 0 || monthlySpending > account.balance * 0.2) {
      accountHealth = 'good';
    }

    const summary: AccountSummary = {
      accountId: account.accountId,
      accountType: account.accountType,
      currency: account.currency,
      currentBalance: account.balance,
      availableBalance: account.availableBalance,
      pendingTransactions: pendingCount,
      lastTransaction,
      monthlySpending,
      accountHealth
    };

    return { success: true, data: summary };
  } catch (error) {
    logger.error('Get account summary error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * P2P Transfer with PIN-based auto-approval (user-owned system)
 */
async function p2pTransfer(data: any): Promise<any> {
  try {
    const { userId, fromAccountId, toAccountId, amount, description, pin } = data;

    const fromAccount = mockAccounts.find(a => a.accountId === fromAccountId && a.ownerId === userId);
    const toAccount = mockAccounts.find(a => a.accountId === toAccountId);

    if (!fromAccount) {
      return { success: false, error: 'Source account not found or access denied' };
    }

    if (!toAccount) {
      return { success: false, error: 'Destination account not found' };
    }

    if (fromAccount.accountStatus !== 'active' || toAccount.accountStatus !== 'active') {
      return { success: false, error: 'One or both accounts are not active' };
    }

    if (fromAccount.currency !== toAccount.currency) {
      return { success: false, error: 'Cross-currency transfers not supported in closed-loop system' };
    }

    // Check if PIN is set up for auto-approval
    if (!fromAccount.transactionPin) {
      return { success: false, error: 'Transaction PIN not set up. Please set up PIN in account settings for auto-approval.' };
    }

    // Check PIN lockout
    if (isPinLocked(fromAccount)) {
      const lockoutTime = new Date(fromAccount.pinLockedUntil!).getTime() - Date.now();
      const minutesLeft = Math.ceil(lockoutTime / (60 * 1000));
      return { success: false, error: `PIN locked due to failed attempts. Try again in ${minutesLeft} minutes.` };
    }

    // Verify PIN for auto-approval
    let pinVerified = false;
    let autoApproved = false;

    if (pin) {
      pinVerified = verifyPin(fromAccount.transactionPin, pin);

      if (pinVerified) {
        resetPinAttempts(fromAccount);
        autoApproved = true;
      } else {
        handleFailedPinAttempt(fromAccount);
        const attemptsLeft = PIN_CONFIG.maxAttempts - fromAccount.pinAttempts;
        return {
          success: false,
          error: `Invalid PIN. ${attemptsLeft} attempts remaining before lockout.`,
          attemptsLeft
        };
      }
    }

    // Calculate fee
    const fee = Math.min(Math.max(amount * (TRANSACTION_FEES.p2p.percentage / 100), TRANSACTION_FEES.p2p.min), TRANSACTION_FEES.p2p.max);
    const totalAmount = amount + fee;

    if (fromAccount.availableBalance < totalAmount) {
      return { success: false, error: 'Insufficient available balance' };
    }

    // Create transaction
    const transaction: P2PTransaction = {
      transactionId: generateTransactionRef(),
      fromAccountId,
      toAccountId,
      amount,
      currency: fromAccount.currency,
      description: description || 'P2P Transfer',
      status: autoApproved ? 'auto_approved' : 'pending',
      fee,
      pinVerified,
      autoApproved,
      createdAt: new Date().toISOString(),
      reference: generateTransactionRef()
    };

    mockTransactions.push(transaction);

    // If auto-approved with PIN, process immediately
    if (autoApproved) {
      transaction.status = 'completed';
      transaction.completedAt = new Date().toISOString();

      fromAccount.balance -= totalAmount;
      toAccount.balance += amount;

      fromAccount.lastActivity = new Date().toISOString();
      toAccount.lastActivity = new Date().toISOString();

      logger.info('P2P transfer auto-approved with PIN', {
        transactionId: transaction.transactionId,
        userId,
        amount
      });
    } else {
      // Simulate processing for non-auto-approved transfers
      setTimeout(() => {
        transaction.status = 'completed';
        transaction.completedAt = new Date().toISOString();

        fromAccount.balance -= totalAmount;
        toAccount.balance += amount;

        fromAccount.lastActivity = new Date().toISOString();
        toAccount.lastActivity = new Date().toISOString();

        logger.info('P2P transfer completed', { transactionId: transaction.transactionId });
      }, 2000); // Simulate 2-second processing
    }

    logger.info('P2P transfer initiated', {
      userId,
      fromAccountId,
      toAccountId,
      amount,
      autoApproved,
      pinVerified
    });

    return {
      success: true,
      data: {
        ...transaction,
        message: autoApproved ? 'Transfer auto-approved and completed instantly!' : 'Transfer initiated and pending approval'
      }
    };
  } catch (error) {
    logger.error('P2P transfer error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Set up transaction PIN for auto-approval
 */
async function setupTransactionPin(data: any): Promise<any> {
  try {
    const { userId, accountId, pin, confirmPin } = data;

    const account = mockAccounts.find(a => a.accountId === accountId && a.ownerId === userId);

    if (!account) {
      return { success: false, error: 'Account not found or access denied' };
    }

    if (account.transactionPin) {
      return { success: false, error: 'PIN already set up. Use change PIN function instead.' };
    }

    // Validate PIN
    if (!pin || pin.length < PIN_CONFIG.minLength || pin.length > PIN_CONFIG.maxLength) {
      return {
        success: false,
        error: `PIN must be between ${PIN_CONFIG.minLength} and ${PIN_CONFIG.maxLength} digits`
      };
    }

    if (!/^\d+$/.test(pin)) {
      return { success: false, error: 'PIN must contain only numbers' };
    }

    if (pin !== confirmPin) {
      return { success: false, error: 'PIN confirmation does not match' };
    }

    // Hash and store PIN
    account.transactionPin = hashPin(pin);
    account.pinAttempts = 0;
    account.pinLockedUntil = undefined;

    // Update workflow if PIN setup was required
    const workflow = mockWorkflows.find(w => w.stepId === `workflow_${accountId}_setup`);
    if (workflow) {
      workflow.requiredActions = workflow.requiredActions.filter(action => !action.includes('Set up transaction PIN'));
      if (workflow.requiredActions.length === 0) {
        workflow.status = 'completed';
      }
    }

    logger.info('Transaction PIN set up', { userId, accountId });

    return {
      success: true,
      message: 'Transaction PIN set up successfully. You can now use PIN for auto-approved transfers.',
      data: { pinSet: true }
    };
  } catch (error) {
    logger.error('Setup PIN error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Change transaction PIN
 */
async function changeTransactionPin(data: any): Promise<any> {
  try {
    const { userId, accountId, currentPin, newPin, confirmNewPin } = data;

    const account = mockAccounts.find(a => a.accountId === accountId && a.ownerId === userId);

    if (!account) {
      return { success: false, error: 'Account not found or access denied' };
    }

    if (!account.transactionPin) {
      return { success: false, error: 'No PIN set up. Use setup PIN function first.' };
    }

    // Check PIN lockout
    if (isPinLocked(account)) {
      const lockoutTime = new Date(account.pinLockedUntil!).getTime() - Date.now();
      const minutesLeft = Math.ceil(lockoutTime / (60 * 1000));
      return { success: false, error: `PIN locked. Try again in ${minutesLeft} minutes.` };
    }

    // Verify current PIN
    if (!verifyPin(account.transactionPin, currentPin)) {
      handleFailedPinAttempt(account);
      const attemptsLeft = PIN_CONFIG.maxAttempts - account.pinAttempts;
      return {
        success: false,
        error: `Current PIN incorrect. ${attemptsLeft} attempts remaining.`,
        attemptsLeft
      };
    }

    // Validate new PIN
    if (!newPin || newPin.length < PIN_CONFIG.minLength || newPin.length > PIN_CONFIG.maxLength) {
      return {
        success: false,
        error: `New PIN must be between ${PIN_CONFIG.minLength} and ${PIN_CONFIG.maxLength} digits`
      };
    }

    if (!/^\d+$/.test(newPin)) {
      return { success: false, error: 'New PIN must contain only numbers' };
    }

    if (newPin !== confirmNewPin) {
      return { success: false, error: 'New PIN confirmation does not match' };
    }

    if (verifyPin(account.transactionPin, newPin)) {
      return { success: false, error: 'New PIN cannot be the same as current PIN' };
    }

    // Update PIN
    account.transactionPin = hashPin(newPin);
    resetPinAttempts(account);

    logger.info('Transaction PIN changed', { userId, accountId });

    return {
      success: true,
      message: 'Transaction PIN changed successfully.',
      data: { pinChanged: true }
    };
  } catch (error) {
    logger.error('Change PIN error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Reset PIN attempts (admin function)
 */
async function resetPinAttemptsAdmin(data: any): Promise<any> {
  try {
    const { userId, accountId, adminPin } = data;

    // Simple admin PIN check (in production, use proper admin auth)
    if (adminPin !== 'ADMIN_RESET_2024') {
      return { success: false, error: 'Invalid admin PIN' };
    }

    const account = mockAccounts.find(a => a.accountId === accountId);

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    resetPinAttempts(account);

    logger.info('PIN attempts reset by admin', { userId, accountId });

    return {
      success: true,
      message: 'PIN attempts reset successfully.',
      data: { reset: true }
    };
  } catch (error) {
    logger.error('Reset PIN attempts error', { error: error.message });
    return { success: false, error: error.message };
  }
}
  try {
    const { userId, accountId, type, amount, currency, method, externalAccount } = data;

    const account = mockAccounts.find(a => a.accountId === accountId && a.userId === userId);

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    if (account.accountStatus !== 'active') {
      return { success: false, error: 'Account is not active' };
    }

    // Verification requirements
    const requirements = VERIFICATION_REQUIREMENTS[type];

    if (amount < requirements.minAmount) {
      return { success: false, error: `Minimum ${type} amount is ${CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG].symbol}${requirements.minAmount}` };
    }

    // Check daily limits (simplified)
    const today = new Date().toDateString();
    const todayRequests = mockDepositWithdrawals.filter(
      r => r.accountId === accountId &&
           r.type === type &&
           new Date(r.createdAt).toDateString() === today &&
           r.status !== 'cancelled'
    );

    const todayTotal = todayRequests.reduce((sum, r) => sum + r.amount, 0);

    if (todayTotal + amount > requirements.maxDaily) {
      return { success: false, error: `Daily ${type} limit exceeded. Maximum: ${CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG].symbol}${requirements.maxDaily}` };
    }

    // Create request
    const request: DepositWithdrawal = {
      requestId: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      accountId,
      type,
      amount,
      currency,
      method,
      externalAccount,
      verificationStatus: 'pending',
      verificationDocuments: [],
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    mockDepositWithdrawals.push(request);

    // Create verification workflow
    const workflow: BankingWorkflow = {
      stepId: `workflow_${request.requestId}_verification`,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Verification`,
      description: `Complete verification process for ${type} request`,
      status: 'pending',
      requiredActions: [
        'Upload ID document',
        'Verify account ownership',
        ...(requirements.requiresAddress ? ['Upload address proof'] : [])
      ],
      estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      dependencies: [`workflow_${accountId}_setup`]
    };

    mockWorkflows.push(workflow);

    logger.info(`${type} request created`, { userId, accountId, requestId: request.requestId, amount });

    return { success: true, data: { request, workflow } };
  } catch (error) {
    logger.error('Request deposit/withdrawal error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Upload verification documents
 */
async function uploadVerificationDocuments(data: any): Promise<any> {
  try {
    const { userId, requestId, documentType, documentUrl } = data;

    const request = mockDepositWithdrawals.find(r => r.requestId === requestId);
    const account = mockAccounts.find(a => a.accountId === request?.accountId && a.userId === userId);

    if (!request || !account) {
      return { success: false, error: 'Request not found or access denied' };
    }

    // In production, validate document type and upload to secure storage
    request.verificationDocuments.push(documentUrl);

    // Auto-verify for demo (in production, manual review required)
    if (request.verificationDocuments.length >= 2) { // ID + optional address
      request.verificationStatus = 'verified';
      request.status = 'processing';

      // Simulate processing
      setTimeout(() => {
        request.status = 'completed';
        request.processedAt = new Date().toISOString();

        if (request.type === 'deposit') {
          account.balance += request.amount;
        } else {
          const fee = Math.min(Math.max(request.amount * (TRANSACTION_FEES.withdrawal.percentage / 100), TRANSACTION_FEES.withdrawal.min), TRANSACTION_FEES.withdrawal.max);
          account.balance -= (request.amount + fee);
        }

        account.lastActivity = new Date().toISOString();

        logger.info(`${request.type} processed`, { requestId, accountId: account.accountId, amount: request.amount });
      }, 5000); // Simulate 5-second processing
    }

    return { success: true, data: request };
  } catch (error) {
    logger.error('Upload verification documents error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get transaction history
 */
async function getTransactionHistory(userId: string, accountId?: string, limit = 50, offset = 0): Promise<any> {
  try {
    let transactions = mockTransactions.filter(
      t => mockAccounts.find(a => a.accountId === t.fromAccountId && a.userId === userId) ||
           mockAccounts.find(a => a.accountId === t.toAccountId && a.userId === userId)
    );

    if (accountId) {
      transactions = transactions.filter(
        t => t.fromAccountId === accountId || t.toAccountId === accountId
      );
    }

    // Add account context
    const transactionsWithContext = transactions.map(t => ({
      ...t,
      isDebit: mockAccounts.find(a => a.accountId === t.fromAccountId && a.userId === userId) !== undefined,
      otherParty: t.fromAccountId === accountId ?
        mockAccounts.find(a => a.accountId === t.toAccountId)?.accountId :
        mockAccounts.find(a => a.accountId === t.fromAccountId)?.accountId
    }));

    const paginated = transactionsWithContext
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    return {
      success: true,
      data: paginated,
      pagination: {
        total: transactionsWithContext.length,
        limit,
        offset,
        hasMore: offset + limit < transactionsWithContext.length
      }
    };
  } catch (error) {
    logger.error('Get transaction history error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get banking workflows
 */
async function getBankingWorkflows(userId: string): Promise<any> {
  try {
    // Get workflows related to user's accounts
    const userAccountIds = mockAccounts.filter(a => a.userId === userId).map(a => a.accountId);
    const workflows = mockWorkflows.filter(w =>
      userAccountIds.some(accountId => w.stepId.includes(accountId)) ||
      w.dependencies.some(dep => userAccountIds.some(accountId => dep.includes(accountId)))
    );

    return { success: true, data: workflows };
  } catch (error) {
    logger.error('Get banking workflows error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update user verification
 */
async function updateUserVerification(data: any): Promise<any> {
  try {
    const { userId, emailVerified, phoneVerified, idVerified, addressVerified, kycDocuments } = data;

    let verification = mockVerifications.find(v => v.userId === userId);

    if (!verification) {
      verification = {
        userId,
        emailVerified: false,
        phoneVerified: false,
        idVerified: false,
        addressVerified: false,
        kycDocuments: {},
        verificationLevel: 'none',
        lastVerificationUpdate: new Date().toISOString()
      };
      mockVerifications.push(verification);
    }

    // Update verification status
    Object.assign(verification, {
      emailVerified: emailVerified ?? verification.emailVerified,
      phoneVerified: phoneVerified ?? verification.phoneVerified,
      idVerified: idVerified ?? verification.idVerified,
      addressVerified: addressVerified ?? verification.addressVerified,
      kycDocuments: { ...verification.kycDocuments, ...kycDocuments },
      lastVerificationUpdate: new Date().toISOString()
    });

    // Calculate verification level
    let level: UserVerification['verificationLevel'] = 'none';
    if (verification.emailVerified) level = 'basic';
    if (verification.emailVerified && verification.phoneVerified) level = 'advanced';
    if (verification.emailVerified && verification.phoneVerified && verification.idVerified) level = 'premium';

    verification.verificationLevel = level;

    // Update account verification status
    const userAccounts = mockAccounts.filter(a => a.userId === userId);
    userAccounts.forEach(account => {
      account.verificationStatus = verification!.idVerified ? 'verified' : 'pending';
      account.kycLevel = verification!.verificationLevel;
    });

    logger.info('User verification updated', { userId, verificationLevel: level });

    return { success: true, data: verification };
  } catch (error) {
    logger.error('Update user verification error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user verification status
 */
async function getUserVerification(userId: string): Promise<any> {
  try {
    let verification = mockVerifications.find(v => v.userId === userId);

    if (!verification) {
      verification = {
        userId,
        emailVerified: false,
        phoneVerified: false,
        idVerified: false,
        addressVerified: false,
        kycDocuments: {},
        verificationLevel: 'none',
        lastVerificationUpdate: new Date().toISOString()
      };
      mockVerifications.push(verification);
    }

    return { success: true, data: verification };
  } catch (error) {
    logger.error('Get user verification error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get deposit/withdrawal requests
 */
async function getDepositWithdrawalRequests(userId: string): Promise<any> {
  try {
    const userAccountIds = mockAccounts.filter(a => a.userId === userId).map(a => a.accountId);
    const requests = mockDepositWithdrawals.filter(r => userAccountIds.includes(r.accountId));

    return { success: true, data: requests };
  } catch (error) {
    logger.error('Get deposit/withdrawal requests error', { error: error.message });
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

    if (path.includes('/banking/accounts') && httpMethod === 'POST') {
      result = await createBankAccount(data);
    } else if (path.includes('/banking/accounts') && httpMethod === 'GET') {
      result = await getUserAccounts(userId);
    } else if (path.includes('/banking/summary/') && httpMethod === 'GET') {
      const accountId = path.split('/banking/summary/')[1].split('/')[0];
      result = await getAccountSummary(userId, accountId);
    } else if (path.includes('/banking/transfer') && httpMethod === 'POST') {
      result = await p2pTransfer(data);
    } else if (path.includes('/banking/deposit-withdrawal') && httpMethod === 'POST') {
      result = await requestDepositWithdrawal(data);
    } else if (path.includes('/banking/upload-documents') && httpMethod === 'POST') {
      result = await uploadVerificationDocuments(data);
    } else if (path.includes('/banking/transactions') && httpMethod === 'GET') {
      const accountId = new URLSearchParams(path.split('?')[1] || '').get('accountId');
      const limit = parseInt(new URLSearchParams(path.split('?')[1] || '').get('limit') || '50');
      const offset = parseInt(new URLSearchParams(path.split('?')[1] || '').get('offset') || '0');
      result = await getTransactionHistory(userId, accountId, limit, offset);
    } else if (path.includes('/banking/workflows') && httpMethod === 'GET') {
      result = await getBankingWorkflows(userId);
    } else if (path.includes('/banking/verification') && httpMethod === 'GET') {
      result = await getUserVerification(userId);
    } else if (path.includes('/banking/verification') && httpMethod === 'PUT') {
      result = await updateUserVerification(data);
    } else if (path.includes('/banking/requests') && httpMethod === 'GET') {
      result = await getDepositWithdrawalRequests(userId);
    } else if (path.includes('/banking/setup-pin') && httpMethod === 'POST') {
      result = await setupTransactionPin(data);
    } else if (path.includes('/banking/change-pin') && httpMethod === 'POST') {
      result = await changeTransactionPin(data);
    } else if (path.includes('/banking/reset-pin-attempts') && httpMethod === 'POST') {
      result = await resetPinAttemptsAdmin(data);
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
    logger.error('Advanced Banking API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
}, 'advanced-banking', true);