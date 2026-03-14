using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Marketplace
{
    public class AdminAuditLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string AdminEmail { get; set; }

        [Required]
        [StringLength(100)]
        public string Action { get; set; }

        [StringLength(100)]
        public string ResourceType { get; set; }

        public int? ResourceId { get; set; }

        [StringLength(500)]
        public string Details { get; set; }

        [StringLength(50)]
        public string IpAddress { get; set; }

        [StringLength(500)]
        public string UserAgent { get; set; }

        public bool Success { get; set; }

        [StringLength(500)]
        public string ErrorMessage { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class AdminDashboardMetric
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string MetricName { get; set; }

        public decimal MetricValue { get; set; }

        [StringLength(50)]
        public string MetricType { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class PlatformAnalytics
    {
        [Key]
        public int Id { get; set; }

        public int TotalUsers { get; set; }

        public int TotalSellers { get; set; }

        public int TotalBuyers { get; set; }

        public int TotalTransactions { get; set; }

        public decimal TotalRevenue { get; set; }

        public decimal AverageTransactionValue { get; set; }

        public int FraudDetectedCount { get; set; }

        public decimal FraudRate { get; set; }

        public int TotalIntegrations { get; set; }

        public int ActiveIntegrations { get; set; }

        public DateTime CalculatedAt { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
