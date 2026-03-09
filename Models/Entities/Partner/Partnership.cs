using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Partner
{
    public class Partnership
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(200)]
        public string CompanyName { get; set; }
        
        [Required]
        public string PartnerType { get; set; } // Financial Institution, Investment Firm, Fintech, Broker
        
        [Required]
        [EmailAddress]
        public string ContactEmail { get; set; }
        
        [Phone]
        public string ContactPhone { get; set; }
        
        public string ContactPerson { get; set; }
        public string ContactTitle { get; set; }
        
        // Company Details
        public string RegistrationNumber { get; set; }
        public string TaxNumber { get; set; }
        public string LicenseNumber { get; set; }
        public string RegulatoryBody { get; set; }
        
        public string Address { get; set; }
        public string City { get; set; }
        public string Country { get; set; }
        
        public string Website { get; set; }
        public string LogoUrl { get; set; }
        
        // Partnership Details
        public string PartnershipStatus { get; set; } // Pending, Active, Suspended, Terminated
        public DateTime ApplicationDate { get; set; }
        public DateTime? ApprovalDate { get; set; }
        public DateTime? ActivationDate { get; set; }
        
        public string PartnershipTier { get; set; } // Bronze, Silver, Gold, Platinum
        
        // Commission & Revenue Sharing
        public decimal CommissionRate { get; set; }
        public decimal RevenueSharePercentage { get; set; }
        public decimal MinimumInvestment { get; set; }
        
        // Services Offered
        public string ServicesOffered { get; set; }
        public bool ProvidesStocks { get; set; }
        public bool ProvidesBonds { get; set; }
        public bool ProvidesCrypto { get; set; }
        public bool ProvidesRealEstate { get; set; }
        public bool ProvidesForex { get; set; }
        
        // API Integration
        public string ApiKey { get; set; }
        public string ApiSecret { get; set; }
        public string WebhookUrl { get; set; }
        public bool ApiEnabled { get; set; }
        
        // Documents
        public string BusinessLicense { get; set; }
        public string InsuranceDocument { get; set; }
        public string ComplianceCertificate { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public virtual ICollection<PartnerInvestmentProduct> InvestmentProducts { get; set; }
        public virtual ICollection<PartnerTransaction> Transactions { get; set; }
    }

    public class PartnerInvestmentProduct
    {
        [Key]
        public int Id { get; set; }
        
        public int PartnershipId { get; set; }
        
        [Required]
        [StringLength(200)]
        public string ProductName { get; set; }
        
        public string ProductType { get; set; } // Stock, Bond, ETF, Mutual Fund, Crypto
        public string Ticker { get; set; }
        
        public decimal MinimumInvestment { get; set; }
        public decimal ManagementFee { get; set; }
        public decimal PerformanceFee { get; set; }
        
        public string RiskRating { get; set; } // Low, Medium, High
        public decimal ExpectedReturn { get; set; }
        
        public string Description { get; set; }
        public bool IsActive { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        public virtual Partnership Partnership { get; set; }
    }

    public class PartnerTransaction
    {
        [Key]
        public int Id { get; set; }
        
        public int PartnershipId { get; set; }
        public string UserId { get; set; }
        
        public decimal Amount { get; set; }
        public decimal CommissionEarned { get; set; }
        
        public DateTime TransactionDate { get; set; }
        public string TransactionType { get; set; }
        public string Status { get; set; }
        
        public virtual Partnership Partnership { get; set; }
    }
}
