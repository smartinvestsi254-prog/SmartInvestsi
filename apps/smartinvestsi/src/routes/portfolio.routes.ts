import { Router } from "express";
import { z } from "zod";
import { createBodyValidator, requirePlan } from "../../../packages/shared-security/src/index";
import { authRequired } from "../services/auth.service";
import {
  getPortfolios,
  getPortfolio,
  createPortfolio,
  executeTrade,
  getPortfolioPerformance,
} from "../services/portfolio.service";

const router = Router();

router.use(authRequired);

const createPortfolioSchema = z.object({
  name: z.string().min(1),
  currency: z.string().optional(),
  description: z.string().optional(),
});

const tradeSchema = z.object({
  portfolioId: z.string().min(1),
  symbol: z.string().min(1),
  assetType: z.enum(["STOCK", "ETF", "CRYPTO", "COMMODITY", "FOREX", "OTHER"]),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fees: z.number().min(0).optional(),
});

// GET /api/portfolio
router.get("/", requirePlan("BASIC"), async (req, res) => {
  try {
    const portfolios = await getPortfolios((req as any).user.id);
    res.json({ success: true, portfolios });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/portfolio/:id
router.get("/:id", requirePlan("BASIC"), async (req, res) => {
  try {
    const portfolio = await getPortfolio((req as any).user.id, req.params.id);
    res.json({ success: true, portfolio });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/portfolio
router.post("/", requirePlan("BASIC"), createBodyValidator(createPortfolioSchema), async (req, res) => {
  try {
    const portfolio = await createPortfolio((req as any).user.id, req.body);
    res.status(201).json({ success: true, portfolio });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/portfolio/trade
router.post("/trade", requirePlan("PREMIUM"), createBodyValidator(tradeSchema), async (req, res) => {
  try {
    const tx = await executeTrade((req as any).user.id, req.body);
    res.status(201).json({ success: true, transaction: tx });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/portfolio/:id/performance
router.get("/:id/performance", requirePlan("BASIC"), async (req, res) => {
  try {
    const performance = await getPortfolioPerformance((req as any).user.id, req.params.id);
    res.json({ success: true, performance });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
