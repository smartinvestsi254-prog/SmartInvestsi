// src/utils/reconciliation-error-handler.ts
// Automatic reconciliation and error recovery for financial transactions

import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ReconciliationResult {
  success: boolean;
  reconciled: number;
  errors: object[];
  timestamp: string;
}

/**
 * Automatic reconciliation of failed or pending transactions
 * Attempts to restore consistency between payment records and actual transfers
 */
export async function autoReconcileTransactions(): Promise<ReconciliationResult> {
  const errors: object[] = [];
  let reconciled = 0;

  try {
    // Step 1: Find pending transactions older than 24 hours
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
    });

    console.log(`[Reconciliation] Found ${pendingTransactions.length} stale pending transactions`);

    for (const txn of pendingTransactions) {
      try {
        // Attempt to verify status with payment provider
        const verified = await verifyTransactionStatus(txn.id, txn.provider);

        if (verified.status !== 'PENDING') {
          // Update local record to match provider
          await prisma.transaction.update({
            where: { id: txn.id },
            data: {
              status: verified.status,
              providerReference: verified.reference,
              updatedAt: new Date(),
            },
          });

          reconciled++;
          console.log(`[Reconciliation] Updated transaction ${txn.id} to ${verified.status}`);
        }
      } catch (err) {
        errors.push({
          transactionId: txn.id,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        });

        console.error(`[Reconciliation Error] Failed to reconcile ${txn.id}:`, err);
      }
    }

    // Step 2: Check for orphaned records (payment exists but no transaction record)
    const orphanPayments = await findOrphanPayments();
    for (const payment of orphanPayments) {
      try {
        // Create matching transaction record
        await prisma.transaction.create({
          data: {
            userId: payment.userId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            provider: payment.provider,
            providerReference: payment.providerReference,
            type: 'PAYMENT',
          },
        });

        reconciled++;
        console.log(`[Reconciliation] Created missing transaction for payment ${payment.id}`);
      } catch (err) {
        errors.push({
          paymentId: payment.id,
          error: err instanceof Error ? err.message : String(err),
          type: 'ORPHAN_PAYMENT',
        });
      }
    }

    // Step 3: Validate account balances
    const balanceErrors = await validateAccountBalances();
    if (balanceErrors.length > 0) {
      errors.push(...balanceErrors);
      console.warn(`[Reconciliation] Found ${balanceErrors.length} balance inconsistencies`);
    }

    return {
      success: errors.length === 0,
      reconciled,
      errors,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[Reconciliation] Fatal error:', err);
    throw err;
  }
}

/**
 * Verify a transaction status with the payment provider
 */
async function verifyTransactionStatus(
  transactionId: string,
  provider: string
): Promise<{ status: string; reference: string }> {
  // Implement provider-specific status checks
  // This is a stub; actual implementation depends on payment provider APIs

  switch (provider) {
    case 'MPESA':
      return await verifyMpesaStatus(transactionId);
    case 'STRIPE':
      return await verifyStripeStatus(transactionId);
    case 'PAYPAL':
      return await verifyPayPalStatus(transactionId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function verifyMpesaStatus(txnId: string): Promise<{ status: string; reference: string }> {
  // M-Pesa status verification
  // Query M-Pesa API or webhook logs
  return { status: 'COMPLETED', reference: txnId };
}

async function verifyStripeStatus(txnId: string): Promise<{ status: string; reference: string }> {
  // Stripe status verification
  // Query Stripe API
  return { status: 'COMPLETED', reference: txnId };
}

async function verifyPayPalStatus(txnId: string): Promise<{ status: string; reference: string }> {
  // PayPal status verification
  // Query PayPal API
  return { status: 'COMPLETED', reference: txnId };
}

/**
 * Find payment records that don't have matching transactions
 */
async function findOrphanPayments(): Promise<any[]> {
  // Query payments without matching transaction records
  // Implement based on your schema
  return [];
}

/**
 * Validate account balances across user accounts
 */
async function validateAccountBalances(): Promise<object[]> {
  const errors: object[] = [];

  const users = await prisma.user.findMany({
    include: {
      wallets: true,
      transactions: true,
    },
  });

  for (const user of users) {
    const calculatedBalance = calculateBalance(user.transactions || []);
    const storedBalance = user.wallets?.[0]?.balance ?? 0;

    if (Math.abs(calculatedBalance - storedBalance) > 0.01) {
      // Allow for floating-point rounding errors
      errors.push({
        userId: user.id,
        storedBalance,
        calculatedBalance,
        discrepancy: calculatedBalance - storedBalance,
      });

      console.warn(`[Reconciliation] Balance mismatch for user ${user.id}`);
    }
  }

  return errors;
}

function calculateBalance(transactions: any[]): number {
  return transactions.reduce((sum, txn) => {
    const amount = txn.type === 'DEPOSIT' ? txn.amount : -txn.amount;
    return sum + amount;
  }, 0);
}

/**
 * Handle failed transactions with automatic retry logic
 */
export async function handleFailedTransaction(
  transactionId: string,
  maxRetries = 3
): Promise<boolean> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        console.error(`[Error Handler] Transaction not found: ${transactionId}`);
        return false;
      }

      if (transaction.status === 'COMPLETED') {
        return true; // Already successful
      }

      // Attempt retry
      retries++;
      console.log(`[Error Handler] Retry attempt ${retries}/${maxRetries} for ${transactionId}`);

      // Implement provider-specific retry logic here
      const result = await retryTransaction(transaction);

      if (result.success) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            retryCount: retries,
          },
        });

        console.log(`[Error Handler] Successfully recovered transaction ${transactionId}`);
        return true;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, retries - 1) * 1000)
      );
    } catch (err) {
      console.error(`[Error Handler] Retry ${retries} failed:`, err);

      if (retries >= maxRetries) {
        // Max retries exceeded; escalate
        await escalateTransactionError(transactionId, err);
        return false;
      }
    }
  }

  return false;
}

async function retryTransaction(transaction: any): Promise<{ success: boolean }> {
  // Implement provider-specific retry logic
  return { success: false };
}

async function escalateTransactionError(transactionId: string, error: any): Promise<void> {
  // Log for manual review, send alert to admin
  console.error(`[Escalation] Transaction ${transactionId} requires manual review:`, error);

  // Send alert email to admin (would use sendEmail function)
  // await sendEmail(adminEmail, `Transaction Error: ${transactionId}`, errorDetails);
}

export default {
  autoReconcileTransactions,
  handleFailedTransaction,
};
