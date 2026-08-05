import { Router } from "express";
import { z } from "zod";
import { createBodyValidator, requirePlan } from "../../../packages/shared-security/src/index";
import { authRequired } from "../services/auth.service";
import {
  getWallets,
  getWalletTransactions,
  createDeposit,
  createWithdrawal,
  getWalletBalance,
} from "../services/wallet.service";
import { runFraudChecks } from "../services/fraud.service";

const router = Router();

router.use(authRequired);

const depositSchema = z.object({
  currency: z.string().min(3).max(5),
  amount: z.number().positive(),
  referenceId: z.string().optional(),
  description: z.string().optional(),
});

const withdrawalSchema = z.object({
  currency: z.string().min(3).max(5),
  amount: z.number().positive(),
  description: z.string().optional(),
});

// GET /api/wallets
router.get("/", requirePlan("BASIC"), async (req, res) => {
  try {
    const wallets = await getWallets((req as any).user.id);
    res.json({ success: true, wallets });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/wallets/balance
router.get("/balance", requirePlan("BASIC"), async (req, res) => {
  try {
    const currency = (req.query.currency as string) ?? "USD";
    const balance = await getWalletBalance((req as any).user.id, currency);
    res.json({ success: true, balance });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/wallets/:id/transactions
router.get("/:id/transactions", requirePlan("BASIC"), async (req, res) => {
  try {
    const transactions = await getWalletTransactions((req as any).user.id, req.params.id);
    res.json({ success: true, transactions });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/wallets/deposit
router.post("/deposit", requirePlan("BASIC"), createBodyValidator(depositSchema), async (req, res) => {
  try {
    const fraud = await runFraudChecks({
      userId: (req as any).user.id,
      amount: req.body.amount,
      ipAddress: req.ip,
      action: "DEPOSIT",
    });
    if (fraud.flagged) {
      return res.status(400).json({ success: false, error: "Transaction flagged for review", fraud });
    }
    const wallet = await createDeposit({ userId: (req as any).user.id, ...req.body });
    res.status(201).json({ success: true, wallet });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/wallets/withdraw
router.post("/withdraw", requirePlan("PREMIUM"), createBodyValidator(withdrawalSchema), async (req, res) => {
  try {
    const fraud = await runFraudChecks({
      userId: (req as any).user.id,
      amount: req.body.amount,
      ipAddress: req.ip,
      action: "WITHDRAWAL",
    });
    if (fraud.flagged) {
      return res.status(400).json({ success: false, error: "Withdrawal flagged for review", fraud });
    }
    const wallet = await createWithdrawal({ userId: (req as any).user.id, ...req.body });
    res.json({ success: true, wallet });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
