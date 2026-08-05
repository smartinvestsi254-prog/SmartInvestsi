import { Router } from "express";
import { z } from "zod";
import { createBodyValidator, requirePlan } from "../../../packages/shared-security/src/index";
import { authRequired } from "../services/auth.service";
import {
  placeOrder,
  getOpenOrders,
  cancelOrder,
  getPositions,
  getPosition,
  evaluateRiskTriggers,
  reconcilePortfolio,
  getTradeHistory,
} from "../services/trading.service";

const router = Router();

router.use(authRequired);

const orderSchema = z.object({
  portfolioId: z.string().min(1),
  symbol: z.string().min(1),
  assetType: z.enum(["STOCK", "ETF", "CRYPTO", "COMMODITY", "FOREX", "OTHER"]),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT", "STOP_LOSS", "TAKE_PROFIT"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  requestId: z.string().optional(),
});

// POST /api/trading/order
router.post("/order", requirePlan("PREMIUM"), createBodyValidator(orderSchema), async (req, res) => {
  try {
    const order = await placeOrder({ ...req.body, userId: (req as any).user.id });
    res.status(201).json({ success: true, order });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/trading/orders
router.get("/orders", requirePlan("PREMIUM"), async (req, res) => {
  try {
    const orders = await getOpenOrders((req as any).user.id);
    res.json({ success: true, orders });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/trading/orders/:id/cancel
router.post("/orders/:id/cancel", requirePlan("PREMIUM"), async (req, res) => {
  try {
    const order = await cancelOrder((req as any).user.id, req.params.id);
    res.json({ success: true, order });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/trading/positions
router.get("/positions", requirePlan("PREMIUM"), async (req, res) => {
  try {
    const { portfolioId } = req.query;
    const positions = await getPositions((req as any).user.id, String(portfolioId));
    res.json({ success: true, positions });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/trading/history
router.get("/history", requirePlan("PREMIUM"), async (req, res) => {
  try {
    const history = await getTradeHistory((req as any).user.id, req.query.portfolioId as string | undefined);
    res.json({ success: true, history });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Admin-only: evaluate risk triggers
// POST /api/trading/risk/evaluate
router.post("/risk/evaluate", async (req, res) => {
  try {
    const { portfolioId, marketPrices } = req.body ?? {};
    if (!portfolioId || !marketPrices) {
      return res.status(400).json({ success: false, error: "portfolioId and marketPrices required" });
    }
    const actions = await evaluateRiskTriggers(portfolioId, marketPrices);
    res.json({ success: true, actions });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Admin-only: reconcile portfolio
// POST /api/trading/portfolio/reconcile
router.post("/portfolio/reconcile", async (req, res) => {
  try {
    const { portfolioId, marketPrices } = req.body ?? {};
    if (!portfolioId || !marketPrices) {
      return res.status(400).json({ success: false, error: "portfolioId and marketPrices required" });
    }
    const result = await reconcilePortfolio(portfolioId, marketPrices);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
