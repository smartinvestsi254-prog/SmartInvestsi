import { prisma } from "../lib/prisma";

export type KycDocumentType =
  | "NATIONAL_ID"
  | "PASSPORT"
  | "SELFIE"
  | "ADDRESS_PROOF"
  | "DRIVERS_LICENSE";

export type KycStatus =
  | "NOT_SUBMITTED"
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_MORE_INFO";

export interface SubmitKycInput {
  userId: string;
  documentType: KycDocumentType;
  documentUrl: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function submitKycDocument(input: SubmitKycInput) {
  const doc = await prisma.kycDocument.create({
    data: {
      userId: input.userId,
      documentType: input.documentType as any,
      documentUrl: input.documentUrl,
      status: "PENDING",
      metadata: (input.metadata as any) ?? undefined,
    },
  });

  // Update profile KYC status
  await prisma.userProfile.update({
    where: { userId: input.userId },
    data: { kycStatus: "PENDING" },
  });

  // Create a verification record
  await prisma.kycVerification.create({
    data: {
      userId: input.userId,
      status: "PENDING",
      documents: { [input.documentType]: input.documentUrl } as any,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });

  return doc;
}

export async function getKycStatus(userId: string) {
  const docs = await prisma.kycDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  const statusMap: Record<string, KycStatus> = {
    NATIONAL_ID: "NOT_SUBMITTED",
    PASSPORT: "NOT_SUBMITTED",
    SELFIE: "NOT_SUBMITTED",
    ADDRESS_PROOF: "NOT_SUBMITTED",
  };

  for (const doc of docs) {
    statusMap[doc.documentType] = doc.status as KycStatus;
  }

  return {
    overallStatus: profile?.kycStatus ?? "NOT_SUBMITTED",
    documents: statusMap,
    submitted: docs,
  };
}

export async function reviewKycDocument(params: {
  documentId: string;
  reviewerId: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_MORE_INFO";
  notes?: string;
}) {
  const doc = await prisma.kycDocument.findUnique({ where: { id: params.documentId } });
  if (!doc) throw new Error("KYC document not found");

  const status: KycStatus =
    params.decision === "APPROVE"
      ? "APPROVED"
      : params.decision === "REJECT"
      ? "REJECTED"
      : "NEEDS_MORE_INFO";

  const updated = await prisma.kycDocument.update({
    where: { id: doc.id },
    data: {
      status: status as any,
      reviewedBy: params.reviewerId,
      reviewedAt: new Date(),
      rejectionReason: params.decision === "REJECT" ? params.notes : undefined,
    },
  });

  // Update verification record
  await prisma.kycVerification.updateMany({
    where: { userId: doc.userId },
    data: {
      status: status as any,
      reviewedBy: params.reviewerId,
      reviewedAt: new Date(),
      decision: params.decision,
      decisionNotes: params.notes,
    },
  });

  // If approved, update profile
  if (status === "APPROVED") {
    await prisma.userProfile.update({
      where: { userId: doc.userId },
      data: { kycStatus: "APPROVED" },
    });
  } else if (status === "REJECTED") {
    await prisma.userProfile.update({
      where: { userId: doc.userId },
      data: { kycStatus: "REJECTED" },
    });
  }

  return updated;
}

export async function listPendingKyc() {
  return prisma.kycDocument.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { email: true, id: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function auditKycAction(entry: {
  userId: string;
  userEmail?: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}) {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      userEmail: entry.userEmail,
      eventType: "KYC",
      action: entry.action,
      details: (entry.details as any) ?? undefined,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      success: entry.success,
    },
  });
}
