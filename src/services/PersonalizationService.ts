import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess, SubscriptionTier } from '../lib/tier-access-control'; // Reuse if exists, else mock
import { dbClient } from '../../lib/db-client';

const prisma = dbClient.getClient();

interface Recommendation {
  category: string; // 'crypto', 'stocks', 'banking', 'premium_upgrade'
  title: string;
  description: string;
  priority: number; // 1-10
  actionUrl: string;
  estimatedReturn?: string;
}

export class PersonalizationService {
  /**
   * Get user profile and preferences
   */
  async getProfile(userId: string): Promise<any> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: { user: { select: { subscriptionTier: true, email: true } } }
    });

    return {
      riskTolerance: profile?.riskTolerance || 'MODERATE',
      investmentGoals: profile?.investmentGoals || [],
      preferences: profile?.preferences || {},
      subscriptionTier: profile?.user?.subscriptionTier || 'FREE'
    };
  }

  /**
   * Update user profile (risk, goals, prefs)
   */
  async updateProfile(userId: string, data: {
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
    investmentGoals: string[];
    preferences: Record<string, any>;
  }): Promise<any> {
    const access = await checkFeatureAccess ? await checkFeatureAccess(userId.replace(/@.*/, ''), 'profile.update') : { allowed: true }; // Mock if not exist
    if (!access.allowed) throw new Error(access.reason || 'Upgrade required');

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        riskTolerance: data.riskTolerance,
        investmentGoals: data.investmentGoals as any,
        preferences: data.preferences
      },
      create: {
        userId,
        riskTolerance: data.riskTolerance,
        investmentGoals: data.investmentGoals as any,
        preferences: data.preferences
      }
    });

    return profile;
  }

  /**
   * Generate personalized recommendations (premium feature)
   */
  async getRecommendations(userId: string, profileData?: any): Promise<Recommendation[]> {
    const tier = profileData?.subscriptionTier || 'FREE';
    if (tier === 'FREE') {
      return [{
        category: 'premium_upgrade',
        title: 'Unlock Personalized Recommendations',
        description: 'Get AI-powered investment suggestions based on your risk profile.',
        priority: 10,
        actionUrl: '/pricing.html#premium'
      }];
    }

    // Mock AI recs based on profile (integrate OpenAI/Groq later)
    const recs: Recommendation[] = [];

    if (profileData?.riskTolerance === 'AGGRESSIVE' && profileData.preferences?.crypto) {
      recs.push({
        category: 'crypto',
        title: 'DeFi Yield Opportunity',
        description: 'Stake USDC on Aave for 5-8% APY with your aggressive profile.',
        priority: 9,
        actionUrl: '/crypto-trading.html#staking',
        estimatedReturn: '5-8% APY'
      });
    }

    if (profileData?.investmentGoals?.includes('growth')) {
      recs.push({
        category: 'premium',
        title: 'Portfolio Rebalance Suggested',
        description: 'Your crypto allocation is 100%. Diversify for better risk-adjusted returns.',
        priority: 8,
        actionUrl: '/dashboard.html#portfolio'
      });
    }

    recs.push({
      category: 'referral',
      title: 'Refer a Friend, Get Premium Free',
      description: 'Invite friends and earn premium months on successful referrals.',
      priority: 7,
      actionUrl: '/dashboard.html#referrals'
    });

    return recs.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Referral creation/tracking
   */
  async createReferral(userId: string, refereeEmail: string): Promise<any> {
    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        refereeEmail,
        status: 'PENDING',
        rewardTier: 'PREMIUM'
      }
    });
    return referral;
  }

  async completeReferral(referrerId: string, refereeId: string): Promise<any> {
    const referral = await prisma.referral.updateMany({
      where: {
        referrerId,
        refereeId,
        status: 'PENDING'
      },
      data: {
        status: 'REWARDED',
        completedAt: new Date()
      }
    });

    if (referral.count > 0) {
      // Auto-grant reward (call admin-api logic)
      console.log(`Referral rewarded: grant PREMIUM trial to ${referrerId}`);
    }

    return referral;
  }
}

// Singleton export
export const personalizationService = new PersonalizationService();

