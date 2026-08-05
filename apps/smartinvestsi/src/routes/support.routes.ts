import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, adminRequired } from "../services/auth.service";
import {
  createTicket,
  getMyTickets,
  getTicket,
  addMessage,
  adminListTickets,
  updateTicketStatus,
} from "../services/support.service";

const router = Router();

const ticketSchema = z.object({
  subject: z.string().min(3),
  category: z.enum(["PAYMENTS", "TRADING", "KYC", "ACCOUNT", "TECHNICAL", "OTHER"]),
  message: z.string().min(3),
});

const messageSchema = z.object({
  message: z.string().min(1).max(4000),
});

const statusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

// POST /api/support/tickets
router.post("/tickets", authRequired, createBodyValidator(ticketSchema), async (req, res) => {
  try {
    const ticket = await createTicket({
      userId: (req as any).user.id,
      userEmail: (req as any).user.email,
      ...req.body,
    });
    res.status(201).json({ success: true, ticket });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/support/tickets
router.get("/tickets", authRequired, async (req, res) => {
  try {
    const tickets = await getMyTickets((req as any).user.id);
    res.json({ success: true, tickets });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/support/tickets/:id
router.get("/tickets/:id", authRequired, async (req, res) => {
  try {
    const ticket = await getTicket((req as any).user.id, req.params.id);
    res.json({ success: true, ticket });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/support/tickets/:id/messages
router.post("/tickets/:id/messages", authRequired, createBodyValidator(messageSchema), async (req, res) => {
  try {
    const message = await addMessage({
      ticketId: req.params.id,
      userId: (req as any).user.id,
      content: req.body.message,
    });
    res.json({ success: true, message });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Admin endpoints
// GET /api/support/admin/tickets
router.get("/admin/tickets", authRequired, adminRequired, async (req, res) => {
  try {
    const { status } = req.query;
    const tickets = await adminListTickets({
      status: status as string | undefined,
      page: Number(req.query.page) ?? 1,
      pageSize: Number(req.query.pageSize) ?? 50,
    });
    res.json({ success: true, ...tickets });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// PATCH /api/support/admin/tickets/:id/status
router.patch("/admin/tickets/:id/status", authRequired, adminRequired, createBodyValidator(statusSchema), async (req, res) => {
  try {
    const ticket = await updateTicketStatus({
      ticketId: req.params.id,
      status: req.body.status,
      adminId: (req as any).user.id,
    });
    res.json({ success: true, ticket });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
