import { prisma } from "../lib/prisma";

export async function createReferralCode(userId: string) {
  const existing = await prisma.referral.findFirst({ where: { referrerId: userId } });
  if (existing) return existing;

  const code = `SI${userId.slice(0, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
  return prisma.referral.create({
    data: {
      referrerId: userId,
      code,
      status: "ACTIVE",
    },
  });
}

export async function getMyReferral(userId: string) {
  const referral = await prisma.referral.findFirst({
    where: { referrerId: userId },
    include: { referredUsers: true },
  });
  if (!referral) return createReferralCode(userId);
  return referral;
}

export async function applyReferral(referrerCode: string, referredUserId: string) {
  const referral = await prisma.referral.findUnique({ where: { code: referrerCode } });
  if (!referral) return null;

  if (referral.referrerId === referredUserId) return null;

  return prisma.referral.record.create({
    data: {
      referralId: referral.id,
      referredUserId,
      rewardStatus: "PENDING",
    },
  });
}

export async function getReferralStats(userId: string) {
  const referral = await prisma.referral.findFirst({
    where: { referrerId: userId },
    include: { records: true },
  });
  if (!referral) return { code: null, totalReferrals: 0, pendingRewards: 0 };

  const totalReferrals = referral.records.length;
  const pendingRewards = referral.records.filter((r) => r.rewardStatus === "PENDING").length;
  return {
    code: referral.code,
    totalReferrals,
    pendingRewards,
    records: referral.records,
  };
}
