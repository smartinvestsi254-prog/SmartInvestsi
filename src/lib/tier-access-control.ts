// src/lib/tier-access-control.ts
import { PrismaClient } from '@prisma/client';
import { auditLogger, AuditEventType } from './audit-logger';

const prisma = new PrismaClient();

export enum SubscriptionTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE'
}

export interface FeatureConfig {
  name: string;
  requiredTier: SubscriptionTier;
  limits?: {
    free?: number;
    premium?: number;
    enterprise?: number;
  };
}

// Feature access configuration
export const FEATURES: Record<string, FeatureConfig> = {
  // Portfolio Management
  'portfolio.create': {
    name: 'Create Portfolio',
    requiredTier: SubscriptionTier.FREE,
    limits: { free: 1, premium: 5, enterprise: -1 }
  },
  'portfolio.view': {
    name: 'View Portfolio',
    requiredTier: SubscriptionTier.FREE
  },
  'portfolio.rebalance': {
    name: 'Portfolio Rebalancing',
    requiredTier: SubscriptionTier.PREMIUM
  },
  
  // Market Data
  'market.realtime': {
    name: 'Real-time Market Data',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'market.historical': {
    name: 'Historical Data',
    requiredTier: SubscriptionTier.FREE,
    limits: { free: 100, premium: 10000, enterprise: -1 }
  },
  
  // Social Trading
  'social.copyTrading': {
    name: 'Copy Trading',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'social.createPosts': {
    name: 'Create Social Posts',
    requiredTier: SubscriptionTier.FREE
  },
  'social.viewTraders': {
    name: 'View Top Traders',
    requiredTier: SubscriptionTier.FREE
  },
  'social.feed': {
    name: 'Social Feed',
    requiredTier: SubscriptionTier.FREE
  },
  
  // Alerts & Notifications
  'alerts.price': {
    name: 'Price Alerts',
    requiredTier: SubscriptionTier.FREE,
    limits: { free: 5, premium: 50, enterprise: -1 }
  },
  'alerts.whatsapp': {
    name: 'WhatsApp Notifications',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'notifications.access': {
    name: 'Notifications',
    requiredTier: SubscriptionTier.FREE
  },
  
  // Advanced Features
  'dividend.tracking': {
    name: 'Dividend Tracking',
    requiredTier: SubscriptionTier.FREE
  },
  'news.aggregation': {
    name: 'News Aggregation',
    requiredTier: SubscriptionTier.FREE
  },
  'roboAdvisor.access': {
    name: 'Robo-Advisor',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'tax.optimization': {
    name: 'Tax Optimization',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'bank.linking': {
    name: 'Bank Account Linking',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'autoInvest.dca': {
    name: 'Auto-Investing (DCA)',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'wallet.multicurrency': {
    name: 'Multi-Currency Wallets',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'fractional.shares': {
    name: 'Fractional Shares',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'benchmark.access': {
    name: 'Performance Benchmarking',
    requiredTier: SubscriptionTier.FREE
  },
  'referral.management': {
    name: 'Referral Program',
    requiredTier: SubscriptionTier.FREE
  },
  
  // Education
  'education.basic': {
    name: 'Basic Courses',
    requiredTier: SubscriptionTier.FREE
  },
  'education.premiumCourses': {
    name: 'Premium Courses',
    requiredTier: SubscriptionTier.PREMIUM
  },
  
  // Language Support
  'language.support': {
    name: 'Multi-Language Support',
    requiredTier: SubscriptionTier.FREE
  },
  
  // API Access
  'api.basic': {
    name: 'API Access',
    requiredTier: SubscriptionTier.PREMIUM,
    limits: { premium: 1000, enterprise: -1 }
  },
  'api.webhooks': {
    name: 'API Webhooks',
    requiredTier: SubscriptionTier.ENTERPRISE
  },
  
  // Support
  'support.priority': {
    name: 'Priority Support',
    requiredTier: SubscriptionTier.PREMIUM
  },
  'support.dedicated': {
    name: 'Dedicated Account Manager',
    requiredTier: SubscriptionTier.ENTERPRISE
  },
  // emergency configuration access (admin toggles fallback authentication)
  'auth.fallback': {
    name: 'Auth Fallback (Supabase)',
    requiredTier: SubscriptionTier.FREE
  }
};

export async function getUserTier(userEmail: string): Promise<SubscriptionTier> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userEmail,
        status: 'ACTIVE',
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      include: {
        tier: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!subscription) {
      return SubscriptionTier.FREE;
    }

    return subscription.tier.name as SubscriptionTier;
  } catch (error) {
    console.error('Error fetching user tier:', error);
    return SubscriptionTier.FREE;
  }
}

export async function checkFeatureAccess(
  userEmail: string,
  featureName: string
): Promise<{ allowed: boolean; reason?: string; userTier: SubscriptionTier; requiredTier: SubscriptionTier }> {
  const feature = FEATURES[featureName];
  
  if (!feature) {
    return {
      allowed: false,
      reason: 'Unknown feature',
      userTier: SubscriptionTier.FREE,
      requiredTier: SubscriptionTier.ENTERPRISE
    };
  }

  const userTier = await getUserTier(userEmail);
  const tierHierarchy = {
    [SubscriptionTier.FREE]: 0,
    [SubscriptionTier.PREMIUM]: 1,
    [SubscriptionTier.ENTERPRISE]: 2
  };

  const hasAccess = tierHierarchy[userTier] >= tierHierarchy[feature.requiredTier];

  // Log access attempt
  await logFeatureAccess(userEmail, featureName, userTier, feature.requiredTier, hasAccess);

  if (!hasAccess) {
    return {
      allowed: false,
      reason: `This feature requires ${feature.requiredTier} tier. Your current tier: ${userTier}`,
      userTier,
      requiredTier: feature.requiredTier
    };
  }

  // Check limits if applicable
  if (feature.limits) {
    const limit = feature.limits[userTier.toLowerCase() as keyof typeof feature.limits];
    if (limit !== undefined && limit !== -1) {
      const usage = await getFeatureUsage(userEmail, featureName);
      if (usage >= limit) {
        return {
          allowed: false,
          reason: `You've reached your ${userTier} tier limit of ${limit} for this feature`,
          userTier,
          requiredTier: feature.requiredTier
        };
      }
    }
  }

  return {
    allowed: true,
    userTier,
    requiredTier: feature.requiredTier
  };
}

async function getFeatureUsage(userEmail: string, featureName: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.featureAccess.count({
    where: {
      userEmail,
      feature: featureName,
      accessGranted: true,
      accessedAt: {
        gte: today
      }
    }
  });

  return count;
}

async function logFeatureAccess(
  userEmail: string,
  feature: string,
  userTier: SubscriptionTier,
  tierRequired: SubscriptionTier,
  accessGranted: boolean,
  reason?: string
): Promise<void> {
  try {
    // Log to AuditLog table
    await auditLogger.logFeatureAccess(
      userEmail,
      feature,
      userTier,
      tierRequired,
      accessGranted,
      reason
    );

    // Also log to legacy FeatureAccess table for backward compatibility
    await prisma.featureAccess.create({
      data: {
        userEmail,
        feature,
        tierRequired,
        userTier,
        accessGranted,
        reason
      }
    });
  } catch (error) {
    console.error('Error logging feature access:', error);
  }
}

export function requireTier(tier: SubscriptionTier) {
  return async (req: any, res: any, next: any) => {
    const userEmail = req.userEmail || req.body?.email;
    
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const userTier = await getUserTier(userEmail);
    const tierHierarchy = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.PREMIUM]: 1,
      [SubscriptionTier.ENTERPRISE]: 2
    };

    if (tierHierarchy[userTier] < tierHierarchy[tier]) {
      // Log access denial
      await auditLogger.logFeatureAccess(
        userEmail,
        `tier.${tier}`,
        userTier,
        tier,
        false,
        `User tier ${userTier} insufficient for ${tier}`,
        undefined,
        req
      );

      return res.status(403).json({
        success: false,
        error: `This feature requires ${tier} tier`,
        code: 'INSUFFICIENT_TIER',
        userTier,
        requiredTier: tier,
        upgradeUrl: '/pricing.html'
      });
    }

    req.userTier = userTier;
    next();
  };
}

export function requireFeature(featureName: string) {
  return async (req: any, res: any, next: any) => {
    const userEmail = req.userEmail || req.body?.email;
    
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // For safe retrieval operations we don't want to consume quota or
    // pollute the access log. `GET` handlers will still be subject to
    // tier restrictions but limits are checked manually (no logging).
    if (req.method === 'GET') {
      const userTier = await getUserTier(userEmail);
      const feature = FEATURES[featureName];
      const tierHierarchy: Record<SubscriptionTier, number> = {
        [SubscriptionTier.FREE]: 0,
        [SubscriptionTier.PREMIUM]: 1,
        [SubscriptionTier.ENTERPRISE]: 2
      };

      if (!feature || tierHierarchy[userTier] < tierHierarchy[feature.requiredTier]) {
        return res.status(403).json({
          success: false,
          error: feature
            ? `This feature requires ${feature.requiredTier} tier`
            : 'Unknown feature',
          code: 'INSUFFICIENT_TIER',
          userTier,
          requiredTier: feature?.requiredTier || SubscriptionTier.ENTERPRISE,
          feature: featureName,
          upgradeUrl: '/pricing.html',
          timestamp: new Date().toISOString()
        });
      }

      req.userTier = userTier;
      return next();
    }

    const access = await checkFeatureAccess(userEmail, featureName);
    
    if (!access.allowed) {
      // Error response includes relevant info for frontend
      const statusCode = access.reason?.includes('limit reached') ? 402 : 403;
      
      return res.status(statusCode).json({
        success: false,
        error: access.reason,
        code: statusCode === 402 ? 'QUOTA_EXCEEDED' : 'INSUFFICIENT_TIER',
        userTier: access.userTier,
        requiredTier: access.requiredTier,
        feature: featureName,
        upgradeUrl: '/pricing.html',
        timestamp: new Date().toISOString()
      });
    }

    req.userTier = access.userTier;
    next();
  };
}

export function requireFeatureWithAdminBypass(featureName: string) {
  return async (req: any, res: any, next: any) => {
    const isAdmin = req.isAdmin || 
                    req.headers['x-admin'] === 'true' ||
                    (req.user && req.user.admin);
    
    if (isAdmin) {
      req.userTier = SubscriptionTier.ENTERPRISE;
      req.isAdmin = true;
      req.bypassedTierCheck = true;
      
      // Log admin bypass
      const userEmail = req.userEmail || req.body?.email || 'admin@system';
      await auditLogger.logAdminAction(
        userEmail,
        `Admin bypassed feature access check for: ${featureName}`,
        undefined,
        { feature: featureName, bypassType: 'admin_override' },
        true,
        undefined,
        req
      );
      
      return next();
    }

    // For GET requests we skip the logging/limit portion but still enforce
    // the tier requirement through the simplified path.
    if (req.method === 'GET') {
      const userEmail = req.userEmail || req.body?.email;
      if (!userEmail) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
      const userTier = await getUserTier(userEmail);
      const feature = FEATURES[featureName];
      const tierHierarchy: Record<SubscriptionTier, number> = {
        [SubscriptionTier.FREE]: 0,
        [SubscriptionTier.PREMIUM]: 1,
        [SubscriptionTier.ENTERPRISE]: 2
      };
      if (!feature || tierHierarchy[userTier] < tierHierarchy[feature.requiredTier]) {
        return res.status(403).json({
          success: false,
          error: feature
            ? `This feature requires ${feature.requiredTier} tier`
            : 'Unknown feature',
          code: 'INSUFFICIENT_TIER',
          userTier,
          requiredTier: feature?.requiredTier || SubscriptionTier.ENTERPRISE,
          feature: featureName,
          upgradeUrl: '/pricing.html',
          timestamp: new Date().toISOString()
        });
      }
      req.userTier = userTier;
      return next();
    }

    return requireFeature(featureName)(req, res, next);
  };
}

export function adminOnly(req: any, res: any, next: any) {
  const isAdmin = req.isAdmin || 
                  req.headers['x-admin'] === 'true' ||
                  (req.user && req.user.admin);
  
  if (!isAdmin) {
    const userEmail = req.userEmail || req.body?.email || 'anonymous';
    
    // Log unauthorized admin access attempt
    auditLogger.logErrorEvent(
      userEmail,
      AuditEventType.SECURITY_EVENT,
      'Unauthorized admin endpoint access attempt',
      'Admin access required but not provided',
      { endpoint: req.originalUrl, method: req.method },
      req
    ).catch(err => console.error('Failed to log security event:', err));

    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED',
      requiresAdmin: true,
      timestamp: new Date().toISOString()
    });
  }

  req.isAdmin = true;
  next();
}
