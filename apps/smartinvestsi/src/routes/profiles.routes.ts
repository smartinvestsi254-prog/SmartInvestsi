import { Router } from "express";
import { z } from "zod";
import { createBodyValidator, requirePlan } from "../../../packages/shared-security/src/index";
import { authRequired } from "../services/auth.service";
import { prisma } from "../lib/prisma";

const router = Router();

const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  investmentGoal: z.string().optional(),
  timeHorizon: z.string().optional(),
  riskTolerance: z.enum(["conservative", "moderate", "aggressive"]).optional(),
  preferredRegion: z.string().optional(),
  monthlyIncome: z.number().positive().optional(),
  preferences: z.record(z.unknown()).optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
});

router.use(authRequired);

// GET /api/profiles/me
router.get("/me", requirePlan("BASIC"), async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const [user, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
      }),
      prisma.userProfile.findUnique({ where: { userId } }),
    ]);
    res.json({ success: true, profile: { user, settings: profile } });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// PATCH /api/profiles/me
router.patch("/me", requirePlan("BASIC"), createBodyValidator(updateProfileSchema), async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { fullName, phone, country, address, ...profileData } = req.body;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: { userId, email: (req as any).user.email, ...profileData },
      update: profileData,
    });

    if (phone || fullName || country || address) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: phone ?? undefined,
          fullName: fullName ?? undefined,
          country: country ?? undefined,
          address: address ?? undefined,
        },
      });
    }

    res.json({ success: true, profile });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
