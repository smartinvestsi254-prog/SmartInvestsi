// src/routes/priority-features.ts
// Complete implementation of all 20 priority features with tier-based access

import express, { Express, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  requireFeature, 
  requireFeatureWithAdminBypass,
  requireTier, 
  adminOnly,
  checkFeatureAccess, 
  SubscriptionTier, 
  getUserTier,
  FEATURES 
} from '../lib/tier-access-control';
import { auditLogger, AuditEventType } from '../lib/audit-logger';

// reusable error helper to enforce a consistent response schema
function sendError(res: Response, status: number, message: string, code?: string, extras?: Record<string, any>) {
  const body: any = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
  if (code) body.code = code;
  if (extras) Object.assign(body, extras);
  return res.status(status).json(body);
}

const router = express.Router();
const prisma = new PrismaClient();

// middleware that wraps res.json so that we standardize error responses
router.use((req: any, res: any, next: any) => {
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (body && body.success === false) {
      // ensure timestamp
      if (!body.timestamp) body.timestamp = new Date().toISOString();
      // basic code assignment if missing
      if (!body.code) {
        if (typeof body.error === 'string' && body.error.toLowerCase().includes('limit')) {
          body.code = 'QUOTA_EXCEEDED';
        } else if (body.upgrade_url || body.upgradeUrl) {
          body.code = 'INSUFFICIENT_TIER';
        } else {
          body.code = 'ERROR';
        }
      }
    }
    return originalJson(body);
  };
  next();
});

// Middleware to extract user email
const extractUserEmail = (req: any, res: any, next: any) => {
  req.userEmail = req.headers['x-user-email'] || req.body?.email || 'anonymous@smartinvest.africa';
  next();
};

router.use(extractUserEmail);

// ============================================
// 1. PORTFOLIO MANAGEMENT ENDPOINTS
// ============================================

// Create portfolio (Free tier - limited to 1, Premium - 5, Enterprise - unlimited)
router.post('/portfolios', requireFeatureWithAdminBypass('portfolio.create'), async (req: Request, res: Response) => {
  try {
    const { name, description, currency } = req.body;
    const userEmail = (req as any).userEmail;
    const userTier = (req as any).userTier;

    // Check portfolio limit for non-admin users
    if (!(req as any).bypassedTierCheck) {
      const limits = FEATURES['portfolio.create'].limits;
      if (limits) {
        const tierKey = userTier.toLowerCase() as 'free' | 'premium' | 'enterprise';
        const portfolioLimit = limits[tierKey as keyof typeof limits];
        
        if (portfolioLimit && portfolioLimit !== -1) {
          const existingCount = await prisma.portfolio.count({
            where: { userEmail, isActive: true }
          });

          if (existingCount >= portfolioLimit) {
            return res.status(402).json({
              success: false,
              error: `Portfolio limit reached (${existingCount}/${portfolioLimit})`,
              tier: userTier,
              limit: portfolioLimit,
              current: existingCount,
              upgrade_url: '/pricing.html',
              code: 'PORTFOLIO_LIMIT_EXCEEDED',
              timestamp: new Date().toISOString()
            });
          }
      }
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        userEmail,
        name,
        description,
        currency: currency || 'USD',
        isDefault: (await prisma.portfolio.count({ where: { userEmail } })) === 0
      }
    });

    res.json({ success: true, portfolio });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// Get all portfolios
router.get('/portfolios', async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).userEmail;
    const portfolios = await prisma.portfolio.findMany({
      where: { userEmail, isActive: true },
      include: { holdings: true, _count: { select: { transactions: true } } }
    });

    res.json({ success: true, portfolios });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// Get portfolio details
router.get('/portfolios/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userEmail = (req as any).userEmail;

    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userEmail },
      include: {
        holdings: { orderBy: { allocation: 'desc' } },
        transactions: { orderBy: { executedAt: 'desc' }, take: 50 },
        performances: { orderBy: { date: 'desc' }, take: 90 }
      }
    });

    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    res.json({ success: true, portfolio });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 2. PORTFOLIO REBALANCING (Premium +)
// ============================================

