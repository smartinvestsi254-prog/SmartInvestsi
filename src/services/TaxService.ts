// src/services/TaxService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../lib/tier-access-control';

const prisma = new PrismaClient();

export class TaxService {
  
  async getTaxLots(userEmail: string, portfolioId?: string) {
    const access = await checkFeatureAccess(userEmail, 'tax.lossHarvesting');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const where: any = { userEmail };
    if (portfolioId) {
      where.portfolioId = portfolioId;
    }

    return await prisma.taxLot.findMany({
      where,
      orderBy: { acquiredDate: 'desc' }
    });
  }

  async generateTaxReport(userEmail: string, year: number) {
    const access = await checkFeatureAccess(userEmail, 'tax.lossHarvesting');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get all realized gains/losses for the year
    const taxLots = await prisma.taxLot.findMany({
      where: {
        userEmail,
        status: 'SOLD',
        soldDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get dividend income
    const dividends = await prisma.dividend.findMany({
      where: {
        holding: {
          portfolio: {
            userEmail
          }
        },
        exDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const shortTermGains = taxLots
      .filter(lot => lot.holdingPeriodDays! < 365)
      .reduce((sum, lot) => sum + (lot.realizedGain || 0), 0);

    const longTermGains = taxLots
      .filter(lot => lot.holdingPeriodDays! >= 365)
      .reduce((sum, lot) => sum + (lot.realizedGain || 0), 0);

    const totalDividends = dividends.reduce((sum, div) => sum + div.amount, 0);

    const report = await prisma.taxReport.create({
      data: {
        userEmail,
        year,
        shortTermGains,
        longTermGains,
        dividendIncome: totalDividends,
        totalGains: shortTermGains + longTermGains
      }
    });

    return report;
  }

  async identifyTaxLossHarvestingOpportunities(userEmail: string) {
    const access = await checkFeatureAccess(userEmail, 'tax.lossHarvesting');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const openLots = await prisma.taxLot.findMany({
      where: {
        userEmail,
        status: 'OPEN'
      },
      include: {
        holding: true
      }
    });

    const opportunities = openLots
      .filter(lot => {
        const currentValue = lot.quantity * (lot.holding?.currentPrice || 0);
        const unrealizedGain = currentValue - lot.costBasis;
        return unrealizedGain < -100; // Loss > $100
      })
      .map(lot => {
        const currentValue = lot.quantity * (lot.holding?.currentPrice || 0);
        const unrealizedLoss = currentValue - lot.costBasis;
        return {
          symbol: lot.symbol,
          quantity: lot.quantity,
          costBasis: lot.costBasis,
          currentValue,
          unrealizedLoss,
          acquiredDate: lot.acquiredDate
        };
      });

    return opportunities;
  }

  async recordSale(data: {
    userEmail: string;
    portfolioId: string;
    symbol: string;
    quantity: number;
    salePrice: number;
    saleDate: Date;
  }) {
    // Use FIFO method to match tax lots
    const openLots = await prisma.taxLot.findMany({
      where: {
        userEmail: data.userEmail,
        portfolioId: data.portfolioId,
        symbol: data.symbol,
        status: 'OPEN'
      },
      orderBy: { acquiredDate: 'asc' }
    });

    let remainingQuantity = data.quantity;
    const soldLots = [];

    for (const lot of openLots) {
      if (remainingQuantity <= 0) break;

      const quantityToSell = Math.min(lot.quantity, remainingQuantity);
      const saleProceeds = quantityToSell * data.salePrice;
      const costBasis = (quantityToSell / lot.quantity) * lot.costBasis;
      const realizedGain = saleProceeds - costBasis;
      
      const holdingPeriod = Math.floor(
        (data.saleDate.getTime() - lot.acquiredDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (quantityToSell === lot.quantity) {
        // Sell entire lot
        await prisma.taxLot.update({
          where: { id: lot.id },
          data: {
            status: 'SOLD',
            soldDate: data.saleDate,
            soldPrice: data.salePrice,
            saleProceeds,
            realizedGain,
            holdingPeriodDays: holdingPeriod
          }
        });
      } else {
        // Partial sale - split lot
        await prisma.taxLot.update({
          where: { id: lot.id },
          data: {
            quantity: lot.quantity - quantityToSell,
            costBasis: lot.costBasis - costBasis
          }
        });

        await prisma.taxLot.create({
          data: {
            userEmail: data.userEmail,
            portfolioId: data.portfolioId,
            symbol: data.symbol,
            quantity: quantityToSell,
            costBasis,
            acquiredDate: lot.acquiredDate,
            acquiredPrice: lot.acquiredPrice,
            status: 'SOLD',
            soldDate: data.saleDate,
            soldPrice: data.salePrice,
            saleProceeds,
            realizedGain,
            holdingPeriodDays: holdingPeriod
          }
        });
      }

      soldLots.push({
        symbol: data.symbol,
        quantity: quantityToSell,
        realizedGain,
        holdingPeriodDays: holdingPeriod
      });

      remainingQuantity -= quantityToSell;
    }

    return soldLots;
  }
}
