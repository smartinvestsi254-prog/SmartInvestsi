import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired } from "../services/auth.service";
import {
  listPlans,
  getMySubscription,
  getMyPlan,
  cancelSubscription,
  upgradePlan,
} from "../services/subscription.service";

const router = Router();

const upgradeSchema = z.object({
  planId: z.string().min(1),
});

// GET /api/subscriptions/plans
router.get("/plans", async (_req, res) => {
  try {
    const plans = await listPlans();
    res.json({ success: true, plans });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/subscriptions/me
router.get("/me", authRequired, async (req, res) => {
  try {
    const subscription = await getMySubscription((req as any).user.id);
    const plan = await getMyPlan((req as any).user.id);
    res.json({ success: true, subscription, plan });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/subscriptions/upgrade
router.post("/upgrade", authRequired, createBodyValidator(upgradeSchema), async (req, res) => {
  try {
    const subscription = await upgradePlan((req as any).user.id, req.body.planId);
    res.json({ success: true, subscription });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/subscriptions/cancel
router.post("/cancel", authRequired, async (req, res) => {
  try {
    const { reason } = req.body ?? {};
    const subscription = await cancelSubscription((req as any).user.id, reason);
    res.json({ success: true, subscription });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
