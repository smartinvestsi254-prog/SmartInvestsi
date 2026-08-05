import { PrismaClient } from '@prisma/client';
import { dbClient } from '../../lib/db-client';
import { personalizationService } from './PersonalizationService';

const prisma = dbClient.getClient();

export class ReferralService {
  /**
   * Generate referral code/link for user
   */
  async generateReferralCode(userId: string): Promise<string> {
    const code = `REF-${userId.slice(-6)}${Math.random().toString(36).substr(2,4).toUpperCase()}`;
    // Store in user prefs or separate table if needed
    await prisma.userProfile.update({
      where: { userId },
      data: {
        preferences: {
          update: {
            referralCode: code,
            referralLink: `/signup?ref=${code}`
          }
        }
      }
    }).catch(() => {}); // Ignore if no profile

    return code;
  }

  /**
   * Create new referral
   */
  async createReferral(userId: string, refereeEmail: string): Promise<any> {
    // Check if referrer has active referrals limit (tier-based)
    const count = await prisma.referral.count({ where: { referrerId: userId } });
    if (count >= 10) throw new Error('Referral limit reached (10 max)');

    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        refereeEmail,
        status: 'PENDING',
        rewardTier: 'PREMIUM' // Default, upgrade on signup
      },
      include: { referrer: { select: { email: true } } }
    });

    logger.info('Referral created', { referralId: referral.id, referrerId: userId, refereeEmail });
    return referral;
  }

  /**
   * Complete referral when referee signs up
   */
  async completeReferral(referralId: string, refereeId: string): Promise<any> {
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      include: { referrer: true }
    });

    if (!referral || referral.status !== 'PENDING') {
      throw new Error('Invalid or already completed referral');
    }

    await prisma.$transaction(async (tx) => {
      // Update referral status
      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: 'REWARDED',
          refereeId,
          completedAt: new Date()
        }
      });

      // Auto-grant reward to referrer (mock admin grant)
      if (referral.rewardTier === 'PREMIUM') {
        // Call admin logic or direct update
        await tx.user.update({
          where: { id: referral.referrerId },
          data: { subscriptionTier: 'PREMIUM' } // Extend for expiry
        });
      }
    });

    logger.info('Referral completed & rewarded', { referralId, referrerId: referral.referrerId, refereeId });
    return { success: true, message: 'Referral completed, reward granted' };
  }

  /**
   * Get user's referrals
   */
  async getUserReferrals(userId: string): Promise<any> {
    return prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referee: { select: { email: true, subscriptionTier: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get referral stats
   */
  async getReferralStats(userId: string): Promise<any> {
    const [total, rewarded, pending] = await Promise.all([
      prisma.referral.count({ where: { referrerId: userId } }),
      prisma.referral.count({ where: { referrerId: userId, status: 'REWARDED' } }),
      prisma.referral.count({ where: { referrerId: userId, status: 'PENDING' } })
    ]);

    return { total, rewarded, pending };
  }
}

export const referralService = new ReferralService();

