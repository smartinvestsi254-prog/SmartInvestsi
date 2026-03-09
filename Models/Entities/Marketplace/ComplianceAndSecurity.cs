using SmartInvest.Models.Entities;

namespace SmartInvest.Models.Entities.Marketplace;

/// <summary>
/// Business Rules & Compliance System (Rolex-style, lawful access control)
/// Defines strict rules for data access, feature availability, and compliance
/// </summary>
public class BusinessRule
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string RuleName { get; set; } // "InvestorInformation", "PremiumAccess", etc.
    public string Description { get; set; }
    public RuleType RuleType { get; set; }
    public RuleScope Scope { get; set; } // Who this applies to
    public AccessLevel RequiredAccessLevel { get; set; }
    public bool IsEnforced { get; set; } = true;
    public DateTime EffectiveDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string LegalBasis { get; set; } // Reference to law/regulation
    public Dictionary<string, object> Conditions { get; set; } = new(); // Key-value conditions
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Subscription & Feature Tier System
/// Determines what features users can access based on paid/free status
/// </summary>
public class SubscriptionTier
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TierName { get; set; } // "Free", "Premium", "Enterprise"
    public decimal MonthlyPrice { get; set; }
    public decimal AnnualPrice { get; set; }
    public string Description { get; set; }
    public List<string> IncludedFeatures { get; set; } = new(); // Feature IDs
    public int MaxShipmentsPerMonth { get; set; }
    public int MaxStorageGB { get; set; }
    public int MaxApiRequests { get; set; }
    public bool InvestorAccess { get; set; }
    public bool AdvancedAnalytics { get; set; }
    public bool PrioritySupport { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Feature Access Control
/// Maps features to subscription tiers
/// </summary>
public class Feature
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string FeatureName { get; set; } // "RealTimeTracking", "InvestorReports", etc.
    public string Description { get; set; }
    public FeatureCategory Category { get; set; }
    public bool RequiresPayment { get; set; }
    public bool RequiresInvestorAccess { get; set; }
    public List<string> AvailableInTiers { get; set; } = new(); // Tier IDs
    public string ApiEndpoint { get; set; }
    public int RateLimitPerHour { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// User Subscription Record
/// Tracks what tier each user is subscribed to
/// </summary>
public class UserSubscription
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; }
    public virtual ApplicationUser User { get; set; }
    public string SubscriptionTierId { get; set; }
    public virtual SubscriptionTier SubscriptionTier { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime RenewalDate { get; set; }
    public SubscriptionStatus Status { get; set; } // Active, Cancelled, Expired
    public bool AutoRenew { get; set; }
    public string PaymentMethod { get; set; }
    public decimal AmountPaid { get; set; }
    public DateTime PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Geolocation & Shipment Tracking
/// Stores IP location and physical addresses for shipments
/// </summary>
public class ShipmentLocation
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ShippingLabelId { get; set; }
    public string Latitude { get; set; }
    public string Longitude { get; set; }
    public string IpAddress { get; set; }
    public string Country { get; set; }
    public string City { get; set; }
    public string PostalCode { get; set; }
    public string FullAddress { get; set; }
    public LocationType LocationType { get; set; } // Origin, Transit, Destination
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string GeohashCode { get; set; } // For efficient geo-queries
    public double Accuracy { get; set; } // Meters
}

/// <summary>
/// Compliance & Access Audit Log
/// Every access to lawfully-restricted information is logged
/// </summary>
public class ComplianceAuditLog
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; }
    public string ResourceType { get; set; } // "InvestorData", "UserInfo", etc.
    public string ResourceId { get; set; }
    public AccessResult AccessResult { get; set; } // Granted, Denied
    public string Reason { get; set; }
    public string BusinessRuleId { get; set; }
    public string IpAddress { get; set; }
    public string UserAgent { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Security Policy & Restrictions
/// Sophisticated security controls for users and officials
/// </summary>
public class SecurityPolicy
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PolicyName { get; set; }
    public SecurityLevel Level { get; set; } // Public, User, Admin, Official
    public string Description { get; set; }
    public bool RequireMfa { get; set; }
    public bool RequireIpWhitelist { get; set; }
    public bool RequireGeoVerification { get; set; }
    public int SessionTimeoutMinutes { get; set; }
    public string[] AllowedCountries { get; set; } = Array.Empty<string>();
    public bool AuditAllAccess { get; set; }
    public int MaxFailedLoginAttempts { get; set; }
    public int AccountLockoutDurationMinutes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Official/Executive Account with enhanced security
/// For admins and authorized officials
/// </summary>
public class OfficialAccount
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; }
    public virtual ApplicationUser User { get; set; }
    public OfficialRole Role { get; set; } // CEO, ComplianceOfficer, SecurityOfficer, etc.
    public string Department { get; set; }
    public string[] Certifications { get; set; } = Array.Empty<string>(); // Relevant certifications
    public bool MfaEnabled { get; set; }
    public string[] TrustedDevices { get; set; } = Array.Empty<string>(); // Device fingerprints
    public string[] IpWhitelist { get; set; } = Array.Empty<string>();
    public DateTime LastSecurityAudit { get; set; }
    public bool SuspiciousActivityDetected { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Next Steps & Feature Roadmap
/// Tracks pending features and required setup steps
/// </summary>
public class FeatureNextStep
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string FeatureId { get; set; }
    public string StepNumber { get; set; } // Step 1, 2, 3, etc.
    public string StepName { get; set; }
    public string Description { get; set; }
    public StepType StepType { get; set; } // Setup, Configuration, Integration, etc.
    public bool IsRequired { get; set; }
    public bool IsCompleted { get; set; }
    public string CompletedBy { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string Instructions { get; set; } // Markdown instructions
    public string[] Dependencies { get; set; } = Array.Empty<string>(); // Other steps required first
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Enums
public enum RuleType
{
    DataAccess,
    FeatureAccess,
    ComplianceRequirement,
    LegalRestriction
}

public enum RuleScope
{
    All,
    Investors,
    Sellers,
    Buyers,
    Administrators,
    PremiumUsers,
    FreeUsers
}

public enum AccessLevel
{
    Public = 0,
    User = 1,
    Seller = 2,
    Investor = 3,
    Admin = 4,
    Official = 5
}

public enum FeatureCategory
{
    Marketplace,
    Shipping,
    Payments,
    Analytics,
    InvestorReports,
    Security,
    Integration
}

public enum SubscriptionStatus
{
    Active,
    Trialing,
    Paused,
    Cancelled,
    Expired,
    PastDue
}

public enum LocationType
{
    Origin,
    InTransit,
    Destination,
    Checkpoint
}

public enum AccessResult
{
    Granted,
    Denied,
    PendingApproval
}

public enum SecurityLevel
{
    Public,
    User,
    Admin,
    Official
}

public enum OfficialRole
{
    CEO,
    ComplianceOfficer,
    SecurityOfficer,
    AuditOfficer,
    LegalOfficer,
    FinanceOfficer
}

public enum StepType
{
    Setup,
    Configuration,
    Integration,
    Verification,
    Testing,
    Optimization
}
