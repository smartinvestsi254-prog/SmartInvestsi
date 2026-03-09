using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Models.Entities;
using SmartInvest.Models.Entities.User;
using SmartInvest.Models.Entities.Investment;
using SmartInvest.Models.Entities.Partner;
using SmartInvest.Models.Entities.Subscription;
using SmartInvest.Models.Entities.Social;
using SmartInvest.Models.Entities.Payment;
using SmartInvest.Models.Entities.Marketplace;
using SmartInvest.Models.Entities.Marketplace;
using SmartInvest.Models.Entities.Integration;
using SmartInvest.Models.Entities.Security;
using SmartInvest.Models.Entities.Admin;
using SmartInvest.Models.Entities.Analytics;

namespace SmartInvest.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // User
        public DbSet<UserProfile> UserProfiles { get; set; }
        
        // Investment
        public DbSet<Portfolio> Portfolios { get; set; }
        public DbSet<PortfolioAsset> PortfolioAssets { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        
        // Partners
        public DbSet<Partnership> Partnerships { get; set; }
        public DbSet<PartnerInvestmentProduct> PartnerInvestmentProducts { get; set; }
        public DbSet<PartnerTransaction> PartnerTransactions { get; set; }
        
        // Subscriptions
        public DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }
        public DbSet<UserSubscription> UserSubscriptions { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        // Social
        public DbSet<UserConnection> UserConnections { get; set; }
        public DbSet<WorkPost> WorkPosts { get; set; }

        // Payments
        public DbSet<CryptoPaymentIntent> CryptoPaymentIntents { get; set; }

        // Marketplace - Accounts
        public DbSet<MerchantAccount> MerchantAccounts { get; set; }
        public DbSet<SellerAccount> SellerAccounts { get; set; }
        public DbSet<BuyerAccount> BuyerAccounts { get; set; }
        public DbSet<AdminAccount> AdminAccounts { get; set; }

        // Marketplace - Products & Orders
        public DbSet<Product> Products { get; set; }
        public DbSet<Order> Orders { get; set; }

        // Marketplace - External Integrations
        public DbSet<ExternalIntegration> ExternalIntegrations { get; set; }
        public DbSet<IntegrationWebhook> IntegrationWebhooks { get; set; }
        public DbSet<IntegrationAuditLog> IntegrationAuditLogs { get; set; }

        // Marketplace - Shipping
        public DbSet<ShippingCarrier> ShippingCarriers { get; set; }
        public DbSet<ShippingRate> ShippingRates { get; set; }
        public DbSet<ShippingLabel> ShippingLabels { get; set; }
        public DbSet<ShippingAdvice> ShippingAdvices { get; set; }

        // Marketplace - Transactions & Fraud
        public DbSet<TransactionRecord> TransactionRecords { get; set; }
        public DbSet<FraudDetectionScore> FraudDetectionScores { get; set; }
        public DbSet<SafetyAlert> SafetyAlerts { get; set; }
        public DbSet<BlacklistEntry> BlacklistEntries { get; set; }
        public DbSet<RecaptureCampaign> RecaptureCampaigns { get; set; }

        // Marketplace - Admin
        public DbSet<AdminAuditLog> AdminAuditLogs { get; set; }
        public DbSet<AdminDashboardMetric> AdminDashboardMetrics { get; set; }
        public DbSet<PlatformAnalytics> PlatformAnalytics { get; set; }

        // Integration
        public DbSet<ApiKey> ApiKeys { get; set; }

        // Security
        public DbSet<FraudCheck> FraudChecks { get; set; }

        // Admin
        public DbSet<ExecutiveAccess> ExecutiveAccesses { get; set; }

        // Analytics
        public DbSet<UsageLog> UsageLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure relationships and constraints
            builder.Entity<Portfolio>()
                .HasMany(p => p.Assets)
                .WithOne(a => a.Portfolio)
                .HasForeignKey(a => a.PortfolioId);

            builder.Entity<Portfolio>()
                .HasMany(p => p.Transactions)
                .WithOne(t => t.Portfolio)
                .HasForeignKey(t => t.PortfolioId);

            builder.Entity<Partnership>()
                .HasMany(p => p.InvestmentProducts)
                .WithOne(ip => ip.Partnership)
                .HasForeignKey(ip => ip.PartnershipId);

            builder.Entity<SubscriptionPlan>()
                .HasMany(sp => sp.UserSubscriptions)
                .WithOne(us => us.SubscriptionPlan)
                .HasForeignKey(us => us.SubscriptionPlanId);

            // Decimal precision
            builder.Entity<Portfolio>()
                .Property(p => p.TotalValue)
                .HasPrecision(18, 2);

            builder.Entity<Transaction>()
                .Property(t => t.Amount)
                .HasPrecision(18, 2);

            builder.Entity<Partnership>()
                .Property(p => p.CommissionRate)
                .HasPrecision(6, 4);

            builder.Entity<Partnership>()
                .Property(p => p.RevenueSharePercentage)
                .HasPrecision(6, 4);

            builder.Entity<Partnership>()
                .Property(p => p.MinimumInvestment)
                .HasPrecision(18, 2);

            builder.Entity<PartnerInvestmentProduct>()
                .Property(p => p.MinimumInvestment)
                .HasPrecision(18, 2);

            builder.Entity<PartnerInvestmentProduct>()
                .Property(p => p.ManagementFee)
                .HasPrecision(6, 4);

            builder.Entity<PartnerInvestmentProduct>()
                .Property(p => p.PerformanceFee)
                .HasPrecision(6, 4);

            builder.Entity<PartnerTransaction>()
                .Property(p => p.Amount)
                .HasPrecision(18, 2);

            builder.Entity<PartnerTransaction>()
                .Property(p => p.CommissionEarned)
                .HasPrecision(18, 2);

            builder.Entity<UserConnection>()
                .HasIndex(c => new { c.RequesterId, c.AddresseeId })
                .IsUnique();

            builder.Entity<WorkPost>()
                .HasIndex(p => new { p.UserId, p.Visibility, p.CreatedAt });

            builder.Entity<CryptoPaymentIntent>()
                .HasIndex(p => p.Reference)
                .IsUnique();

            // Marketplace Indexes
            builder.Entity<AdminAccount>()
                .HasIndex(a => a.AdminEmail)
                .IsUnique();

            builder.Entity<SellerAccount>()
                .HasIndex(s => new { s.UserId })
                .IsUnique();

            builder.Entity<BuyerAccount>()
                .HasIndex(b => new { b.UserId })
                .IsUnique();

            builder.Entity<ExternalIntegration>()
                .HasIndex(e => e.ApiKey)
                .IsUnique();

            builder.Entity<TransactionRecord>()
                .HasIndex(t => new { t.BuyerId, t.SellerId, t.CreatedAt });

            builder.Entity<ShippingLabel>()
                .HasIndex(s => s.TrackingNumber)
                .IsUnique();

            builder.Entity<AdminAuditLog>()
                .HasIndex(a => new { a.AdminEmail, a.CreatedAt });

            builder.Entity<MerchantAccount>()
                .Property(m => m.CommissionRate)
                .HasPrecision(6, 4);

            builder.Entity<SellerAccount>()
                .Property(s => s.TotalRevenue)
                .HasPrecision(18, 2);

            builder.Entity<BuyerAccount>()
                .Property(b => b.TotalSpent)
                .HasPrecision(18, 2);

            builder.Entity<TransactionRecord>()
                .Property(t => t.Amount)
                .HasPrecision(18, 2);

            builder.Entity<TransactionRecord>()
                .Property(t => t.FraudScore)
                .HasPrecision(5, 2);

            builder.Entity<FraudDetectionScore>()
                .Property(f => f.RiskScore)
                .HasPrecision(5, 2);

            builder.Entity<RecaptureCampaign>()
                .Property(r => r.OriginalAmount)
                .HasPrecision(18, 2);

            builder.Entity<RecaptureCampaign>()
                .Property(r => r.RecapturedAmount)
                .HasPrecision(18, 2);

            builder.Entity<ShippingRate>()
                .Property(r => r.BaseRate)
                .HasPrecision(10, 2);

            builder.Entity<ShippingRate>()
                .Property(r => r.RatePerKg)
                .HasPrecision(10, 2);

            builder.Entity<ShippingLabel>()
                .Property(s => s.ShippingCost)
                .HasPrecision(18, 2);

            builder.Entity<ExternalIntegration>()
                .Property(e => e.MonthlyFee)
                .HasPrecision(10, 2);


            // Marketplace
            builder.Entity<Product>()
                .Property(p => p.Price)
                .HasPrecision(18, 2);

            builder.Entity<Order>()
                .Property(o => o.UnitPrice)
                .HasPrecision(18, 2);

            builder.Entity<Order>()
                .Property(o => o.TotalAmount)
                .HasPrecision(18, 2);

            builder.Entity<Order>()
                .HasIndex(o => o.OrderNumber)
                .IsUnique();

            builder.Entity<ShippingAdvice>()
                .Property(s => s.ShippingCost)
                .HasPrecision(18, 2);

            builder.Entity<ApiKey>()
                .HasIndex(k => k.Key)
                .IsUnique();

            builder.Entity<UsageLog>()
                .HasIndex(u => new { u.UserId, u.CreatedAt });
        }
    }
}