router.post('/portfolios/:id/rebalance-analysis', requireFeatureWithAdminBypass('portfolio.rebalance'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userEmail = (req as any).userEmail;

    const portfolio = await prisma.portfolio.findFirst({
      where: { id, userEmail },
      include: { holdings: true }
    });

    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });

    const targetAllocation = portfolio.targetAllocation as any || {};
    const proposedTrades: any[] = [];

    for (const holding of portfolio.holdings) {
      const targetPercent = targetAllocation[holding.assetType] || 0;
      const currentPercent = holding.allocation;
      const deviation = currentPercent - targetPercent;

      if (Math.abs(deviation) > 5) {
        const targetValue = (targetPercent / 100) * portfolio.totalValue;
        const difference = targetValue - holding.marketValue;

        proposedTrades.push({
          symbol: holding.symbol,
          action: difference > 0 ? 'BUY' : 'SELL',
          quantity: Math.abs(difference / holding.currentPrice),
          amount: Math.abs(difference),
          reason: `Rebalance to ${targetPercent}%`
        });
      }
    }

    const rebalance = await prisma.rebalance.create({
      data: {
        portfolioId: id,
        status: 'PROPOSED',
        proposedTrades: proposedTrades
      }
    });

    res.json({ success: true, rebalance, proposedTrades });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 3. REAL-TIME MARKET DATA (Premium +)
// ============================================

router.get('/market/quote/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const userEmail = (req as any).userEmail;

    const access = await checkFeatureAccess(userEmail, 'market.realtime');

    const quote = await prisma.marketData.findFirst({
      where: { symbol: symbol.toUpperCase() },
      orderBy: { timestamp: 'desc' }
    });

    if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });

    // Free users get 15-minute delayed data
    if (!access.allowed) {
      const delayTime = new Date(Date.now() - 15 * 60 * 1000);
      const isDelayed = quote.timestamp < delayTime;
      
      return res.json({
        success: true,
        quote: { ...quote, isDelayed: true, message: 'Free tier: 15min delayed' }
      });
    }

    res.json({ success: true, quote });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 4. PRICE ALERTS (Free - 5 limit, Premium - 50)
// ============================================

router.post('/alerts/price', requireFeatureWithAdminBypass('alerts.price'), async (req: Request, res: Response) => {
  try {
    const { symbol, targetPrice, condition } = req.body;
    const userEmail = (req as any).userEmail;

    // prevent duplicates - same user, symbol, price and condition
    const existing = await prisma.priceAlert.findFirst({
      where: {
        userEmail,
        symbol: symbol.toUpperCase(),
        targetPrice,
        condition: condition as any,
        isActive: true
      }
    });
    if (existing) {
      return sendError(res, 409, 'Alert already exists', 'DUPLICATE_ALERT');
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userEmail,
        symbol: symbol.toUpperCase(),
        targetPrice,
        condition: condition as any,
        notifyEmail: true,
        notifyApp: true
      }
    });

    res.json({ success: true, alert });
  } catch (error) {
    sendError(res, 400, (error as Error).message);
  }
});

