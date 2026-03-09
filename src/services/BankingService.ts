// src/services/BankingService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../lib/tier-access-control';

const prisma = new PrismaClient();

export class BankingService {
  
  async linkBankAccount(userEmail: string, data: {
    accountNumber: string;
    routingNumber: string;
    accountType: string;
    bankName: string;
  }) {
    const access = await checkFeatureAccess(userEmail, 'banking.instantDeposits');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    // Mask account number (show last 4)
    const maskedNumber = '****' + data.accountNumber.slice(-4);

    const account = await prisma.bankAccount.create({
      data: {
        userEmail,
        accountNumber: data.accountNumber, // Should be encrypted in production
        maskedAccountNumber: maskedNumber,
        routingNumber: data.routingNumber,
        accountType: data.accountType as any,
        bankName: data.bankName,
        status: 'PENDING_VERIFICATION'
      }
    });

    // In production, initiate micro-deposit verification
    return {
      ...account,
      accountNumber: undefined // Don't return full account number
    };
  }

  async verifyBankAccount(accountId: string, userEmail: string, amounts: number[]) {
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, userEmail }
    });

    if (!account) {
      throw new Error('Bank account not found');
    }

    if (account.status !== 'PENDING_VERIFICATION') {
      throw new Error('Account not in verification state');
    }

    // In production, verify the micro-deposit amounts
    // For now, just mark as verified
    await prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date()
      }
    });

    return { success: true, message: 'Bank account verified' };
  }

  async getBankAccounts(userEmail: string) {
    return await prisma.bankAccount.findMany({
      where: { userEmail },
      select: {
        id: true,
        bankName: true,
        maskedAccountNumber: true,
        accountType: true,
        status: true,
        isPrimary: true,
        createdAt: true,
        verifiedAt: true
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async setPrimaryAccount(accountId: string, userEmail: string) {
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, userEmail }
    });

    if (!account) {
      throw new Error('Bank account not found');
    }

    if (account.status !== 'VERIFIED') {
      throw new Error('Can only set verified accounts as primary');
    }

    // Remove primary from all accounts
    await prisma.bankAccount.updateMany({
      where: { userEmail, isPrimary: true },
      data: { isPrimary: false }
    });

    // Set new primary
    await prisma.bankAccount.update({
      where: { id: accountId },
      data: { isPrimary: true }
    });

    return { success: true };
  }

  async initiateDeposit(userEmail: string, amount: number, accountId?: string) {
    const access = await checkFeatureAccess(userEmail, 'banking.instantDeposits');
    
    let account;
    if (accountId) {
      account = await prisma.bankAccount.findFirst({
        where: { id: accountId, userEmail, status: 'VERIFIED' }
      });
    } else {
      account = await prisma.bankAccount.findFirst({
        where: { userEmail, status: 'VERIFIED', isPrimary: true }
      });
    }

    if (!account) {
      throw new Error('No verified bank account found');
    }

    const deposit = await prisma.bankTransfer.create({
      data: {
        userEmail,
        accountId: account.id,
        type: 'DEPOSIT',
        amount,
        currency: 'USD',
        status: 'PENDING',
        // Instant deposits for premium users
        estimatedArrival: access.allowed 
          ? new Date() 
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }
    });

    return deposit;
  }

  async initiateWithdrawal(userEmail: string, amount: number, accountId?: string) {
    let account;
    if (accountId) {
      account = await prisma.bankAccount.findFirst({
        where: { id: accountId, userEmail, status: 'VERIFIED' }
      });
    } else {
      account = await prisma.bankAccount.findFirst({
        where: { userEmail, status: 'VERIFIED', isPrimary: true }
      });
    }

    if (!account) {
      throw new Error('No verified bank account found');
    }

    const withdrawal = await prisma.bankTransfer.create({
      data: {
        userEmail,
        accountId: account.id,
        type: 'WITHDRAWAL',
        amount,
        currency: 'USD',
        status: 'PENDING',
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    });

    return withdrawal;
  }

  async getTransfers(userEmail: string) {
    return await prisma.bankTransfer.findMany({
      where: { userEmail },
      include: {
        account: {
          select: {
            bankName: true,
            maskedAccountNumber: true
          }
        }
      },
      orderBy: { initiatedAt: 'desc' },
      take: 50
    });
  }
}
