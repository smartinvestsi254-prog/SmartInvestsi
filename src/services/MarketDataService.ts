// src/services/MarketDataService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../lib/tier-access-control';

const prisma = new PrismaClient();

export class MarketDataService {
  
  async getQuote(symbol: string, userEmail: string) {
    const access = await checkFeatureAccess(userEmail, 'market.realtime');
    
    const quote = await prisma.marketData.findFirst({
      where: { symbol: symbol.toUpperCase() },
      orderBy: { timestamp: 'desc' }
    });

    if (!quote) {
      return this.fetchExternalQuote(symbol);
    }

    // Free users get 15-minute delayed data
    if (!access.allowed) {
      const delay = 15 * 60 * 1000;
      const delayedTime = new Date(Date.now() - delay);
      
      if (quote.timestamp > delayedTime) {
        return {
          ...quote,
          isDelayed: true,
          delayMinutes: 15,
          message: 'Delayed data. Upgrade to Premium for real-time quotes.'
        };
      }
    }

    return { ...quote, isDelayed: false };
  }

  async getHistoricalData(
    symbol: string,
    userEmail: string,
    params: {
      from?: Date;
      to?: Date;
      interval?: string;
    }
  ) {
    const access = await checkFeatureAccess(userEmail, 'market.historical');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const data = await prisma.marketData.findMany({
      where: {
        symbol: symbol.toUpperCase(),
        timestamp: {
          gte: params.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          lte: params.to || new Date()
        }
      },
      orderBy: { timestamp: 'asc' },
      take: 1000
    });

    return data;
  }

  async updateMarketData(symbol: string, data: any) {
    return await prisma.marketData.create({
      data: {
        symbol: symbol.toUpperCase(),
        exchange: data.exchange,
        price: data.price,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
        change: data.change,
        changePercent: data.changePercent,
        marketCap: data.marketCap,
        peRatio: data.peRatio,
        dividendYield: data.dividendYield,
        week52High: data.week52High,
        week52Low: data.week52Low,
        timestamp: new Date()
      }
    });
  }

  private async fetchExternalQuote(symbol: string) {
    try {
      return {
        symbol,
        price: 0,
        message: 'External API integration needed'
      };
    } catch (error) {
      throw new Error(`Failed to fetch quote for ${symbol}`);
    }
  }

  async getWatchlist(userEmail: string) {
    const portfolios = await prisma.portfolio.findMany({
      where: { userEmail },
      include: {
        holdings: {
          select: { symbol: true }
        }
      }
    });

    const alerts = await prisma.priceAlert.findMany({
      where: { userEmail, isActive: true },
      select: { symbol: true }
    });

    const symbols = new Set<string>();
    portfolios.forEach(p => p.holdings.forEach(h => symbols.add(h.symbol)));
    alerts.forEach(a => symbols.add(a.symbol));

    const quotes = await Promise.all(
      Array.from(symbols).map(symbol => this.getQuote(symbol, userEmail))
    );

    return quotes;
  }
}
