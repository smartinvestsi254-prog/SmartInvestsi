using SmartInvest.Models.Entities;
using SmartInvest.Models.Entities.Marketplace;

namespace SmartInvest.Services.Marketplace;

/// <summary>
/// Business Rules & Compliance Service
/// Enforces Rolex-style strict lawful access control
/// </summary>
public interface IComplianceService
{
    // Business Rules
    Task<bool> CheckBusinessRuleAsync(string ruleName, string userId, object context);
    Task<List<BusinessRule>> GetApplicableRulesAsync(string userId, RuleScope scope);
    Task LogComplianceAccessAsync(string userId, string resourceType, string resourceId, AccessResult result, string reason);
    
    // Subscription Tiers
    Task<SubscriptionTier> GetUserSubscriptionTierAsync(string userId);
    Task<bool> HasFeatureAccessAsync(string userId, string featureId);
    Task<bool> CanAccessPaidFeatureAsync(string userId, string featureId);
    
    // Investor Information Access (Strict)
    Task<bool> CanAccessInvestorDataAsync(string userId, object investorData);
    Task<List<string>> GetAllowedDataFieldsAsync(string userId);
    
    // Official/Security
    Task AuthenticateOfficialAsync(string userId, string deviceId, string ipAddress);
    Task VerifyOfficialAccessAsync(string userId, string resourceType);
}

