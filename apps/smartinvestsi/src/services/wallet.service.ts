import { prisma } from "../lib/prisma";

export async function getWallets(userId: string) {
  return prisma.wallet.findMany({ where: { userId } });
}

export async function getWalletTransactions(userId: string, walletId: string) {
  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!wallet) {
    const err = new Error("Wallet not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return prisma.walletTransaction.findMany({
    where: { walletId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createDeposit(params: {
  userId: string;
  currency: string;
  amount: number;
  referenceId?: string;
  description?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId_currency: { userId: params.userId, currency: params.currency } },
      create: {
        userId: params.userId,
        currency: params.currency,
        balance: params.amount,
        availableBalance: params.amount,
      },
      update: {
        balance: { increment: params.amount },
        availableBalance: { increment: params.amount },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: params.amount,
        balanceBefore: wallet.balance - params.amount,
        balanceAfter: wallet.balance,
        currency: params.currency,
        description: params.description ?? "Deposit",
        referenceId: params.referenceId,
      },
    });

    return wallet;
  });
}

export async function createWithdrawal(params: {
  userId: string;
  currency: string;
  amount: number;
  description?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { userId_currency: { userId: params.userId, currency: params.currency } },
    });
    if (!wallet) {
      const err = new Error("Wallet not found") as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    if (wallet.availableBalance < params.amount) {
      const err = new Error("Insufficient available balance") as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: params.amount },
        availableBalance: { decrement: params.amount },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAWAL",
        amount: -params.amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - params.amount,
        currency: params.currency,
        description: params.description ?? "Withdrawal",
      },
    });

    return updated;
  });
}

export async function getWalletBalance(userId: string, currency = "USD") {
  const wallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId, currency } },
  });
  return wallet ?? { balance: 0, availableBalance: 0, currency };
}
