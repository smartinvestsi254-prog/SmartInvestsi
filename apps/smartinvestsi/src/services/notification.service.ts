import { prisma } from "../lib/prisma";

export type NotificationChannel = "EMAIL" | "PUSH" | "SMS" | "IN_APP";

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  channel?: NotificationChannel;
  metadata?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type ?? "GENERAL",
      channel: params.channel ?? "IN_APP",
      metadata: (params.metadata as any) ?? undefined,
    },
  });
}

export async function getNotifications(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notif = await prisma.notification.findFirst({ where: { id: notificationId, userId } });
  if (!notif) {
    const err = new Error("Notification not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true, readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}
