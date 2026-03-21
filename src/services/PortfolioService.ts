// src/services/PortfolioService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess, SubscriptionTier } from '../lib/tier-access-control';
import { dbClient } from '../../lib/db-client';

const prisma = dbClient.getClient();

export class PortfolioService {
  
  async createPortfolio(userEmail: string, data: {
    name: string;
    description?: string;
    currency?: string;
  }) {
    const access = await checkFeatureAccess(userEmail, 'portfolio.create');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const existingCount = await prisma.portfolio.count({
      where: { userEmail, isActive: true }
    });

    const limits: Record<string, number> = { FREE: 1, PREMIUM: 5, ENTERPRISE: -1 };
    const userLimit = limits[access.userTier];
    
    if (userLimit !== -1 && existingCount >= userLimit) {
      throw new Error(`You've reached your ${access.userTier} tier limit of ${userLimit} portfolios`);
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        userEmail,
        name: data.name,
        description: data.description,
        currency: data.currency || 'USD',
        isDefault: existingCount === 0
      }
    });

    return portfolio;
  }

  async getPortfolios(userEmail: string) {
    const portfolios = await prisma.portfolio.findMany({
      where: { userEmail, isActive: true },
      include: {
        holdings: true,
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return portfolios;
  }

  async getPortfolio(portfolioId: string, userEmail: string) {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userEmail },
      include: {
        holdings: {
          orderBy: { allocation: 'desc' }
        },
        transactions: {
          orderBy: { executedAt: 'desc' },
          take: 50
        },
        performances: {
          orderBy: { date: 'desc' },
          take: 90
        }
      }
    });

    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    return portfolio;
  }

  async addHolding(portfolioId: string, userEmail: string, data: {
    symbol: string;
    assetType: string;
    quantity: number;
    averageCost: number;
  }) {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userEmail }
    });

    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    const holding = await prisma.holding.create({
      data: {
        portfolioId,
        symbol: data.symbol.toUpperCase(),
        assetType: data.assetType as any,
        quantity: data.quantity,
        averageCost: data.averageCost,
        costBasis: data.quantity * data.averageCost
      }
    });

    await prisma.transaction.create({
      data: {
        portfolioId,
        symbol: data.symbol.toUpperCase(),
        type: 'BUY',
        quantity: data.quantity,
        price: data.averageCost,
        totalAmount: data.quantity * data.averageCost
      }
    });

    await this.updatePortfolioValue(portfolioId);

    return holding;
  }

  async updateHoldingPrices(portfolioId: string) {
    const holdings = await prisma.holding.findMany({
      where: { portfolioId }
    });

    for (const holding of holdings) {
      const marketData = await prisma.marketData.findFirst({
        where: { symbol: holding.symbol },
        orderBy: { timestamp: 'desc' }
      });

      if (marketData) {
        const marketValue = holding.quantity * marketData.price;
        const unrealizedGain = marketValue - holding.costBasis;
        const unrealizedGainPct = (unrealizedGain / holding.costBasis) * 100;

        await prisma.holding.update({
          where: { id: holding.id },
          data: {
            currentPrice: marketData.price,
            marketValue,
            unrealizedGain,
            unrealizedGainPct,
            lastPriceUpdate: new Date()
          }
        });
      }
    }

    await this.updatePortfolioValue(portfolioId);
  }

  async updatePortfolioValue(portfolioId: string) {
    const holdings = await prisma.holding.findMany({
      where: { portfolioId }
    });

    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    
    await prisma.portfolio.update({
      where: { id: portfolioId },
      data: { totalValue }
    });

    for (const holding of holdings) {
      const allocation = totalValue > 0 ? (holding.marketValue / totalValue) * 100 : 0;
      await prisma.holding.update({
        where: { id: holding.id },
        data: { allocation }
      });
    }

    return totalValue;
  }

  async analyzeRebalancing(portfolioId: string, userEmail: string) {
    const access = await checkFeatureAccess(userEmail, 'portfolio.rebalance');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userEmail },
      include: { holdings: true }
    });

    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    const targetAllocation = portfolio.targetAllocation as any || {};
    const proposedTrades = [];

    for (const holding of portfolio.holdings) {
      const targetPercent = targetAllocation[holding.assetType] || 0;
      const currentPercent = holding.allocation;
      const deviation = currentPercent - targetPercent;

      if (Math.abs(deviation) > 5) {
        const targetValue = (targetPercent / 100) * portfolio.totalValue;
        const currentValue = holding.marketValue;
        const difference = targetValue - currentValue;

        proposedTrades.push({
          symbol: holding.symbol,
          action: difference > 0 ? 'BUY' : 'SELL',
          quantity: Math.abs(difference / holding.currentPrice),
          amount: Math.abs(difference),
          reason: `Rebalance ${holding.assetType} from ${currentPercent.toFixed(1)}% to ${targetPercent}%`
        });
      }
    }

    const rebalance = await prisma.rebalance.create({
      data: {
        portfolioId,
        status: 'PROPOSED',
        proposedTrades: proposedTrades,
        reason: 'Automatic rebalancing analysis'
      }
    });

    return { rebalance, proposedTrades };
  }

  async recordPerformance(portfolioId: string) {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: { holdings: true, transactions: true }
    });

    if (!portfolio) return;

    const totalInvested = portfolio.transactions
      .filter(t => t.type === 'BUY' || t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const gainLoss = portfolio.totalValue - totalInvested;
    const gainLossPct = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastPerformance = await prisma.portfolioPerformance.findFirst({
      where: {
        portfolioId,
        date: { lte: yesterday }
      },
      orderBy: { date: 'desc' }
    });

    const dailyReturn = lastPerformance 
      ? ((portfolio.totalValue - lastPerformance.totalValue) / lastPerformance.totalValue) * 100 
      : 0;

    await prisma.portfolioPerformance.create({
      data: {
        portfolioId,
        date: new Date(),
        totalValue: portfolio.totalValue,
        cashBalance: portfolio.cashBalance,
        investedAmount: totalInvested,
        gainLoss,
        gainLossPct,
        dailyReturn
      }
    });
  }
}
