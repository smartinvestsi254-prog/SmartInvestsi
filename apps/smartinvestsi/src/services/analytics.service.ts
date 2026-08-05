import { prisma } from "../lib/prisma";

export async function getAnalytics(params: { from?: string; to?: string }) {
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = params.to ? new Date(params.to) : new Date();

  const [signups, transactions, deposits, completedAmount, portfolioAgg] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.paymentTransaction.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.paymentTransaction.count({
      where: { createdAt: { gte: from, lte: to }, type: "DEPOSIT" },
    }),
    prisma.paymentTransaction.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.portfolio.aggregate({ _sum: { totalValue: true } }),
  ]);

  // Signups per day
  const signupsByDay = await prisma.user.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: { createdAt: true },
  });
  const dailySignups = signupsByDay.reduce<Record<string, number>>((acc, u) => {
    const day = u.createdAt.toISOString().split("T")[0];
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    signups,
    transactions,
    deposits,
    completedVolume: completedAmount._sum.amount ?? 0,
    totalPortfolioValue: portfolioAgg._sum.totalValue ?? 0,
    dailySignups,
  };
}

export async function getRevenueAnalytics(params: { from?: string; to?: string }) {
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const to = params.to ? new Date(params.to) : new Date();

  const completed = await prisma.paymentTransaction.findMany({
    where: { status: "COMPLETED", createdAt: { gte: from, lte: to } },
    select: { amount: true, currency: true, createdAt: true, provider: true },
  });

  const totalRevenue = completed.reduce((sum, t) => sum + t.amount, 0);
  const byProvider = completed.reduce<Record<string, number>>((acc, t) => {
    acc[t.provider] = (acc[t.provider] ?? 0) + t.amount;
    return acc;
  }, {});

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    totalRevenue,
    transactionCount: completed.length,
    byProvider,
  };
}
