import { prisma } from "../lib/prisma";

export type PlanName = "BASIC" | "PREMIUM" | "ENTERPRISE";

export async function listPlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
}

export async function getMySubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyPlan(userId: string): Promise<PlanName> {
  const sub = await getMySubscription(userId);
  if (!sub) return "BASIC";
  const name = sub.plan.name.toUpperCase();
  if (name === "PREMIUM" || name === "ENTERPRISE" || name === "BASIC") {
    return name as PlanName;
  }
  return "BASIC";
}

export async function cancelSubscription(userId: string, reason?: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (!sub) {
    const err = new Error("No active subscription") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
  });
}

export async function upgradePlan(userId: string, planId: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    const err = new Error("Plan not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  // Cancel existing active subscription
  await prisma.subscription.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Upgraded plan" },
  });

  return prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentMethod: "MANUAL",
    },
  });
}

/**
 * Check plan access for a user (used by requirePlan middleware).
 * Returns the user's current plan.
 */
export async function checkPlanAccess(userId: string, required: PlanName): Promise<boolean> {
  const hierarchy: Record<PlanName, number> = { BASIC: 0, PREMIUM: 1, ENTERPRISE: 2 };
  const userPlan = await getMyPlan(userId);
  return hierarchy[userPlan] >= hierarchy[required];
}
