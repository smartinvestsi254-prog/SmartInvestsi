using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Marketplace
{
    public class MerchantAccount
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string AdminUserId { get; set; }

        [Required]
        [StringLength(200)]
        public string BusinessName { get; set; }

        [StringLength(500)]
        public string BusinessDescription { get; set; }

        [StringLength(20)]
        public string BusinessRegistrationNumber { get; set; }

        [StringLength(14)]
        public string TaxIdentificationNumber { get; set; }

        [StringLength(100)]
        public string BusinessEmail { get; set; }

        [StringLength(20)]
        public string BusinessPhone { get; set; }

        [StringLength(500)]
        public string BusinessAddress { get; set; }

        public string LogoUrl { get; set; }

        public string BannerUrl { get; set; }

        public int TotalSellers { get; set; }

        public int TotalTransactions { get; set; }

        public decimal TotalRevenue { get; set; }

        public decimal CommissionRate { get; set; }

        public string Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }

    public class SellerAccount
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        public int? MerchantAccountId { get; set; }

        [Required]
        [StringLength(150)]
        public string StoreName { get; set; }

        [StringLength(500)]
        public string StoreDescription { get; set; }

        public string StoreLogoUrl { get; set; }

        [StringLength(100)]
        public string StoreEmail { get; set; }

        [StringLength(20)]
        public string StorePhone { get; set; }

        public decimal AverageRating { get; set; }

        public int TotalRatings { get; set; }

        public int TotalProductsSold { get; set; }

        public decimal TotalRevenue { get; set; }

        public bool KycVerified { get; set; }

        public string PayoutMethod { get; set; }

        public string PayoutAccount { get; set; }

        public string Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }

    public class BuyerAccount
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        public int TotalPurchases { get; set; }

        public decimal TotalSpent { get; set; }

        [StringLength(100)]
        public string PreferredPaymentMethod { get; set; }

        [StringLength(500)]
        public string ShippingAddress { get; set; }

        [StringLength(500)]
        public string BillingAddress { get; set; }

        public bool TwoFactorEnabled { get; set; }

        public string Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }

    public class AdminAccount
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string AdminEmail { get; set; }

        [Required]
        public string AdminUserId { get; set; }

        [StringLength(100)]
        public string AdminFullName { get; set; }

        public string Role { get; set; }

        public bool CanViewDashboard { get; set; }

        public bool CanManageUsers { get; set; }

        public bool CanManageTransactions { get; set; }

        public bool CanManageSellers { get; set; }

        public bool CanManagePayments { get; set; }

        public bool CanManageIntegrations { get; set; }

        public bool CanViewAnalytics { get; set; }

        public DateTime LastLoginAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}
