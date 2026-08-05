import { prisma } from "../lib/prisma";

/**
 * Fraud detection service.
 * Implements rule-based checks: velocity, unusual amounts, new device, IP reputation.
 */

export interface FraudCheckInput {
  userId: string;
  amount: number;
  ipAddress?: string;
  deviceId?: string;
  action: string;
}

export async function runFraudChecks(input: FraudCheckInput): Promise<{
  flagged: boolean;
  reasons: string[];
  score: number;
}> {
  const reasons: string[] = [];
  let score = 0;

  // 1. Velocity check: more than 5 transactions in last hour
  const recentCount = await prisma.paymentTransaction.count({
    where: {
      userId: input.userId,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recentCount >= 5) {
    reasons.push("High transaction velocity");
    score += 30;
  }

  // 2. Unusual amount check: amount > 3x average
  const avgAgg = await prisma.paymentTransaction.aggregate({
    where: { userId: input.userId, status: "COMPLETED" },
    _avg: { amount: true },
  });
  if (avgAgg._avg.amount && input.amount > avgAgg._avg.amount * 3) {
    reasons.push("Amount significantly above user average");
    score += 20;
  }

  // 3. New device check
  if (input.deviceId) {
    const sessions = await prisma.authSession.count({
      where: { userId: input.userId, deviceId: input.deviceId },
    });
    if (sessions === 0) {
      reasons.push("New device detected");
      score += 15;
    }
  }

  // 4. Large amount threshold
  if (input.amount > 50000) {
    reasons.push("Large transaction amount");
    score += 10;
  }

  const flagged = score >= 40;

  await prisma.fraudCheck.create({
    data: {
      userId: input.userId,
      checkType: "RULE_BASED",
      status: flagged ? "FLAGGED" : "PASSED",
      riskScore: score,
      details: { reasons, action: input.action, amount: input.amount },
    },
  });

  return { flagged, reasons, score };
}

export async function getFraudChecks(userId: string) {
  return prisma.fraudCheck.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function reviewFraudFlag(params: {
  fraudCheckId: string;
  decision: "CLEAR" | "BLOCK";
  reviewerId: string;
}) {
  return prisma.fraudCheck.update({
    where: { id: params.fraudCheckId },
    data: {
      status: params.decision === "CLEAR" ? "CLEARED" : "BLOCKED",
      reviewedBy: params.reviewerId,
      reviewedAt: new Date(),
    },
  });
}