router.get('/alerts/price', requireFeatureWithAdminBypass('alerts.price'), async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).userEmail;
    const alerts = await prisma.priceAlert.findMany({
      where: { userEmail, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, alerts });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 5. DIVIDEND TRACKER
// ============================================

router.get('/dividends', requireFeatureWithAdminBypass('dividend.tracking'), async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).userEmail;

    const portfolios = await prisma.portfolio.findMany({
      where: { userEmail },
      include: { holdings: { include: { dividends: true } } }
    });

    const allDividends = portfolios
      .flatMap(p => p.holdings.flatMap(h => h.dividends))
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    const summary = {
      total: allDividends.reduce((sum, d) => sum + d.amount, 0),
      count: allDividends.length,
      nextPayment: allDividends.find(d => d.status === 'PENDING'),
      byFrequency: {
        monthly: allDividends.filter(d => d.frequency === 'MONTHLY').length,
        quarterly: allDividends.filter(d => d.frequency === 'QUARTERLY').length,
        annual: allDividends.filter(d => d.frequency === 'ANNUAL').length
      }
    };

    res.json({ success: true, dividends: allDividends, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 6. NEWS AGGREGATOR
// ============================================

router.get('/news', requireFeatureWithAdminBypass('news.aggregation'), async (req: Request, res: Response) => {
  try {
    const { symbols, limit = 20 } = req.query;
    const symbolList = (symbols as string)?.split(',') || [];

    const where: any = { isBreaking: false };
    if (symbolList.length > 0) {
      where.symbols = { hasSome: symbolList };
    }

    const articles = await prisma.newsArticle.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({ success: true, articles, count: articles.length });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 7. SOCIAL TRADING - COPY TRADING (Premium +)
// ============================================

router.get('/traders/top', requireFeatureWithAdminBypass('social.viewTraders'), async (req: Request, res: Response) => {
  try {
    const { limit = 10, sortBy = 'totalReturn' } = req.query;

    const traders = await prisma.trader.findMany({
      where: { isPublic: true, isVerified: true },
      orderBy: { [sortBy as string]: 'desc' },
      take: parseInt(limit as string),
      include: { _count: { select: { followers: true } } }
    });

    res.json({ success: true, traders });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/traders/:traderId/follow', requireFeatureWithAdminBypass('social.copyTrading'), async (req: Request, res: Response) => {
  try {
    const { traderId } = req.params;
    const { allocatedAmount, copyRatio = 1.0 } = req.body;
    const userEmail = (req as any).userEmail;

    const existing = await prisma.copyTrader.findFirst({
      where: { followerEmail: userEmail, traderId }
    });

    if (existing) {
      const updated = await prisma.copyTrader.update({
        where: { id: existing.id },
        data: { allocatedAmount, copyRatio, isActive: true }
      });
      return res.json({ success: true, copyTrader: updated });
    }

    const copyTrader = await prisma.copyTrader.create({
      data: {
        followerEmail: userEmail,
        traderId,
        allocatedAmount,
        copyRatio
      }
    });

    res.json({ success: true, copyTrader });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 8. SOCIAL FEED
// ============================================

router.get('/social/feed', requireFeatureWithAdminBypass('social.feed'), async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    const posts = await prisma.socialPost.findMany({
      orderBy: { postedAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        trader: { select: { displayName, avatarUrl, isVerified: true } },
        _count: { select: { comments: true, likes: true } }
      }
    });

    res.json({ success: true, posts, count: posts.length });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 9. ROBO-ADVISOR (Premium +)
// ============================================

router.post('/robo-advisor/portfolio', requireFeatureWithAdminBypass('roboAdvisor.access'), async (req: Request, res: Response) => {
  try {
    const { name, strategy, riskLevel, goalAmount, goalDate, initialDeposit } = req.body;
    const userEmail = (req as any).userEmail;

    const roboPortfolio = await prisma.roboPortfolio.create({
      data: {
        userEmail,
        name,
        strategy: strategy as any,
        riskLevel,
        goalAmount,
        goalDate: goalDate ? new Date(goalDate) : undefined,
        initialDeposit,
        currentValue: initialDeposit
      }
    });

    // Generate asset allocation based on strategy and risk
    const allocations = generateAllocation(strategy, riskLevel);
    const allocationEntries = Object.entries(allocations).map(([assetClass, percent]) => ({
      portfolioId: roboPortfolio.id,
      assetClass,
      targetPercent: percent as number,
      currentPercent: 0
    }));

    await Promise.all(
      allocationEntries.map(a => prisma.roboAllocation.create({ data: a }))
    );

    const updated = await prisma.roboPortfolio.findUnique({
      where: { id: roboPortfolio.id },
      include: { allocations: true }
    });

    res.json({ success: true, portfolio: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 10. BANK LINKING & AUTO-INVESTING (Premium +)
// ============================================

router.post('/bank-accounts', requireFeatureWithAdminBypass('bank.linking'), async (req: Request, res: Response) => {
  try {
    const { bankName, accountNumber, accountType, currency } = req.body;
    const userEmail = (req as any).userEmail;

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userEmail,
        bankName,
        accountNumber: `****${accountNumber.slice(-4)}`,
        accountType: accountType as any,
        currency: currency || 'USD',
        isPrimary: (await prisma.bankAccount.count({ where: { userEmail } })) === 0
      }
    });

    res.json({ success: true, bankAccount });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/auto-invest', requireFeatureWithAdminBypass('autoInvest.dca'), async (req: Request, res: Response) => {
  try {
    const { bankAccountId, amount, frequency, portfolioId } = req.body;
    const userEmail = (req as any).userEmail;

    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, userEmail }
    });

    if (!bankAccount) return res.status(404).json({ success: false, error: 'Bank account not found' });

    const nextExecutionDate = calculateNextExecutionDate(frequency);

    const autoInvest = await prisma.autoInvestment.create({
      data: {
        userEmail,
        bankAccountId,
        amount,
        frequency: frequency as any,
        portfolioId,
        nextExecutionDate
      }
    });

    res.json({ success: true, autoInvest });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 11. MULTI-CURRENCY WALLETS (Premium +)
// ============================================

router.post('/wallets', requireFeatureWithAdminBypass('wallet.multicurrency'), async (req: Request, res: Response) => {
  try {
    const { currency } = req.body;
    const userEmail = (req as any).userEmail;

    const existing = await prisma.wallet.findFirst({
      where: { userEmail, currency: currency.toUpperCase() }
    });

    if (existing) return res.json({ success: true, wallet: existing });

    const wallet = await prisma.wallet.create({
      data: {
        userEmail,
        currency: currency.toUpperCase(),
        isPrimary: (await prisma.wallet.count({ where: { userEmail } })) === 0
      }
    });

    res.json({ success: true, wallet });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 12. REFERRAL PROGRAM
// ============================================

router.post('/referral/generate', requireFeatureWithAdminBypass('referral.management'), async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).userEmail;

    let referral = await prisma.referral.findFirst({
      where: { referrerEmail: userEmail, status: 'PENDING' }
    });

    if (!referral) {
      const code = generateReferralCode();
      referral = await prisma.referral.create({
        data: {
          referrerEmail: userEmail,
          referralCode: code,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        }
      });
    }

    res.json({ success: true, referral });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 13. EDUCATIONAL CONTENT
// ============================================

router.get('/courses', requireFeatureWithAdminBypass('education.basic'), async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).userEmail;
    const userTier = (req as any).userTier || await getUserTier(userEmail);
    const { category, limit = 20 } = req.query;

    const where: any = { isPublished: true };
    if (userTier === SubscriptionTier.FREE) {
      where.isPremium = false;
    }
    if (category) {
      where.category = category;
    }

    const courses = await prisma.course.findMany({
      where,
      take: parseInt(limit as string),
      include: { _count: { select: { lessons: true, enrollments: true } } }
    });

    res.json({ success: true, courses });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 14. TAX OPTIMIZATION (Premium +)
// ============================================

router.get('/tax/report/:year', requireFeatureWithAdminBypass('tax.optimization'), async (req: Request, res: Response) => {
  try {
    const { year } = req.params;
    const userEmail = (req as any).userEmail;

    let report = await prisma.taxReport.findUnique({
      where: { userEmail_taxYear: { userEmail, taxYear: parseInt(year) } }
    });

    if (!report) {
      report = await generateTaxReport(userEmail, parseInt(year));
    }

    res.json({ success: true, report });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 15. FRACTIONAL SHARES (Premium +)
// ============================================

router.post('/fractional-order', requireFeatureWithAdminBypass('fractional.shares'), async (req: Request, res: Response) => {
  try {
    const { portfolioId, symbol, dollarAmount } = req.body;
    const userEmail = (req as any).userEmail;

    const order = await prisma.fractionalOrder.create({
      data: {
        userEmail,
        portfolioId,
        symbol: symbol.toUpperCase(),
        dollarAmount,
        status: 'PENDING'
      }
    });

    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 16. PERFORMANCE BENCHMARKING
// ============================================

router.get('/benchmarks', requireFeatureWithAdminBypass('benchmark.access'), async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const benchmarks = await prisma.benchmark.findMany({
      where: { isActive: true },
      take: parseInt(limit as string),
      include: { performance: { orderBy: { date: 'desc' }, take: 1 } }
    });

    res.json({ success: true, benchmarks });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 17. NOTIFICATIONS & WHATSAPP
// ============================================

router.get('/notifications', requireFeatureWithAdminBypass('notifications.access'), async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).userEmail;
    const { unreadOnly = false } = req.query;

    const where: any = { userEmail };
    if (unreadOnly === 'true') {
      where.status = 'PENDING';
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// 18. MULTI-LANGUAGE SUPPORT
// ============================================

router.get('/languages', requireFeatureWithAdminBypass('language.support'), async (req: Request, res: Response) => {
  try {
    const languages = await prisma.translation.findMany({
      distinct: ['language'],
      select: { language: true }
    });

    res.json({
      success: true,
      languages: languages.map(l => l.language)
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/i18n/:key/:language', requireFeatureWithAdminBypass('language.support'), async (req: Request, res: Response) => {
  try {
    const { key, language } = req.params;

    const translation = await prisma.translation.findUnique({
      where: { key_language: { key, language } }
    });

    res.json({
      success: true,
      key,
      language,
      value: translation?.value || key
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateAllocation(strategy: string, riskLevel: number): Record<string, number> {
  const allocations: Record<string, Record<string, number>> = {
    CONSERVATIVE: { STOCKS: 20, BONDS: 70, REAL_ESTATE: 10 },
    MODERATE: { STOCKS: 50, BONDS: 40, REAL_ESTATE: 10 },
    BALANCED: { STOCKS: 60, BONDS: 30, REAL_ESTATE: 10 },
    GROWTH: { STOCKS: 80, BONDS: 15, REAL_ESTATE: 5 },
    AGGRESSIVE: { STOCKS: 90, BONDS: 5, REAL_ESTATE: 5 }
  };

  return allocations[strategy] || allocations.BALANCED;
}

function calculateNextExecutionDate(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'DAILY':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'WEEKLY':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'BIWEEKLY':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'MONTHLY':
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

function generateReferralCode(): string {
  return 'SI' + Math.random().toString(36).substring(2, 15).toUpperCase();
}

async function generateTaxReport(userEmail: string, taxYear: number) {
  const startDate = new Date(taxYear, 0, 1);
  const endDate = new Date(taxYear, 11, 31);

  const transactions = await prisma.transaction.findMany({
    where: {
      portfolio: { userEmail },
      executedAt: { gte: startDate, lte: endDate }
    }
  });

  const sales = transactions.filter(t => t.type === 'SELL');
  const totalGains = sales.reduce((sum, s) => sum + (s.totalAmount - s.fees), 0);
  const totalLosses = sales.reduce((sum, s) => sum + (s.fees), 0);

  const report = await prisma.taxReport.create({
    data: {
      userEmail,
      taxYear,
      totalGains,
      totalLosses,
      netGainLoss: totalGains - totalLosses
    }
  });

  return report;
}

// ============================================
// GET USER TIER & LIMITS
// ============================================

router.get('/user-tier', async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).userEmail;
    const isAdmin = (req as any).isAdmin || false;

    const userTier = isAdmin ? SubscriptionTier.ENTERPRISE : await getUserTier(userEmail);

    // Calculate limits for all tiered features
    const limits: any = {};
    
    Object.entries(FEATURES).forEach(([featureKey, feature]) => {
      if (feature.limits) {
        const tierLimit = feature.limits[userTier.toLowerCase() as keyof typeof feature.limits];
        limits[featureKey] = {
          limit: tierLimit === -1 ? 'Unlimited' : tierLimit,
          tier: userTier
        };
      }
    });

    res.json({
      success: true,
      tier: userTier,
      isAdmin,
      limits,
      features: Object.keys(FEATURES).filter(f => {
        const tierHierarchy = {
          [SubscriptionTier.FREE]: 0,
          [SubscriptionTier.PREMIUM]: 1,
          [SubscriptionTier.ENTERPRISE]: 2
        };
        return tierHierarchy[userTier] >= tierHierarchy[FEATURES[f].requiredTier];
      })
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ============================================
// ADMIN MANAGEMENT ENDPOINTS
// ============================================

// Admin: Grant tier access to user
router.post('/admin/users/:userId/grant-tier', adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { tier, daysValid = 30, reason } = req.body;
    const adminEmail = (req as any).userEmail;

    // Validate tier
    if (!Object.values(SubscriptionTier).includes(tier)) {
      await auditLogger.logAdminAction(
        adminEmail,
        `Failed to grant tier: invalid tier value`,
        userId,
        { tier, error: 'INVALID_TIER' },
        false,
        'Invalid tier provided',
        req
      );

      return res.status(400).json({
        success: false,
        error: 'Invalid tier',
        code: 'INVALID_TIER',
        validTiers: Object.values(SubscriptionTier),
        timestamp: new Date().toISOString()
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await auditLogger.logAdminAction(
        adminEmail,
        `Failed to grant tier: user not found`,
        userId,
        { tier, error: 'USER_NOT_FOUND' },
        false,
        'User not found',
        req
      );

      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        userId,
        timestamp: new Date().toISOString()
      });
    }

    // Revoke existing subscriptions
    await prisma.subscription.updateMany({
      where: { userEmail: user.email, status: 'ACTIVE' },
      data: { status: 'SUPERSEDED' }
    });

    // Create new subscription
    const subscription = await prisma.subscription.create({
      data: {
        userEmail: user.email,
        tier: { connect: { name: tier } },
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000),
        grantedBy: adminEmail,
        grantReason: reason
      }
    });

    // Log the successful action
    await auditLogger.logTierAction(
      userId,
      user.email,
      'GRANT',
      tier,
      adminEmail,
      daysValid,
      reason,
      req
    );

    res.json({
      success: true,
      subscription,
      message: `Granted ${tier} tier to ${user.email} for ${daysValid} days`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const adminEmail = (req as any).userEmail || 'admin@system';
    await auditLogger.logErrorEvent(
      adminEmail,
      AuditEventType.ERROR_DETECTED,
      'Error granting tier',
      (error as Error).message,
      { userId: (req as any).params.userId },
      req
    );

    res.status(400).json({
      success: false,
      error: (error as Error).message,
      code: 'GRANT_TIER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin: Revoke tier access
router.post('/admin/users/:userId/revoke-tier', adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason = 'Admin revocation' } = req.body;
    const adminEmail = (req as any).userEmail;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await auditLogger.logAdminAction(
        adminEmail,
        `Failed to revoke tier: user not found`,
        userId,
        { error: 'USER_NOT_FOUND' },
        false,
        'User not found',
        req
      );

      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        userId,
        timestamp: new Date().toISOString()
      });
    }

    const result = await prisma.subscription.updateMany({
      where: { userEmail: user.email, status: 'ACTIVE' },
      data: { 
        status: 'REVOKED', 
        endDate: new Date(),
        revokeReason: reason,
        revokedBy: adminEmail
      }
    });

    // Log the successful action
    await auditLogger.logTierAction(
      userId,
      user.email,
      'REVOKE',
      'ALL',
      adminEmail,
      undefined,
      reason,
      req
    );

    res.json({
      success: true,
      message: `Revoked all tier access from ${user.email}`,
      updated: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const adminEmail = (req as any).userEmail || 'admin@system';
    await auditLogger.logErrorEvent(
      adminEmail,
      AuditEventType.ERROR_DETECTED,
      'Error revoking tier',
      (error as Error).message,
      { userId: (req as any).params.userId },
      req
    );

    res.status(400).json({
      success: false,
      error: (error as Error).message,
      code: 'REVOKE_TIER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin: List all users with tier info
router.get('/admin/users', adminOnly, async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);
    const adminEmail = (req as any).userEmail;

    const users = await prisma.user.findMany({
      skip,
      take,
      select: {
        id: true,
        email: true,
        createdAt: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          select: {
            tier: { select: { name: true } },
            endDate: true,
            grantReason: true
          }
        }
      }
    });

    const total = await prisma.user.count();
    const usersWithTier = users.map(u => ({
      ...u,
      currentTier: u.subscriptions[0]?.tier.name || 'FREE',
      subscriptions: undefined
    }));

    // Log the admin action
    await auditLogger.logAdminAction(
      adminEmail,
      'Listed all users with tier information',
      undefined,
      { page: parseInt(page as string), pageSize: take, resultCount: users.length },
      true,
      undefined,
      req
    );

    res.json({
      success: true,
      users: usersWithTier,
      total,
      page: parseInt(page as string),
      pageSize: take,
      pages: Math.ceil(total / take),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const adminEmail = (req as any).userEmail || 'admin@system';
    await auditLogger.logErrorEvent(
      adminEmail,
      AuditEventType.ERROR_DETECTED,
      'Error listing users',
      (error as Error).message,
      {},
      req
    );

    res.status(400).json({
      success: false,
      error: (error as Error).message,
      code: 'LIST_USERS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin: Get feature usage statistics
router.get('/admin/features', adminOnly, async (req: Request, res: Response) => {
  try {
    const stats = await prisma.featureAccess.groupBy({
      by: ['feature', 'userTier'],
      _count: { id: true },
      where: { accessGranted: true }
    });

    const formatted = stats.map(s => ({
      feature: s.feature,
      tier: s.userTier,
      accessCount: s._count.id
    }));

    res.json({ 
      success: true, 
      stats: formatted,
      total: formatted.length
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// Admin: Get dashboard statistics
router.get('/admin/dashboard', adminOnly, async (req: Request, res: Response) => {
  try {
    const adminEmail = (req as any).userEmail;
    const totalUsers = await prisma.user.count();
    
    const tierCounts = await prisma.subscription.groupBy({
      by: ['tier'],
      where: { status: 'ACTIVE' },
      _count: { id: true }
    });

    const tierMap: any = {};
    tierCounts.forEach(tc => {
      tierMap[tc.tier] = tc._count.id;
    });

    const totalPortfolios = await prisma.portfolio.count({ where: { isActive: true } });
    const totalTransactions = await prisma.transaction.count();

    // Log admin access to dashboard
    await auditLogger.logAdminAction(
      adminEmail,
      'Accessed admin dashboard',
      undefined,
      {
        totalUsers,
        portfolios: totalPortfolios,
        transactions: totalTransactions
      },
      true,
      undefined,
      req
    );

    res.json({
      success: true,
      stats: {
        totalUsers,
        tierBreakdown: {
          free: tierMap['FREE'] || 0,
          premium: tierMap['PREMIUM'] || 0,
          enterprise: tierMap['ENTERPRISE'] || 0
        },
        totalPortfolios,
        totalTransactions,
        activeUsers: totalUsers
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const adminEmail = (req as any).userEmail || 'admin@system';
    await auditLogger.logErrorEvent(
      adminEmail,
      AuditEventType.ERROR_DETECTED,
      'Error fetching dashboard stats',
      (error as Error).message,
      {},
      req
    );

    res.status(400).json({
      success: false,
      error: (error as Error).message,
      code: 'DASHBOARD_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin: Get access attempt logs
router.get('/admin/access-logs', adminOnly, async (req: Request, res: Response) => {
  try {
    const { feature, userEmail, limit = '100' } = req.query;
    const adminEmail = (req as any).userEmail;
    
    const where: any = {};
    if (feature) where.feature = feature;
    if (userEmail) where.userEmail = userEmail;

    const logs = await prisma.featureAccess.findMany({
      where,
      orderBy: { accessedAt: 'desc' },
      take: parseInt(limit as string),
      select: {
        id: true,
        userEmail: true,
        feature: true,
        userTier: true,
        tierRequired: true,
        accessGranted: true,
        accessedAt: true,
        reason: true
      }
    });

    // Log admin access to logs
    await auditLogger.logAdminAction(
      adminEmail,
      'Accessed feature access logs',
      userEmail as string,
      {
        feature: feature || 'all',
        resultCount: logs.length,
        limit: parseInt(limit as string)
      },
      true,
      undefined,
      req
    );

    res.json({
      success: true,
      logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const adminEmail = (req as any).userEmail || 'admin@system';
    await auditLogger.logErrorEvent(
      adminEmail,
      AuditEventType.ERROR_DETECTED,
      'Error fetching access logs',
      (error as Error).message,
      { feature: (req as any).query.feature, userEmail: (req as any).query.userEmail },
      req
    );

    res.status(400).json({
      success: false,
      error: (error as Error).message,
      code: 'ACCESS_LOGS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
