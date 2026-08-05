import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, adminRequired } from "../services/auth.service";
import {
  submitKycDocument,
  getKycStatus,
  reviewKycDocument,
  listPendingKyc,
  auditKycAction,
} from "../services/kyc.service";
import { sendKycStatus } from "../services/email.service";
import { prisma } from "../lib/prisma";

const router = Router();

const submitSchema = z.object({
  documentType: z.enum(["NATIONAL_ID", "PASSPORT", "SELFIE", "ADDRESS_PROOF", "DRIVERS_LICENSE"]),
  documentUrl: z.string().url(),
  metadata: z.record(z.unknown()).optional(),
});

const reviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_MORE_INFO"]),
  notes: z.string().optional(),
});

// POST /api/kyc/submit
router.post("/submit", authRequired, createBodyValidator(submitSchema), async (req, res) => {
  try {
    const doc = await submitKycDocument({
      userId: (req as any).user.id,
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
await auditKycAction({
      userId: (req as any).user.id,
      action: "SUBMIT_DOCUMENT",
      details: { documentType: req.body.documentType },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
    });
    res.status(201).json({ success: true, document: doc });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/kyc/status
router.get("/status", authRequired, async (req, res) => {
  try {
    const status = await getKycStatus((req as any).user.id);
    res.json({ success: true, ...status });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/kyc/admin/pending
router.get("/admin/pending", authRequired, adminRequired, async (_req, res) => {
  try {
    const pending = await listPendingKyc();
    res.json({ success: true, pending });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/kyc/admin/:documentId/review
router.post(
  "/admin/:documentId/review",
  authRequired,
  adminRequired,
  createBodyValidator(reviewSchema),
  async (req, res) => {
    try {
      const doc = await reviewKycDocument({
        documentId: req.params.documentId,
        reviewerId: (req as any).user.id,
        ...req.body,
      });
await auditKycAction({
        userId: (req as any).user.id,
        action: `REVIEW_${req.body.decision}`,
        details: { documentId: req.params.documentId, notes: req.body.notes },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        success: true,
      });

      // Notify user via email
      const user = await prisma.user.findUnique({ where: { id: doc.userId } });
      if (user) {
        await sendKycStatus(user.email, doc.status, req.body.notes);
      }

      res.json({ success: true, document: doc });
    } catch (e: any) {
      res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
    }
  }
);

export default router;
