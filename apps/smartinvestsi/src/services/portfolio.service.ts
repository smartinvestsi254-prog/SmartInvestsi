import { prisma } from "../lib/prisma";

export async function getPortfolios(userId: string) {
  return prisma.portfolio.findMany({
    where: { userId },
    include: { holdings: true },
    orderBy: { isDefault: "desc" },
  });
}

export async function getPortfolio(userId: string, portfolioId: string) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      holdings: true,
      transactions: { orderBy: { executedAt: "desc" }, take: 50 },
      performances: { orderBy: { date: "desc" }, take: 30 },
    },
  });
  if (!portfolio) {
    const err = new Error("Portfolio not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return portfolio;
}

export async function createPortfolio(userId: string, data: { name: string; currency?: string; description?: string }) {
  const count = await prisma.portfolio.count({ where: { userId } });
  return prisma.portfolio.create({
    data: {
      userId,
      name: data.name,
      currency: data.currency ?? "USD",
      description: data.description,
      isDefault: count === 0,
    },
  });
}

export interface TradeInput {
  portfolioId: string;
  symbol: string;
  assetType: "STOCK" | "ETF" | "CRYPTO" | "COMMODITY" | "FOREX" | "OTHER";
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees?: number;
}

export async function executeTrade(userId: string, input: TradeInput) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: input.portfolioId, userId },
  });
  if (!portfolio) {
    const err = new Error("Portfolio not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const totalAmount = input.quantity * input.price + (input.fees ?? 0);

  return prisma.$transaction(async (tx) => {
    const holding = await tx.holding.findFirst({
      where: { portfolioId: input.portfolioId, symbol: input.symbol },
    });

    if (input.side === "BUY") {
      if (holding) {
        const newQty = holding.quantity + input.quantity;
        const newCost = holding.averageCost * holding.quantity + input.quantity * input.price;
        await tx.holding.update({
          where: { id: holding.id },
          data: {
            quantity: newQty,
            averageCost: newCost / newQty,
            currentPrice: input.price,
          },
        });
      } else {
        await tx.holding.create({
          data: {
            portfolioId: input.portfolioId,
            symbol: input.symbol,
            assetType: input.assetType as any,
            quantity: input.quantity,
            averageCost: input.price,
            currentPrice: input.price,
          },
        });
      }
    } else {
      if (!holding || holding.quantity < input.quantity) {
        const err = new Error("Insufficient holdings") as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }
      const newQty = holding.quantity - input.quantity;
      await tx.holding.update({
        where: { id: holding.id },
        data: { quantity: newQty, currentPrice: input.price },
      });
    }

    const txRecord = await tx.transaction.create({
      data: {
        portfolioId: input.portfolioId,
        symbol: input.symbol,
        type: input.side === "BUY" ? "BUY" : "SELL",
        quantity: input.quantity,
        price: input.price,
        fees: input.fees ?? 0,
        totalAmount,
        executedAt: new Date(),
      },
    });

    return txRecord;
  });
}

export async function getPortfolioPerformance(userId: string, portfolioId: string) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) {
    const err = new Error("Portfolio not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  const holdings = await prisma.holding.findMany({ where: { portfolioId } });
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.averageCost * h.quantity, 0);
  const gainLoss = totalValue - totalCost;
  const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  return {
    totalValue,
    totalCost,
    gainLoss,
    gainLossPct,
    holdingsCount: holdings.length,
  };
}
