using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Marketplace
{
    public class ExternalIntegration
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(150)]
        public string IntegrationName { get; set; }

        [Required]
        [StringLength(500)]
        public string IntegrationUrl { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        [StringLength(64)]
        public string ApiKey { get; set; }

        [Required]
        [StringLength(64)]
        public string ApiSecret { get; set; }

        public string Category { get; set; }

        public bool IsPremium { get; set; }

        public decimal MonthlyFee { get; set; }

        public DateTime SubscriptionStartDate { get; set; }

        public DateTime? SubscriptionEndDate { get; set; }

        public int RequestsThisMonth { get; set; }

        public int RequestLimit { get; set; }

        public bool IsActive { get; set; }

        public bool IsVerified { get; set; }

        public string VerificationStatus { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        public DateTime? LastAccessedAt { get; set; }
    }

    public class IntegrationWebhook
    {
        [Key]
        public int Id { get; set; }

        public int IntegrationId { get; set; }

        [Required]
        [StringLength(500)]
        public string WebhookUrl { get; set; }

        [StringLength(100)]
        public string EventType { get; set; }

        public bool IsActive { get; set; }

        public int FailedAttempts { get; set; }

        public DateTime LastTriggeredAt { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class IntegrationAuditLog
    {
        [Key]
        public int Id { get; set; }

        public int IntegrationId { get; set; }

        [StringLength(100)]
        public string Action { get; set; }

        [StringLength(500)]
        public string Details { get; set; }

        [StringLength(50)]
        public string ResponseStatus { get; set; }

        [StringLength(500)]
        public string ErrorMessage { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
