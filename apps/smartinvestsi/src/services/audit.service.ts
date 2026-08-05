import { prisma } from "../lib/prisma";

export interface AuditInput {
  userId?: string;
  userEmail?: string;
  eventType: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  success: boolean;
  errorMessage?: string;
}

export async function writeAuditLog(entry: AuditInput) {
  return prisma.auditLog.create({
    data: {
      userId: entry.userId,
      userEmail: entry.userEmail,
      eventType: entry.eventType,
      action: entry.action,
      details: (entry.details as any) ?? undefined,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      deviceId: entry.deviceId,
      success: entry.success,
      errorMessage: entry.errorMessage,
    },
  });
}

export async function queryAuditLogs(params: {
  userId?: string;
  eventType?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const where = {
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.eventType ? { eventType: params.eventType } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function getAuditStats() {
  const [total, successes, failures] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { success: true } }),
    prisma.auditLog.count({ where: { success: false } }),
  ]);

  const byEventType = await prisma.auditLog.groupBy({
    by: ["eventType"],
    _count: { _all: true },
  });

  return {
    total,
    successes,
    failures,
    byEventType: byEventType.map((e) => ({ eventType: e.eventType, count: e._count._all })),
  };
}
