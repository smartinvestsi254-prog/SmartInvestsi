// src/services/RoboAdvisorService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../lib/tier-access-control';

const prisma = new PrismaClient();

export class RoboAdvisorService {
  
  async createRoboPortfolio(userEmail: string, data: {
    name: string;
    strategy: string;
    riskLevel: number;
    goalAmount?: number;
    goalDate?: Date;
    initialDeposit: number;
  }) {
    const access = await checkFeatureAccess(userEmail, 'roboAdvisor.access');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const portfolio = await prisma.roboPortfolio.create({
      data: {
        userEmail,
        name: data.name,
        strategy: data.strategy as any,
        riskLevel: data.riskLevel,
        goalAmount: data.goalAmount,
        goalDate: data.goalDate,
        initialDeposit: data.initialDeposit,
        currentValue: data.initialDeposit
      }
    });

    // Generate initial allocations
    const allocations = this.generateAllocations(data.strategy, data.riskLevel);
    
    for (const alloc of allocations) {
      await prisma.roboAllocation.create({
        data: {
          portfolioId: portfolio.id,
          assetClass: alloc.assetClass,
          targetPercent: alloc.targetPercent,
          currentPercent: alloc.targetPercent,
          targetAmount: (alloc.targetPercent / 100) * data.initialDeposit,
          currentAmount: (alloc.targetPercent / 100) * data.initialDeposit
        }
      });
    }

    return portfolio;
  }

  private generateAllocations(strategy: string, riskLevel: number) {
    // Conservative: More bonds, less stocks
    // Aggressive: More stocks, less bonds
    const stockPercent = Math.min(90, 40 + (riskLevel * 5));
    const bondPercent = Math.max(10, 50 - (riskLevel * 4));
    const realEstatePercent = 10;

    return [
      { assetClass: 'STOCKS', targetPercent: stockPercent },
      { assetClass: 'BONDS', targetPercent: bondPercent },
      { assetClass: 'REAL_ESTATE', targetPercent: realEstatePercent }
    ];
  }

  async getRoboPortfolios(userEmail: string) {
    return await prisma.roboPortfolio.findMany({
      where: { userEmail, isActive: true },
      include: {
        allocations: true,
        recommendations: {
          where: { isAccepted: null },
          orderBy: { priority: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getRecommendations(portfolioId: string, userEmail: string) {
    const portfolio = await prisma.roboPortfolio.findFirst({
      where: { id: portfolioId, userEmail }
    });

    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    return await prisma.roboRecommendation.findMany({
      where: {
        portfolioId,
        isAccepted: null
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async generateRecommendations(portfolioId: string) {
    const portfolio = await prisma.roboPortfolio.findUnique({
      where: { id: portfolioId },
      include: { allocations: true }
    });

    if (!portfolio) return;

    const recommendations = [];

    // Check if rebalancing is needed
    for (const allocation of portfolio.allocations) {
      const deviation = Math.abs(allocation.currentPercent - allocation.targetPercent);
      
      if (deviation > 5) {
        recommendations.push({
          portfolioId,
          type: 'REBALANCE',
          reason: `${allocation.assetClass} is ${deviation.toFixed(1)}% off target allocation`,
          priority: Math.floor(deviation / 5)
        });
      }
    }

    // Create recommendations
    for (const rec of recommendations) {
      await prisma.roboRecommendation.create({
        data: rec
      });
    }

    return recommendations;
  }

  async acceptRecommendation(recommendationId: string, userEmail: string) {
    const recommendation = await prisma.roboRecommendation.findUnique({
      where: { id: recommendationId },
      include: {
        portfolio: true
      }
    });

    if (!recommendation || recommendation.portfolio.userEmail !== userEmail) {
      throw new Error('Recommendation not found');
    }

    await prisma.roboRecommendation.update({
      where: { id: recommendationId },
      data: {
        isAccepted: true,
        acceptedAt: new Date()
      }
    });

    return { success: true, message: 'Recommendation accepted and will be executed' };
  }
}
