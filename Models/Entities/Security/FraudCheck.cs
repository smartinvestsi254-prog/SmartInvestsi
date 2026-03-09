using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Security
{
    public class FraudCheck
    {
        [Key]
        public int Id { get; set; }

        public string UserId { get; set; }

        public string EntityType { get; set; }

        public string EntityId { get; set; }

        public FraudRiskLevel RiskLevel { get; set; }

        public int RiskScore { get; set; }

        public string Reasons { get; set; }

        public string IpAddress { get; set; }

        public string UserAgent { get; set; }

        public string DeviceFingerprint { get; set; }

        public bool Blocked { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public enum FraudRiskLevel
    {
        Low,
        Medium,
        High,
        Critical
    }
}
