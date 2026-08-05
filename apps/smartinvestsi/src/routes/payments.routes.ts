import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired } from "../services/auth.service";
import { initiateStkPush, processMpesaCallback, reconcilePendingTransactions } from "../services/mpesa.service";
import {
  createOrder,
  captureOrder,
  verifyPayPalWebhook,
  handlePaypalWebhook,
} from "../services/paypal.service";
import { writeAuditLog } from "../services/audit.service";

const router = Router();

const mpesaPushSchema = z.object({
  phone: z.string().min(9),
  amount: z.number().positive(),
  accountReference: z.string().optional(),
  idempotencyKey: z.string().min(8),
});

const paypalCreateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().optional(),
  description: z.string().optional(),
  idempotencyKey: z.string().min(8),
});

// POST /api/payments/mpesa/push
router.post("/mpesa/push", authRequired, createBodyValidator(mpesaPushSchema), async (req, res) => {
  try {
    const result = await initiateStkPush({
      userId: (req as any).user.id,
      phone: req.body.phone,
      amount: req.body.amount,
      accountReference: req.body.accountReference,
      idempotencyKey: req.body.idempotencyKey,
    });
    await writeAuditLog({
      userId: (req as any).user.id,
      eventType: "PAYMENT",
      action: "MPESA_STK_PUSH",
      success: result.success,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json(result);
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/payments/mpesa/callback
router.post("/mpesa/callback", async (req, res) => {
  try {
    const result = await processMpesaCallback(req.body);
    // Always respond 200 to M-Pesa so it stops retrying
    res.status(200).json({ success: true, ...result });
  } catch (e: any) {
    console.error("M-Pesa callback error", e);
    res.status(200).json({ success: false, error: e.message });
  }
});

// POST /api/payments/paypal/create
router.post("/paypal/create", authRequired, createBodyValidator(paypalCreateSchema), async (req, res) => {
  try {
    const result = await createOrder({
      userId: (req as any).user.id,
      amount: req.body.amount,
      currency: req.body.currency,
      description: req.body.description,
      idempotencyKey: req.body.idempotencyKey,
    });
    res.json(result);
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/payments/paypal/capture
router.post("/paypal/capture", authRequired, async (req, res) => {
  try {
    const { orderId } = req.body ?? {};
    if (!orderId) return res.status(400).json({ success: false, error: "orderId required" });
    const result = await captureOrder(orderId, (req as any).user.id);
    res.json(result);
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/payments/paypal/webhook
router.post("/paypal/webhook", async (req, res) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const verified = await verifyPayPalWebhook(req.headers, rawBody);
    if (!verified) {
      return res.status(400).json({ success: false, error: "Webhook signature verification failed" });
    }
    const result = await handlePaypalWebhook(req.body);
    res.json({ success: true, ...result });
  } catch (e: any) {
    console.error("PayPal webhook error", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/payments/reconcile
router.post("/reconcile", authRequired, async (req, res) => {
  try {
    const result = await reconcilePendingTransactions();
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
