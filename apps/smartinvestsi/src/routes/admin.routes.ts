import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, adminRequired } from "../services/auth.service";
import {
  adminDashboardStats,
  listUsers,
  updateUserStatus,
  listPaymentTransactions,
  listFraudChecks,
} from "../services/admin.service";
import { queryAuditLogs, getAuditStats } from "../services/audit.service";

const router = Router();

router.use(authRequired, adminRequired);

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["USER", "ADMIN", "SUPPORT", "ANALYST", "COMPLIANCE"]).optional(),
});

// GET /api/admin/dashboard
router.get("/dashboard", async (_req, res) => {
  try {
    const stats = await adminDashboardStats();
    res.json({ success: true, ...stats });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await listUsers({
      page: Number(req.query.page) ?? 1,
      pageSize: Number(req.query.pageSize) ?? 50,
      search: req.query.search as string | undefined,
    });
    res.json({ success: true, ...users });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// PATCH /api/admin/users/:id
router.patch("/users/:id", createBodyValidator(updateUserSchema), async (req, res) => {
  try {
    const user = await updateUserStatus(req.params.id, req.body);
    res.json({ success: true, user });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/transactions
router.get("/transactions", async (req, res) => {
  try {
    const transactions = await listPaymentTransactions({
      page: Number(req.query.page) ?? 1,
      pageSize: Number(req.query.pageSize) ?? 50,
      status: req.query.status as string | undefined,
    });
    res.json({ success: true, ...transactions });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/fraud
router.get("/fraud", async (_req, res) => {
  try {
    const checks = await listFraudChecks();
    res.json({ success: true, checks });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/audit-logs
router.get("/audit-logs", async (req, res) => {
  try {
    const logs = await queryAuditLogs({
      userId: req.query.userId as string | undefined,
      eventType: req.query.eventType as string | undefined,
      page: Number(req.query.page) ?? 1,
      pageSize: Number(req.query.pageSize) ?? 50,
    });
    res.json({ success: true, ...logs });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/audit-stats
router.get("/audit-stats", async (_req, res) => {
  try {
    const stats = await getAuditStats();
    res.json({ success: true, ...stats });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
