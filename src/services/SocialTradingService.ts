// src/services/SocialTradingService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../lib/tier-access-control';

const prisma = new PrismaClient();

export class SocialTradingService {
  
  async getTopTraders(limit: number = 20) {
    return await prisma.trader.findMany({
      where: {
        isPublic: true,
        isVerified: true
      },
      orderBy: [
        { totalReturn: 'desc' },
        { followerCount: 'desc' }
      ],
      take: limit,
      include: {
        _count: {
          select: { followers: true, trades: true }
        }
      }
    });
  }

  async getTraderProfile(traderId: string) {
    const trader = await prisma.trader.findUnique({
      where: { id: traderId },
      include: {
        trades: {
          where: { isPublic: true },
          orderBy: { executedAt: 'desc' },
          take: 20
        },
        performance: {
          orderBy: { date: 'desc' },
          take: 90
        },
        _count: {
          select: { followers: true, trades: true }
        }
      }
    });

    if (!trader) {
      throw new Error('Trader not found');
    }

    return trader;
  }

  async followTrader(followerEmail: string, traderId: string, allocatedAmount: number) {
    const access = await checkFeatureAccess(followerEmail, 'social.copyTrading');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const trader = await prisma.trader.findUnique({
      where: { id: traderId }
    });

    if (!trader || !trader.isPublic) {
      throw new Error('Trader not available for copying');
    }

    const existingFollow = await prisma.copyTrader.findFirst({
      where: { followerEmail, traderId, isActive: true }
    });

    if (existingFollow) {
      throw new Error('Already following this trader');
    }

    const copyTrader = await prisma.copyTrader.create({
      data: {
        followerEmail,
        traderId,
        allocatedAmount,
        isActive: true,
        autoCopy: true
      }
    });

    await prisma.trader.update({
      where: { id: traderId },
      data: {
        followerCount: { increment: 1 }
      }
    });

    return copyTrader;
  }

  async unfollowTrader(followerEmail: string, copyTraderId: string) {
    const copyTrader = await prisma.copyTrader.findFirst({
      where: { id: copyTraderId, followerEmail }
    });

    if (!copyTrader) {
      throw new Error('Copy trading relationship not found');
    }

    await prisma.copyTrader.update({
      where: { id: copyTraderId },
      data: {
        isActive: false,
        pausedAt: new Date()
      }
    });

    await prisma.trader.update({
      where: { id: copyTrader.traderId },
      data: {
        followerCount: { decrement: 1 }
      }
    });

    return { success: true };
  }

  async createPost(userEmail: string, content: string, symbols?: string[], sentiment?: string) {
    const trader = await prisma.trader.findUnique({
      where: { userEmail }
    });

    if (!trader) {
      throw new Error('Trader profile not found. Create one first.');
    }

    const post = await prisma.socialPost.create({
      data: {
        traderId: trader.id,
        content,
        symbols: symbols || [],
        sentiment,
        imageUrls: []
      }
    });

    return post;
  }

  async getFeed(limit: number = 50, offset: number = 0) {
    return await prisma.socialPost.findMany({
      take: limit,
      skip: offset,
      orderBy: { postedAt: 'desc' },
      include: {
        trader: {
          select: {
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            totalReturn: true
          }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      }
    });
  }

  async likePost(postId: string, userEmail: string) {
    const existing = await prisma.socialLike.findUnique({
      where: {
        postId_userEmail: { postId, userEmail }
      }
    });

    if (existing) {
      await prisma.socialLike.delete({
        where: { id: existing.id }
      });

      await prisma.socialPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } }
      });

      return { liked: false };
    } else {
      await prisma.socialLike.create({
        data: { postId, userEmail }
      });

      await prisma.socialPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } }
      });

      return { liked: true };
    }
  }

  async addComment(postId: string, userEmail: string, content: string) {
    const comment = await prisma.socialComment.create({
      data: { postId, userEmail, content }
    });

    await prisma.socialPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } }
    });

    return comment;
  }
}
