using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Integration
{
    public class ApiKey
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        [Required]
        [StringLength(64)]
        public string Key { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        public string Description { get; set; }

        public ApiKeyStatus Status { get; set; }

        public string AllowedOrigins { get; set; }

        public int RateLimitPerHour { get; set; }

        public DateTime? ExpiresAt { get; set; }

        public DateTime? LastUsedAt { get; set; }

        public int UsageCount { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public enum ApiKeyStatus
    {
        Active,
        Suspended,
        Revoked
    }
}
