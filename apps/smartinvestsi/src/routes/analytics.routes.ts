import { Router } from "express";
import { authRequired, adminRequired } from "../services/auth.service";
import { getAnalytics, getRevenueAnalytics } from "../services/analytics.service";

const router = Router();

router.use(authRequired, adminRequired);

// GET /api/analytics
router.get("/", async (req, res) => {
  try {
    const analytics = await getAnalytics({
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    });
    res.json({ success: true, ...analytics });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/analytics/revenue
router.get("/revenue", async (req, res) => {
  try {
    const revenue = await getRevenueAnalytics({
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    });
    res.json({ success: true, ...revenue });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
