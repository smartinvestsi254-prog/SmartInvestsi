// src/services/WalletService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../lib/tier-access-control';

const prisma = new PrismaClient();

export class WalletService {
  
  async createWallet(userEmail: string, currency: string) {
    const access = await checkFeatureAccess(userEmail, 'wallet.multiCurrency');
    if (!access.allowed && currency !== 'USD') {
      throw new Error(access.reason || 'Multi-currency wallets require premium');
    }

    const existing = await prisma.wallet.findUnique({
      where: {
        userEmail_currency: { userEmail, currency }
      }
    });

    if (existing) {
      return existing;
    }

    return await prisma.wallet.create({
      data: {
        userEmail,
        currency,
        balance: 0
      }
    });
  }

  async getWallets(userEmail: string) {
    return await prisma.wallet.findMany({
      where: { userEmail, isActive: true },
      orderBy: [
        { isPrimary: 'desc' },
        { currency: 'asc' }
      ]
    });
  }

  async getWallet(userEmail: string, currency: string) {
    let wallet = await prisma.wallet.findUnique({
      where: {
        userEmail_currency: { userEmail, currency }
      }
    });

    if (!wallet) {
      wallet = await this.createWallet(userEmail, currency);
    }

    return wallet;
  }

  async deposit(userEmail: string, amount: number, currency: string, source: string) {
    const wallet = await this.getWallet(userEmail, currency);

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: amount }
      }
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEPOSIT',
        amount,
        currency,
        description: `Deposit from ${source}`,
        status: 'COMPLETED'
      }
    });

    return { success: true, newBalance: wallet.balance + amount };
  }

  async withdraw(userEmail: string, amount: number, currency: string, destination: string) {
    const wallet = await this.getWallet(userEmail, currency);

    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: amount }
      }
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'WITHDRAWAL',
        amount,
        currency,
        description: `Withdrawal to ${destination}`,
        status: 'COMPLETED'
      }
    });

    return { success: true, newBalance: wallet.balance - amount };
  }

  async transfer(
    userEmail: string,
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    exchangeRate: number
  ) {
    const access = await checkFeatureAccess(userEmail, 'wallet.multiCurrency');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const fromWallet = await this.getWallet(userEmail, fromCurrency);
    const toWallet = await this.getWallet(userEmail, toCurrency);

    if (fromWallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const convertedAmount = amount * exchangeRate;

    // Deduct from source wallet
    await prisma.wallet.update({
      where: { id: fromWallet.id },
      data: { balance: { decrement: amount } }
    });

    // Add to destination wallet
    await prisma.wallet.update({
      where: { id: toWallet.id },
      data: { balance: { increment: convertedAmount } }
    });

    // Record transactions
    await prisma.walletTransaction.create({
      data: {
        walletId: fromWallet.id,
        type: 'TRANSFER_OUT',
        amount,
        currency: fromCurrency,
        description: `Transfer to ${toCurrency} wallet`,
        status: 'COMPLETED'
      }
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: toWallet.id,
        type: 'TRANSFER_IN',
        amount: convertedAmount,
        currency: toCurrency,
        description: `Transfer from ${fromCurrency} wallet`,
        status: 'COMPLETED'
      }
    });

    return {
      success: true,
      fromBalance: fromWallet.balance - amount,
      toBalance: toWallet.balance + convertedAmount
    };
  }

  async getTransactions(userEmail: string, currency?: string) {
    const where: any = {
      wallet: { userEmail }
    };

    if (currency) {
      where.currency = currency;
    }

    return await prisma.walletTransaction.findMany({
      where,
      include: {
        wallet: {
          select: {
            currency: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }
}
