using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Marketplace
{
    public class FraudDetectionScore
    {
        [Key]
        public int Id { get; set; }

        public int? TransactionId { get; set; }

        [StringLength(50)]
        public string UserId { get; set; }

        public decimal RiskScore { get; set; }

        [StringLength(100)]
        public string RiskLevel { get; set; }

        public bool IsBlocked { get; set; }

        public string Indicators { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class SafetyAlert
    {
        [Key]
        public int Id { get; set; }

        [StringLength(50)]
        public string UserId { get; set; }

        public int? TransactionId { get; set; }

        [Required]
        [StringLength(100)]
        public string AlertType { get; set; }

        [Required]
        [StringLength(500)]
        public string AlertMessage { get; set; }

        [StringLength(50)]
        public string Severity { get; set; }

        public bool IsResolved { get; set; }

        public string Resolution { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ResolvedAt { get; set; }
    }

    public class BlacklistEntry
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Identifier { get; set; }

        [StringLength(50)]
        public string Type { get; set; }

        [StringLength(500)]
        public string Reason { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ExpiresAt { get; set; }
    }

    public class TransactionRecord
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string BuyerId { get; set; }

        [Required]
        [StringLength(50)]
        public string SellerId { get; set; }

        [StringLength(100)]
        public string ProductId { get; set; }

        [Required]
        [StringLength(100)]
        public string TransactionId { get; set; }

        public decimal Amount { get; set; }

        [StringLength(50)]
        public string Currency { get; set; }

        [StringLength(100)]
        public string PaymentMethod { get; set; }

        [StringLength(50)]
        public string PaymentStatus { get; set; }

        [StringLength(50)]
        public string OrderStatus { get; set; }

        public int? ShippingLabelId { get; set; }

        public bool FraudCheckPassed { get; set; }

        public decimal FraudScore { get; set; }

        [StringLength(500)]
        public string Notes { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? CompletedAt { get; set; }
    }

    public class RecaptureCampaign
    {
        [Key]
        public int Id { get; set; }

        public int TransactionId { get; set; }

        [StringLength(50)]
        public string BuyerId { get; set; }

        [StringLength(100)]
        public string OriginalTransactionId { get; set; }

        public decimal OriginalAmount { get; set; }

        [StringLength(500)]
        public string Reason { get; set; }

        [StringLength(50)]
        public string Status { get; set; }

        public int RetryAttempts { get; set; }

        public int MaxRetries { get; set; }

        public DateTime? NextRetryAt { get; set; }

        public decimal? RecapturedAmount { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}
