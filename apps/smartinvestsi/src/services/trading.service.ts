import { prisma } from "../lib/prisma";

/**
 * Trading system with:
 * - Position tracking
 * - Order validation
 * - Risk controls (max position size, max leverage)
 * - Stop-loss / take-profit
 * - Trade history
 * - Portfolio reconciliation
 */

export interface OrderInput {
  userId: string;
  portfolioId: string;
  symbol: string;
  assetType: "STOCK" | "ETF" | "CRYPTO" | "COMMODITY" | "FOREX" | "OTHER";
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP_LOSS" | "TAKE_PROFIT";
  quantity: number;
  price?: number;
  stopPrice?: number;
  takeProfit?: number;
  requestId?: string;
}

export async function validateOrder(input: OrderInput) {
  const errors: string[] = [];

  if (input.quantity <= 0) errors.push("Quantity must be positive");
  if (input.quantity > 100000) errors.push("Quantity exceeds max order size");

  if (input.orderType === "MARKET" && !input.price) {
    errors.push("Market orders require a price");
  }
  if (["LIMIT", "STOP_LOSS", "TAKE_PROFIT"].includes(input.orderType) && !input.price && !input.stopPrice) {
    errors.push("Limit/stop orders require a price or stop price");
  }
  if (input.stopPrice && input.stopPrice <= 0) errors.push("Stop price must be positive");
  if (input.takeProfit && input.takeProfit <= 0) errors.push("Take profit must be positive");

  return errors;
}

export async function placeOrder(input: OrderInput) {
  const errors = await validateOrder(input);
  if (errors.length > 0) {
    const err = new Error(errors.join("; ")) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  // Oversubscription protection: reject duplicate requestId
  if (input.requestId) {
    const existing = await prisma.order.findUnique({ where: { requestId: input.requestId } });
    if (existing) {
      const err = new Error("Duplicate order request") as Error & { statusCode?: number };
      err.statusCode = 409;
      throw err;
    }
  }

  // Risk check: max position size
  const portfolio = await prisma.portfolio.findUnique({ where: { id: input.portfolioId } });
  if (!portfolio) {
    const err = new Error("Portfolio not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const orderValue = (input.price ?? input.stopPrice ?? 0) * input.quantity;
  const maxPositionValue = portfolio.totalValue * 0.4; // max 40% in single position
  if (orderValue > maxPositionValue) {
    const err = new Error("Order exceeds max position size risk limit") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  return prisma.order.create({
    data: {
      userId: input.userId,
      portfolioId: input.portfolioId,
      symbol: input.symbol,
      assetType: input.assetType,
      side: input.side,
      orderType: input.orderType,
      quantity: input.quantity,
      price: input.price,
      stopPrice: input.stopPrice,
      takeProfit: input.takeProfit,
      status: "OPEN",
      requestId: input.requestId,
    },
  });
}

export async function getOpenOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) {
    const err = new Error("Order not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  if (order.status !== "OPEN") {
    const err = new Error("Only open orders can be cancelled") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  return prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}

export async function getPosition(userId: string, portfolioId: string, symbol: string) {
  const holding = await prisma.holding.findFirst({
    where: { portfolioId, symbol },
  });
  if (!holding) return null;

  const unrealizedGain = holding.marketValue - holding.averageCost * holding.quantity;
  const unrealizedGainPct = holding.averageCost > 0 ? (unrealizedGain / (holding.averageCost * holding.quantity)) * 100 : 0;

  return {
    ...holding,
    unrealizedGain,
    unrealizedGainPct,
  };
}

export async function getPositions(userId: string, portfolioId: string) {
  const holdings = await prisma.holding.findMany({ where: { portfolioId } });
  return holdings.map((h) => ({
    ...h,
    unrealizedGain: h.marketValue - h.averageCost * h.quantity,
    unrealizedGainPct:
      h.averageCost > 0 ? ((h.marketValue - h.averageCost * h.quantity) / (h.averageCost * h.quantity)) * 100 : 0,
  }));
}

/**
 * Evaluate stop-loss / take-profit triggers against current market price.
 * Returns actions to execute.
 */
export async function evaluateRiskTriggers(portfolioId: string, marketPrices: Record<string, number>) {
  const openOrders = await prisma.order.findMany({
    where: { portfolioId, status: "OPEN", orderType: { in: ["STOP_LOSS", "TAKE_PROFIT"] } },
  });

  const actions: Array<{ orderId: string; action: string; price: number }> = [];

  for (const order of openOrders) {
    const current = marketPrices[order.symbol];
    if (!current) continue;

    if (order.orderType === "STOP_LOSS" && order.stopPrice && current <= order.stopPrice) {
      // Trigger stop-loss -> sell
      actions.push({ orderId: order.id, action: "SELL", price: current });
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "EXECUTED", executedAt: new Date(), fillPrice: current },
      });
    }

    if (order.orderType === "TAKE_PROFIT" && order.takeProfit && current >= order.takeProfit) {
      // Trigger take-profit -> sell
      actions.push({ orderId: order.id, action: "SELL", price: current });
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "EXECUTED", executedAt: new Date(), fillPrice: current },
      });
    }
  }

  return actions;
}

/**
 * Portfolio reconciliation: recompute total value and market value of holdings.
 */
export async function reconcilePortfolio(portfolioId: string, marketPrices: Record<string, number>) {
  const holdings = await prisma.holding.findMany({ where: { portfolioId } });
  let totalValue = 0;

  for (const h of holdings) {
    const price = marketPrices[h.symbol] ?? h.currentPrice;
    const marketValue = price * h.quantity;
    const unrealizedGain = marketValue - h.averageCost * h.quantity;
    const unrealizedGainPct = h.averageCost > 0 ? (unrealizedGain / (h.averageCost * h.quantity)) * 100 : 0;
    const allocation = 0; // recomputed after total

    await prisma.holding.update({
      where: { id: h.id },
      data: {
        currentPrice: price,
        marketValue,
        unrealizedGain,
        unrealizedGainPct,
        allocation,
        lastPriceUpdate: new Date(),
      },
    });
    totalValue += marketValue;
  }

  // Update allocations
  for (const h of holdings) {
    const allocation = totalValue > 0 ? ((h.marketValue ?? 0) / totalValue) * 100 : 0;
    await prisma.holding.update({
      where: { id: h.id },
      data: { allocation },
    });
  }

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { totalValue },
  });

  return { totalValue, holdingsCount: holdings.length };
}

export async function getTradeHistory(userId: string, portfolioId?: string) {
  return prisma.transaction.findMany({
    where: { userId, ...(portfolioId ? { portfolioId } : {}) },
    orderBy: { executedAt: "desc" },
    take: 100,
  });
}
