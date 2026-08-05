import { Router } from "express";
import { z } from "zod";
import { createBodyValidator, requirePlan } from "../../../packages/shared-security/src/index";
import { authRequired } from "../services/auth.service";
import { getMyReferral, applyReferral, getReferralStats } from "../services/referral.service";

const router = Router();

const applySchema = z.object({
  code: z.string().min(1),
});

router.use(authRequired);

// GET /api/referrals
router.get("/", requirePlan("BASIC"), async (req, res) => {
  try {
    const referral = await getMyReferral((req as any).user.id);
    res.json({ success: true, referral });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/referrals/stats
router.get("/stats", requirePlan("BASIC"), async (req, res) => {
  try {
    const stats = await getReferralStats((req as any).user.id);
    res.json({ success: true, ...stats });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/referrals/apply
router.post("/apply", requirePlan("BASIC"), createBodyValidator(applySchema), async (req, res) => {
  try {
    const result = await applyReferral(req.body.code, (req as any).user.id);
    res.json({ success: true, applied: Boolean(result) });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
