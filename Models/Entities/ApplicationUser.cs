using Microsoft.AspNetCore.Identity;
using System;

namespace SmartInvest.Models.Entities
{
    public class ApplicationUser : IdentityUser
    {
        // POPIA/GDPR Compliance
        public bool ConsentGiven { get; set; }
        public DateTime? ConsentDate { get; set; }
        public bool DataProcessingConsent { get; set; }
        public bool? MarketingConsent { get; set; }
        public bool RightToErasureAcknowledged { get; set; }
        
        // FICA Compliance (South Africa)
        public bool IdentityVerified { get; set; }
        public bool AddressVerified { get; set; }
        public bool TaxNumberVerified { get; set; }
        public string TaxNumber { get; set; }
        
        // KYC Compliance
        public KYCStatus KYCStatus { get; set; }
        public DateTime? KYCExpiryDate { get; set; }
        public DateTime? KYCCompletedDate { get; set; }
        
        // FSB Compliance
        public bool AdvancedVerificationCompleted { get; set; }
        
        // MiFID II Compliance
        public string InvestorClassification { get; set; } // Retail, Professional, Eligible Counterparty
        public bool RiskProfileCompleted { get; set; }
        public bool InvestmentKnowledgeAssessed { get; set; }
        public string RiskTolerance { get; set; } // Low, Medium, High
        
        // AML/CTF
        public bool PEPStatus { get; set; } // Politically Exposed Person
        public string SourceOfFunds { get; set; }
        
        // Regional Data
        public string Region { get; set; } // ZA, NG, GH, etc.
        public string PreferredCurrency { get; set; }
        
        // Roles and Access
        public UserRole Role { get; set; }
        public bool IsExecutive { get; set; }
        
        // Tracking
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginDate { get; set; }
    }

    public enum KYCStatus
    {
        Pending,
        UnderReview,
        Approved,
        Rejected,
        Expired
    }
}
