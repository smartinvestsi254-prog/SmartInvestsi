import { Router } from "express";
import { requirePlan } from "../../../packages/shared-security/src/index";
import { authRequired } from "../services/auth.service";
import {
  getRiskProfile,
  getRecommendations,
  getPortfolioInsights,
  getInvestmentPlan,
} from "../services/ai-assistant.service";

const router = Router();

router.use(authRequired);

// GET /api/ai/assistant/risk-profile
router.get("/risk-profile", requirePlan("PREMIUM"), async (req, res) => {
  try {
    const profile = await getRiskProfile((req as any).user.id);
    if (!profile) {
      return res.json({ success: true, profile: null, message: "Complete your profile to get recommendations" });
    }
    res.json({ success: true, profile });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/ai/assistant/recommendations
router.get("/recommendations", requirePlan("PREMIUM"), async (req, res) => {
  try {
    const recommendations = await getRecommendations((req as any).user.id);
    res.json({ success: true, recommendations });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/ai/assistant/insights
router.get("/insights", requirePlan("PREMIUM"), async (req, res) => {
  try {
    const insights = await getPortfolioInsights((req as any).user.id);
    res.json({ success: true, ...insights });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/ai/assistant/investment-plan
router.get("/investment-plan", requirePlan("PREMIUM"), async (req, res) => {
  try {
    const plan = await getInvestmentPlan((req as any).user.id);
    res.json({ success: true, ...plan });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
