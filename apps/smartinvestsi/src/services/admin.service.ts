import { prisma } from "../lib/prisma";

export async function adminDashboardStats() {
  const [users, activeSubscriptions, pendingKyc, completedTransactions, totalPortfolioValue] =
    await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.kycDocument.count({ where: { status: "PENDING" } }),
      prisma.paymentTransaction.count({ where: { status: "COMPLETED" } }),
      prisma.portfolio.aggregate({ _sum: { totalValue: true } }),
    ]);

  return {
    users,
    activeSubscriptions,
    pendingKyc,
    completedTransactions,
    totalPortfolioValue: totalPortfolioValue._sum.totalValue ?? 0,
  };
}

export async function listUsers(params: { page?: number; pageSize?: number; search?: string }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const where = params.search
    ? { email: { contains: params.search, mode: "insensitive" } }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        profile: { select: { kycStatus: true, premiumAccess: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, users };
}

export async function updateUserStatus(userId: string, data: { isActive?: boolean; role?: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error("User not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.role ? { role: data.role as any } : {}),
    },
  });
}

export async function listPaymentTransactions(params: { page?: number; pageSize?: number; status?: string }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const where = params.status ? { status: params.status as any } : {};

  const [total, transactions] = await Promise.all([
    prisma.paymentTransaction.count({ where }),
    prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, transactions };
}

export async function listFraudChecks() {
  return prisma.fraudCheck.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
