import { Router } from "express";
import { requirePlan } from "../../../packages/shared-security/src/index";
import { authRequired } from "../services/auth.service";
import {
  getMarketData,
  getQuote,
  getCryptoMarkets,
  getForexRates,
  getStockQuotes,
  getMarketIndices,
} from "../services/market-data.service";

const router = Router();

router.use(authRequired);

// GET /api/market-data/quote?symbol=...
router.get("/quote", requirePlan("BASIC"), async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) ?? "";
    if (!symbol) return res.status(400).json({ success: false, error: "symbol required" });
    const quote = await getQuote(symbol);
    res.json({ success: true, quote });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/market-data/crypto
router.get("/crypto", requirePlan("BASIC"), async (_req, res) => {
  try {
    const prices = await getCryptoMarkets();
    res.json({ success: true, prices });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/market-data/forex
router.get("/forex", requirePlan("BASIC"), async (_req, res) => {
  try {
    const rates = await getForexRates();
    res.json({ success: true, rates });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/market-data/stocks
router.get("/stocks", requirePlan("BASIC"), async (_req, res) => {
  try {
    const quotes = await getStockQuotes();
    res.json({ success: true, quotes });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/market-data/indices
router.get("/indices", requirePlan("BASIC"), async (_req, res) => {
  try {
    const indices = await getMarketIndices();
    res.json({ success: true, indices });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/market-data
router.get("/", requirePlan("BASIC"), async (req, res) => {
  try {
    const data = await getMarketData((req.query.type as any) ?? undefined);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
