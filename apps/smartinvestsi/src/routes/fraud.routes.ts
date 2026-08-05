import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, adminRequired } from "../services/auth.service";
import { getFraudChecks, reviewFraudFlag, runFraudChecks } from "../services/fraud.service";

const router = Router();

router.use(authRequired);

const manualCheckSchema = z.object({
  amount: z.number().positive(),
  action: z.string().min(1),
});

const reviewSchema = z.object({
  decision: z.enum(["CLEAR", "BLOCK"]),
});

// POST /api/fraud/check (manual trigger)
router.post("/check", createBodyValidator(manualCheckSchema), async (req, res) => {
  try {
    const result = await runFraudChecks({
      userId: (req as any).user.id,
      amount: req.body.amount,
      action: req.body.action,
      ipAddress: req.ip,
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/fraud/my-checks
router.get("/my-checks", async (req, res) => {
  try {
    const checks = await getFraudChecks((req as any).user.id);
    res.json({ success: true, checks });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Admin: review a fraud flag
// PATCH /api/fraud/admin/:id/review
router.patch("/admin/:id/review", adminRequired, createBodyValidator(reviewSchema), async (req, res) => {
  try {
    const check = await reviewFraudFlag({
      fraudCheckId: req.params.id,
      decision: req.body.decision,
      reviewerId: (req as any).user.id,
    });
    res.json({ success: true, check });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