public class ComplianceService : IComplianceService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ComplianceService> _logger;

    public ComplianceService(ApplicationDbContext context, ILogger<ComplianceService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<bool> CheckBusinessRuleAsync(string ruleName, string userId, object context)
    {
        try
        {
            var rule = await _context.BusinessRules
                .FirstOrDefaultAsync(r => r.RuleName == ruleName && r.IsEnforced);

            if (rule == null) return true; // No rule = allowed

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            // Check scope applicability
            if (!await IsRuleApplicableAsync(rule.Scope, user)) return true;

            var userAccessLevel = await ResolveUserAccessLevelAsync(user);
            if (userAccessLevel < rule.RequiredAccessLevel)
            {
                _logger.LogWarning($"Access denied for user {userId}. Required={rule.RequiredAccessLevel}, Actual={userAccessLevel}");
                return false;
            }
            
            _logger.LogInformation($"Business rule '{ruleName}' checked for user {userId}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error checking business rule: {ex.Message}");
            return false; // Fail safely
        }
    }

    public async Task<List<BusinessRule>> GetApplicableRulesAsync(string userId, RuleScope scope)
    {
        return await _context.BusinessRules
            .Where(r => r.Scope == scope && r.IsEnforced && r.EffectiveDate <= DateTime.UtcNow)
            .Where(r => r.ExpiryDate == null || r.ExpiryDate > DateTime.UtcNow)
            .ToListAsync();
    }

    public async Task LogComplianceAccessAsync(string userId, string resourceType, string resourceId, AccessResult result, string reason)
    {
        var auditLog = new ComplianceAuditLog
        {
            UserId = userId,
            ResourceType = resourceType,
            ResourceId = resourceId,
            AccessResult = result,
            Reason = reason,
            Timestamp = DateTime.UtcNow
        };

        _context.ComplianceAuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();

        if (result == AccessResult.Denied)
        {
            _logger.LogWarning($"ACCESS DENIED: User {userId} denied access to {resourceType} {resourceId}. Reason: {reason}");
        }
    }

    public async Task<SubscriptionTier> GetUserSubscriptionTierAsync(string userId)
    {
        var subscription = await _context.UserSubscriptions
            .Include(s => s.SubscriptionTier)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == SubscriptionStatus.Active);

        if (subscription == null)
        {
            // Return free tier by default
            return await _context.SubscriptionTiers
                .FirstOrDefaultAsync(t => t.TierName == "Free") ?? new SubscriptionTier { TierName = "Free" };
        }

        return subscription.SubscriptionTier;
    }

    public async Task<bool> HasFeatureAccessAsync(string userId, string featureId)
    {
        var feature = await _context.Features.FindAsync(featureId);
        if (feature == null) return false;

        // If feature is free, everyone has access
        if (!feature.RequiresPayment) return true;

        // Check if user has subscription that includes this feature
        var tier = await GetUserSubscriptionTierAsync(userId);
        return feature.AvailableInTiers.Contains(tier.Id);
    }

    public async Task<bool> CanAccessPaidFeatureAsync(string userId, string featureId)
    {
        var feature = await _context.Features.FindAsync(featureId);
        if (feature == null || !feature.RequiresPayment) return false;

        var subscription = await _context.UserSubscriptions
            .Where(s => s.UserId == userId && s.Status == SubscriptionStatus.Active)
            .FirstOrDefaultAsync();

        return subscription != null;
    }

    public async Task<bool> CanAccessInvestorDataAsync(string userId, object investorData)
    {
        var rule = await _context.BusinessRules
            .FirstOrDefaultAsync(r => r.RuleName == "InvestorInformation" && r.IsEnforced);

        if (rule == null) return true;

        // Only users with Investor access level can access investor data
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        // Check if user has investor subscription
        var subscription = await _context.UserSubscriptions
            .Include(s => s.SubscriptionTier)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == SubscriptionStatus.Active);

        return subscription?.SubscriptionTier.InvestorAccess ?? false;
    }

    public async Task<List<string>> GetAllowedDataFieldsAsync(string userId)
    {
        var tier = await GetUserSubscriptionTierAsync(userId);
        var allowedFields = new List<string>();

        // Free tier: basic fields only
        if (tier.TierName == "Free")
        {
            allowedFields.AddRange(new[] { "Id", "Name", "Status", "CreatedAt" });
        }
        // Premium tier: extended fields
        else if (tier.TierName == "Premium")
        {
            allowedFields.AddRange(new[] { "Id", "Name", "Status", "CreatedAt", "Stats", "Analytics" });
        }
        // Investor tier: all fields
        else if (tier.InvestorAccess)
        {
            allowedFields.AddRange(new[] { "Id", "Name", "Status", "CreatedAt", "Stats", "Analytics", "Revenue", "Metrics" });
        }

        return allowedFields;
    }

    public async Task AuthenticateOfficialAsync(string userId, string deviceId, string ipAddress)
    {
        var official = await _context.OfficialAccounts
            .FirstOrDefaultAsync(o => o.UserId == userId);

        if (official == null)
            throw new UnauthorizedAccessException("User is not an official account");

        // Verify device is trusted
        if (official.MfaEnabled && !official.TrustedDevices.Contains(deviceId))
            throw new UnauthorizedAccessException("Device not trusted");

        // Verify IP is whitelisted
        if (official.IpWhitelist.Length > 0 && !official.IpWhitelist.Contains(ipAddress))
            throw new UnauthorizedAccessException("IP address not whitelisted");

        _logger.LogInformation($"Official {userId} authenticated from {ipAddress}");
    }

    public async Task VerifyOfficialAccessAsync(string userId, string resourceType)
    {
        var official = await _context.OfficialAccounts
            .FirstOrDefaultAsync(o => o.UserId == userId);

        if (official == null)
            throw new UnauthorizedAccessException("User is not an official");

        if (official.SuspiciousActivityDetected)
            throw new UnauthorizedAccessException("Account flagged for suspicious activity");

        _logger.LogInformation($"Official {userId} accessing {resourceType}");
    }

    private async Task<bool> IsRuleApplicableAsync(RuleScope scope, ApplicationUser user)
    {
        if (scope == RuleScope.All)
        {
            return true;
        }

        var subscription = await _context.UserSubscriptions
            .Include(s => s.SubscriptionTier)
            .FirstOrDefaultAsync(s => s.UserId == user.Id && s.Status == SubscriptionStatus.Active);

        return scope switch
        {
            RuleScope.Buyers => user.Role == UserRole.Buyer,
            RuleScope.Sellers => user.Role == UserRole.Seller || user.Role == UserRole.Merchant,
            RuleScope.Administrators => user.Role == UserRole.Admin || user.Role == UserRole.Executive || user.IsExecutive,
            RuleScope.PremiumUsers => subscription != null,
            RuleScope.FreeUsers => subscription == null,
            RuleScope.Investors => subscription?.SubscriptionTier?.InvestorAccess == true,
            _ => false
        };
    }

    private async Task<AccessLevel> ResolveUserAccessLevelAsync(ApplicationUser user)
    {
        var accessLevel = AccessLevel.User;

        switch (user.Role)
        {
            case UserRole.Admin:
                accessLevel = AccessLevel.Admin;
                break;
            case UserRole.Executive:
                accessLevel = AccessLevel.Official;
                break;
            case UserRole.Merchant:
            case UserRole.Seller:
                accessLevel = AccessLevel.Seller;
                break;
            case UserRole.Buyer:
                accessLevel = AccessLevel.User;
                break;
            default:
                accessLevel = AccessLevel.User;
                break;
        }

        if (user.IsExecutive)
        {
            accessLevel = AccessLevel.Official;
        }

        var subscription = await _context.UserSubscriptions
            .Include(s => s.SubscriptionTier)
            .FirstOrDefaultAsync(s => s.UserId == user.Id && s.Status == SubscriptionStatus.Active);

        if (subscription?.SubscriptionTier?.InvestorAccess == true)
        {
            accessLevel = (AccessLevel)Math.Max((int)accessLevel, (int)AccessLevel.Investor);
        }

        return accessLevel;
    }
}
