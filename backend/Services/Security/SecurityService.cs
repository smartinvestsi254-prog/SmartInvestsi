using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartInvest.Data;
using SmartInvest.Models.Entities.Security;

namespace SmartInvest.Services.Security
{
    public interface ISecurityService
    {
        Task<bool> VerifyRecaptchaAsync(string token);
        Task<FraudCheck> AssessFraudRiskAsync(string userId, FraudAssessmentInput input);
    }

    public class SecurityService : ISecurityService
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<SecurityService> _logger;

        public SecurityService(ApplicationDbContext db, IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<SecurityService> logger)
        {
            _db = db;
            _config = config;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<bool> VerifyRecaptchaAsync(string token)
        {
            var secretKey = _config["RECAPTCHA_SECRET_KEY"];
            if (string.IsNullOrWhiteSpace(secretKey))
            {
                _logger.LogWarning("RECAPTCHA_SECRET_KEY not configured, skipping verification");
                return true; // Allow in development
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.PostAsync(
                    $"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response={token}",
                    null
                );

                if (!response.IsSuccessStatusCode)
                {
                    return false;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);

                if (doc.RootElement.TryGetProperty("success", out var success))
                {
                    return success.GetBoolean();
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "reCAPTCHA verification failed");
                return false;
            }
        }

        public async Task<FraudCheck> AssessFraudRiskAsync(string userId, FraudAssessmentInput input)
        {
            var riskScore = 0;
            var reasons = new System.Collections.Generic.List<string>();

            // Check for suspicious patterns
            if (string.IsNullOrWhiteSpace(userId))
            {
                riskScore += 30;
                reasons.Add("Anonymous transaction");
            }

            // Check for rapid transactions
            if (!string.IsNullOrWhiteSpace(userId))
            {
                var recentCount = await _db.Orders
                    .CountAsync(o => o.BuyerId == userId && o.CreatedAt >= DateTime.UtcNow.AddMinutes(-10));

                if (recentCount > 5)
                {
                    riskScore += 40;
                    reasons.Add("High transaction velocity");
                }
            }

            // IP reputation check (simplified)
            if (!string.IsNullOrWhiteSpace(input.IpAddress))
            {
                if (input.IpAddress.StartsWith("10.") || input.IpAddress.Contains("proxy"))
                {
                    riskScore += 20;
                    reasons.Add("Suspicious IP address");
                }
            }

            // Amount check
            if (input.TransactionAmount > 10000)
            {
                riskScore += 15;
                reasons.Add("High value transaction");
            }

            var riskLevel = riskScore switch
            {
                >= 70 => FraudRiskLevel.Critical,
                >= 50 => FraudRiskLevel.High,
                >= 30 => FraudRiskLevel.Medium,
                _ => FraudRiskLevel.Low
            };

            var check = new FraudCheck
            {
                UserId = userId,
                EntityType = input.EntityType,
                EntityId = input.EntityId,
                RiskLevel = riskLevel,
                RiskScore = riskScore,
                Reasons = string.Join("; ", reasons),
                IpAddress = input.IpAddress,
                UserAgent = input.UserAgent,
                DeviceFingerprint = input.DeviceFingerprint,
                Blocked = riskLevel == FraudRiskLevel.Critical,
                CreatedAt = DateTime.UtcNow
            };

            _db.FraudChecks.Add(check);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Fraud assessment: {RiskLevel} (score: {Score}) for {EntityType} {EntityId}",
                riskLevel, riskScore, input.EntityType, input.EntityId);

            return check;
        }
    }

    public class FraudAssessmentInput
    {
        public string EntityType { get; set; }
        public string EntityId { get; set; }
        public decimal TransactionAmount { get; set; }
        public string IpAddress { get; set; }
        public string UserAgent { get; set; }
        public string DeviceFingerprint { get; set; }
    }
}
