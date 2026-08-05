import { Router } from "express";
import { authRequired } from "../services/auth.service";
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
  getUnreadCount,
} from "../services/notification.service";

const router = Router();

router.use(authRequired);

// GET /api/notifications
router.get("/", async (req, res) => {
  try {
    const unreadOnly = req.query.unreadOnly === "true";
    const notifications = await getNotifications((req as any).user.id, unreadOnly);
    res.json({ success: true, notifications });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// GET /api/notifications/unread-count
router.get("/unread-count", async (req, res) => {
  try {
    const count = await getUnreadCount((req as any).user.id);
    res.json({ success: true, count });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/notifications/:id/read
router.post("/:id/read", async (req, res) => {
  try {
    const notification = await markNotificationRead((req as any).user.id, req.params.id);
    res.json({ success: true, notification });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// POST /api/notifications/read-all
router.post("/read-all", async (req, res) => {
  try {
    const result = await markAllRead((req as any).user.id);
    res.json({ success: true, updated: result.count });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
