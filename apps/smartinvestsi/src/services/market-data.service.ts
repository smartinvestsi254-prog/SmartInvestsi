import { prisma } from "../lib/prisma";

/**
 * Market data service.
 * Uses CCXT for crypto and external providers for stocks/forex.
 * NOTE: CCXT integration is partially implemented in the legacy trading-service.
 * This service provides a clean abstraction and caches market data.
 */

export type MarketType = "CRYPTO" | "STOCK" | "FOREX" | "COMMODITY";

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  volume?: number;
  type: MarketType;
  updatedAt: string;
}

export async function getQuote(symbol: string): Promise<MarketQuote | null> {
  const cached = await prisma.marketData.findUnique({ where: { symbol } });
  if (!cached) return null;
  return {
    symbol: cached.symbol,
    price: cached.price,
    change: cached.change,
    changePct: cached.changePct,
    volume: cached.volume ?? undefined,
    type: cached.type as MarketType,
    updatedAt: cached.updatedAt.toISOString(),
  };
}

export async function cacheQuote(quote: Omit<MarketQuote, "updatedAt">) {
  return prisma.marketData.upsert({
    where: { symbol: quote.symbol },
    create: {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePct: quote.changePct,
      volume: quote.volume,
      type: quote.type,
    },
    update: {
      price: quote.price,
      change: quote.change,
      changePct: quote.changePct,
      volume: quote.volume,
      type: quote.type,
    },
  });
}

export async function getMarketData(type?: MarketType) {
  const where = type ? { type } : {};
  const items = await prisma.marketData.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return items.map((item) => ({
    symbol: item.symbol,
    price: item.price,
    change: item.change,
    changePct: item.changePct,
    volume: item.volume,
    type: item.type,
    updatedAt: item.updatedAt.toISOString(),
  }));
}

export async function getMarketIndices() {
  const indices = await prisma.marketData.findMany({
    where: { type: { in: ["STOCK", "CRYPTO"] } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return indices.map((i) => ({
    symbol: i.symbol,
    price: i.price,
    changePct: i.changePct,
    type: i.type,
  }));
}

export async function getCryptoMarkets() {
  return prisma.marketData.findMany({
    where: { type: "CRYPTO" },
    orderBy: { volume: "desc" },
    take: 50,
  });
}

export async function getForexRates() {
  return prisma.marketData.findMany({
    where: { type: "FOREX" },
    orderBy: { symbol: "asc" },
  });
}

export async function getStockQuotes() {
  return prisma.marketData.findMany({
    where: { type: "STOCK" },
    orderBy: { symbol: "asc" },
  });
}
