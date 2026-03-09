using System;
using System.Threading.Tasks;
using SmartInvest.Models;

namespace SmartInvest.Services.Marketplace;

/// <summary>
/// Subscription Tier Service - Manages access control based on user subscription level
/// Implements Freemium model:
/// - Free: Basic browsing
/// - Premium: Purchase + tracking + advanced features
/// - Enterprise: Full API + custom integrations
/// - Admin: System control (smartinvestsi254@gmail.com only)
/// </summary>
public interface ISubscriptionTierService
{
    Task<SubscriptionTier> GetUserTierAsync(string userId);
    Task<bool> HasFeatureAccessAsync(string userId, string featureName);
    Task<bool> UpgradeToTierAsync(string userId, SubscriptionTier tier);
    Task<bool> IsFeatureFreeAsync(string featureName);
    Task<FeatureAccessResult> ValidateFeatureAccessAsync(string userId, string featureName);
}

public class SubscriptionTierService : ISubscriptionTierService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SubscriptionTierService> _logger;

    public SubscriptionTierService(ApplicationDbContext context, ILogger<SubscriptionTierService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<SubscriptionTier> GetUserTierAsync(string userId)
    {
        var user = await _context.AspNetUsers
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return SubscriptionTier.Free;

        return user.SubscriptionTier ?? SubscriptionTier.Free;
    }

    public async Task<bool> HasFeatureAccessAsync(string userId, string featureName)
    {
        var tier = await GetUserTierAsync(userId);
        var result = await ValidateFeatureAccessAsync(userId, featureName);
        
        _logger.LogInformation($"Feature access check: User {userId}, Feature {featureName}, Tier {tier}, Allowed {result.IsAllowed}");
        
        return result.IsAllowed;
    }

    public async Task<bool> UpgradeToTierAsync(string userId, SubscriptionTier newTier)
    {
        try
        {
            var user = await _context.AspNetUsers
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return false;

            var oldTier = user.SubscriptionTier ?? SubscriptionTier.Free;
            user.SubscriptionTier = newTier;
            user.LastUpgradeAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"User {userId} upgraded from {oldTier} to {newTier}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Upgrade failed for user {userId}: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> IsFeatureFreeAsync(string featureName)
    {
        var freeFeatures = new[]
        {
            "ProductBrowsing",
            "ViewPublicWorkPosts",
            "UserProfileView",
            "SellerRating"
        };

        return freeFeatures.Contains(featureName);
    }

    public async Task<FeatureAccessResult> ValidateFeatureAccessAsync(string userId, string featureName)
    {
        var isFree = await IsFeatureFreeAsync(featureName);
        if (isFree)
            return new FeatureAccessResult { IsAllowed = true, RequiredTier = SubscriptionTier.Free };

        var tier = await GetUserTierAsync(userId);

        var featureMap = new Dictionary<string, SubscriptionTier>
        {
            // Premium features
            { "Purchase", SubscriptionTier.Premium },
            { "ShippingTracking", SubscriptionTier.Premium },
            { "GeolocationTracking", SubscriptionTier.Premium },
            { "FraudProtection", SubscriptionTier.Premium },
            { "AdvancedSearch", SubscriptionTier.Premium },
            { "EmailNotifications", SubscriptionTier.Premium },
            { "TwoFactorAuth", SubscriptionTier.Premium },
            { "PostWorkItems", SubscriptionTier.Premium },
            { "PrioritySupport", SubscriptionTier.Premium },
            { "ApiAccess100", SubscriptionTier.Premium },

            // Enterprise features
            { "UnlimitedApiAccess", SubscriptionTier.Enterprise },
            { "Webhooks", SubscriptionTier.Enterprise },
            { "CustomIntegrations", SubscriptionTier.Enterprise },
            { "WhiteLabel", SubscriptionTier.Enterprise },
            { "AdvancedAnalytics", SubscriptionTier.Enterprise },
            { "DedicatedAccountManager", SubscriptionTier.Enterprise },
            { "CustomFraudRules", SubscriptionTier.Enterprise },
            { "SlaGuarantee", SubscriptionTier.Enterprise }
        };

        if (!featureMap.TryGetValue(featureName, out var requiredTier))
        {
            _logger.LogWarning($"Unknown feature: {featureName}");
            return new FeatureAccessResult { IsAllowed = false, RequiredTier = SubscriptionTier.Enterprise };
        }

        var hasAccess = tier >= requiredTier;

        return new FeatureAccessResult
        {
            IsAllowed = hasAccess,
            RequiredTier = requiredTier,
            UserTier = tier,
            FeatureName = featureName
        };
    }
}

public class FeatureAccessResult
{
    public bool IsAllowed { get; set; }
    public SubscriptionTier RequiredTier { get; set; }
    public SubscriptionTier UserTier { get; set; }
    public string FeatureName { get; set; }
}

public enum SubscriptionTier
{
    Free = 0,
    Premium = 1,
    Enterprise = 2,
    Admin = 3
}
