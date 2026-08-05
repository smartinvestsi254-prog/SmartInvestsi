// src/licensing/entitlements.ts
import { PrismaClient, DataUsagePurpose, LicenseStatus } from "@prisma/client";

const prisma = new PrismaClient();

type CheckParams = {
  datasetKey: string;
  purpose: DataUsagePurpose;
  actorUserId?: string | null;
  ip?: string;
  userAgent?: string;
  requestMeta?: any;
};

export async function checkEntitlementAndLog(params: CheckParams) {
  const now = new Date();

  // Find ACTIVE license(s) that entitle this datasetKey for this purpose.
  // If you need more complex rules (regions, per-tenant), extend here.
  const licenses = await prisma.dataLicense.findMany({
    where: {
      status: LicenseStatus.ACTIVE,
      OR: [
        { endDate: null },
        { endDate: { gt: now } },
      ],
      allowedPurposes: { has: params.purpose },
      entitlements: { some: { datasetKey: params.datasetKey } },
    },
    include: { partner: true, entitlements: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const best = licenses[0];

  const allowed = Boolean(best);
  const licenseId = best?.id ?? null;

  await prisma.dataUsageLog.create({
    data: {
      licenseId: licenseId ?? undefined,
      datasetKey: params.datasetKey,
      purpose: params.purpose,
      actorUserId: params.actorUserId ?? undefined,
      ip: params.ip,
      userAgent: params.userAgent,
      requestMeta: params.requestMeta,
    },
  });

  if (!allowed) {
    return {
      allowed: false,
      reason: "No active license entitlement for datasetKey + purpose",
      datasetKey: params.datasetKey,
      purpose: params.purpose,
    };
  }

  return {
    allowed: true,
    licenseId: best!.id,
    partner: { id: best!.partnerId, name: best!.partner.name },
    attributionRequired: best!.attributionRequired,
    attributionText: best!.attributionText,
    allowRedistribution: best!.allowRedistribution,
    rateLimitPerMin: best!.rateLimitPerMin,
  };
}
