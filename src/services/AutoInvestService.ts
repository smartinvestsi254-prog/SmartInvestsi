// src/services/AutoInvestService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../lib/tier-access-control';
import { dbClient } from '../../lib/db-client';

const prisma = dbClient.getClient();

export class AutoInvestService {
  
  async createAutoInvestment(userEmail: string, data: {
    portfolioId: string;
    frequency: string;
    amount: number;
    isPercentage?: boolean;
    symbols?: string[];
  }) {
    const access = await checkFeatureAccess(userEmail, 'autoInvesting.recurring');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const portfolio = await prisma.portfolio.findFirst({
      where: { id: data.portfolioId, userEmail }
    });

    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    const autoInvest = await prisma.autoInvestment.create({
      data: {
        userEmail,
        portfolioId: data.portfolioId,
        frequency: data.frequency as any,
        amount: data.amount,
        isPercentage: data.isPercentage || false,
        symbols: data.symbols || [],
        isActive: true
      }
    });

    return autoInvest;
  }

  async getAutoInvestments(userEmail: string) {
    return await prisma.autoInvestment.findMany({
      where: { userEmail },
      include: {
        portfolio: {
          select: {
            name: true,
            totalValue: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async pauseAutoInvestment(id: string, userEmail: string) {
    const autoInvest = await prisma.autoInvestment.findFirst({
      where: { id, userEmail }
    });

    if (!autoInvest) {
      throw new Error('Auto investment not found');
    }

    await prisma.autoInvestment.update({
      where: { id },
      data: {
        isActive: false,
        pausedAt: new Date()
      }
    });

    return { success: true };
  }

  async resumeAutoInvestment(id: string, userEmail: string) {
    const autoInvest = await prisma.autoInvestment.findFirst({
      where: { id, userEmail }
    });

    if (!autoInvest) {
      throw new Error('Auto investment not found');
    }

    await prisma.autoInvestment.update({
      where: { id },
      data: {
        isActive: true,
        pausedAt: null
      }
    });

    return { success: true };
  }

  async deleteAutoInvestment(id: string, userEmail: string) {
    const autoInvest = await prisma.autoInvestment.findFirst({
      where: { id, userEmail }
    });

    if (!autoInvest) {
      throw new Error('Auto investment not found');
    }

    await prisma.autoInvestment.delete({
      where: { id }
    });

    return { success: true };
  }

  async executeScheduledInvestments() {
    const now = new Date();
    
    const dueInvestments = await prisma.autoInvestment.findMany({
      where: {
        isActive: true,
        OR: [
          { nextExecutionDate: null },
          { nextExecutionDate: { lte: now } }
        ]
      },
      include: {
        portfolio: true
      }
    });

    const results = [];

    for (const investment of dueInvestments) {
      try {
        // Execute the investment
        await this.executeInvestment(investment);
        
        // Calculate next execution date
        const nextDate = this.calculateNextExecutionDate(investment.frequency, now);
        
        await prisma.autoInvestment.update({
          where: { id: investment.id },
          data: {
            lastExecutionDate: now,
            nextExecutionDate: nextDate,
            executionCount: { increment: 1 }
          }
        });

        results.push({
          id: investment.id,
          status: 'success'
        });
      } catch (error: any) {
        results.push({
          id: investment.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }

  private async executeInvestment(investment: any) {
    // In production, this would place actual buy orders
    const symbols = investment.symbols.length > 0 
      ? investment.symbols 
      : await this.getPortfolioSymbols(investment.portfolioId);

    const amountPerSymbol = investment.amount / symbols.length;

    for (const symbol of symbols) {
      await prisma.transaction.create({
        data: {
          portfolioId: investment.portfolioId,
          type: 'BUY',
          symbol,
          quantity: 0, // Would be calculated based on current price
          price: 0,
          totalAmount: amountPerSymbol,
          status: 'PENDING'
        }
      });
    }
  }

  private async getPortfolioSymbols(portfolioId: string): Promise<string[]> {
    const holdings = await prisma.holding.findMany({
      where: { portfolioId },
      select: { symbol: true }
    });

    return holdings.map(h => h.symbol);
  }

  private calculateNextExecutionDate(frequency: string, from: Date): Date {
    const next = new Date(from);

    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        break;
    }

    return next;
  }
}
