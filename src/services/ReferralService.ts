// src/services/ReferralService.ts
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class ReferralService {
  
  async generateReferralCode(userEmail: string): Promise<string> {
    // Check if user already has a code
    const existing = await prisma.referral.findFirst({
      where: {
        referrerEmail: userEmail,
        status: { not: 'EXPIRED' }
      }
    });

    if (existing) {
      return existing.referralCode;
    }

    // Generate unique code
    const code = this.createUniqueCode(userEmail);
    
    await prisma.referral.create({
      data: {
        referrerEmail: userEmail,
        referralCode: code,
        status: 'PENDING'
      }
    });

    return code;
  }

  private createUniqueCode(email: string): string {
    const hash = crypto.createHash('sha256').update(email + Date.now()).digest('hex');
    return hash.substring(0, 8).toUpperCase();
  }

  async applyReferralCode(referredEmail: string, referralCode: string) {
    const referral = await prisma.referral.findUnique({
      where: { referralCode }
    });

    if (!referral) {
      throw new Error('Invalid referral code');
    }

    if (referral.status !== 'PENDING') {
      throw new Error('Referral code already used or expired');
    }

    if (referral.referrerEmail === referredEmail) {
      throw new Error('Cannot use your own referral code');
    }

    // Update referral
    await prisma.referral.update({
      where: { referralCode },
      data: {
        referredEmail,
        status: 'CONVERTED',
        convertedAt: new Date()
      }
    });

    // Grant rewards to both parties
    await this.grantRewards(referral.referrerEmail, referredEmail);

    return { success: true, message: 'Referral applied successfully' };
  }

  private async grantRewards(referrerEmail: string, referredEmail: string) {
    // Reward for referrer
    await prisma.referralReward.create({
      data: {
        userEmail: referrerEmail,
        amount: 10, // $10 bonus
        currency: 'USD',
        type: 'REFERRAL_BONUS',
        status: 'PENDING'
      }
    });

    // Welcome bonus for referred user
    await prisma.referralReward.create({
      data: {
        userEmail: referredEmail,
        amount: 5, // $5 welcome bonus
        currency: 'USD',
        type: 'SIGNUP_BONUS',
        status: 'PENDING'
      }
    });
  }

  async getReferralStats(userEmail: string) {
    const referrals = await prisma.referral.findMany({
      where: { referrerEmail: userEmail }
    });

    const rewards = await prisma.referralReward.findMany({
      where: { userEmail, type: 'REFERRAL_BONUS' }
    });

    const totalReferred = referrals.filter(r => r.status === 'CONVERTED').length;
    const pendingReferrals = referrals.filter(r => r.status === 'PENDING').length;
    const totalEarned = rewards.reduce((sum, r) => sum + r.amount, 0);
    const pendingEarnings = rewards
      .filter(r => r.status === 'PENDING')
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      totalReferred,
      pendingReferrals,
      totalEarned,
      pendingEarnings,
      referralCode: referrals[0]?.referralCode || await this.generateReferralCode(userEmail)
    };
  }

  async getMyRewards(userEmail: string) {
    return await prisma.referralReward.findMany({
      where: { userEmail },
      orderBy: { createdAt: 'desc' }
    });
  }
}
