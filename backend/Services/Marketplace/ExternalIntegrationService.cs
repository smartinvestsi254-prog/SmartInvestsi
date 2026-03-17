using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartInvest.Data;
using SmartInvest.Models.Entities.Marketplace;

namespace SmartInvest.Services.Marketplace
{
    public interface IExternalIntegrationService
    {
        Task<ExternalIntegration> RequestIntegrationAsync(string integrationName, string integrationUrl, string category, bool requestPremium);
        Task<bool> VerifyApiKeyAsync(string apiKey);
        Task<ExternalIntegration> ApproveIntegrationAsync(int integrationId);
        Task<ExternalIntegration> RejectIntegrationAsync(int integrationId);
        Task<List<ExternalIntegration>> GetActiveIntegrationsAsync();
        Task<List<ExternalIntegration>> GetPendingIntegrationsAsync();
        Task<bool> CheckRequestLimitAsync(string apiKey);
        Task LogIntegrationAccessAsync(int integrationId, string action, string details, bool success, string errorMessage);
    }

    public class ExternalIntegrationService : IExternalIntegrationService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<ExternalIntegrationService> _logger;
        private const int FREE_TIER_REQUESTS = 1000;
        private const int PREMIUM_TIER_REQUESTS = 100000;

        public ExternalIntegrationService(ApplicationDbContext db, ILogger<ExternalIntegrationService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<ExternalIntegration> RequestIntegrationAsync(string integrationName, string integrationUrl, string category, bool requestPremium)
        {
            if (string.IsNullOrWhiteSpace(integrationName) || string.IsNullOrWhiteSpace(integrationUrl))
            {
                throw new ArgumentException("Integration name and URL are required");
            }

            var apiKey = GenerateApiKey();
            var apiSecret = GenerateApiSecret();

            var integration = new ExternalIntegration
            {
                IntegrationName = integrationName,
                IntegrationUrl = integrationUrl,
                ApiKey = apiKey,
                ApiSecret = apiSecret,
                Category = category,
                IsPremium = requestPremium,
                MonthlyFee = requestPremium ? 99.99m : 0m,
                IsActive = false,
                IsVerified = false,
                VerificationStatus = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                RequestLimit = requestPremium ? PREMIUM_TIER_REQUESTS : FREE_TIER_REQUESTS,
                SubscriptionStartDate = DateTime.UtcNow
            };

            _db.ExternalIntegrations.Add(integration);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Integration request created: {Name} ({Url}) - Premium: {IsPremium}", 
                integrationName, integrationUrl, requestPremium);

            return integration;
        }

        public async Task<bool> VerifyApiKeyAsync(string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey)) return false;

            var integration = await _db.ExternalIntegrations
                .FirstOrDefaultAsync(i => i.ApiKey == apiKey && i.IsActive && i.IsVerified);

            return integration != null;
        }

        public async Task<ExternalIntegration> ApproveIntegrationAsync(int integrationId)
        {
            var integration = await _db.ExternalIntegrations.FirstOrDefaultAsync(i => i.Id == integrationId);
            if (integration == null)
            {
                throw new ArgumentException("Integration not found");
            }

            integration.IsVerified = true;
            integration.VerificationStatus = "approved";
            integration.IsActive = true;
            integration.SubscriptionStartDate = DateTime.UtcNow;
            integration.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Integration approved: {Name}", integration.IntegrationName);

            return integration;
        }

        public async Task<ExternalIntegration> RejectIntegrationAsync(int integrationId)
        {
            var integration = await _db.ExternalIntegrations.FirstOrDefaultAsync(i => i.Id == integrationId);
            if (integration == null)
            {
                throw new ArgumentException("Integration not found");
            }

            integration.IsVerified = false;
            integration.VerificationStatus = "rejected";
            integration.IsActive = false;
            integration.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Integration rejected: {Name}", integration.IntegrationName);

            return integration;
        }

        public async Task<List<ExternalIntegration>> GetActiveIntegrationsAsync()
        {
            return await _db.ExternalIntegrations
                .Where(i => i.IsActive && i.IsVerified)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<ExternalIntegration>> GetPendingIntegrationsAsync()
        {
            return await _db.ExternalIntegrations
                .Where(i => i.VerificationStatus == "pending")
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> CheckRequestLimitAsync(string apiKey)
        {
            var integration = await _db.ExternalIntegrations
                .FirstOrDefaultAsync(i => i.ApiKey == apiKey && i.IsActive);

            if (integration == null) return false;

            if (integration.RequestsThisMonth >= integration.RequestLimit)
            {
                _logger.LogWarning("Request limit exceeded for integration {Name}", integration.IntegrationName);
                return false;
            }

            integration.RequestsThisMonth++;
            integration.LastAccessedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return true;
        }

        public async Task LogIntegrationAccessAsync(int integrationId, string action, string details, bool success, string errorMessage)
        {
            var log = new IntegrationAuditLog
            {
                IntegrationId = integrationId,
                Action = action,
                Details = details,
                ResponseStatus = success ? "200" : "400",
                ErrorMessage = errorMessage,
                CreatedAt = DateTime.UtcNow
            };

            _db.IntegrationAuditLogs.Add(log);
            await _db.SaveChangesAsync();
        }

        private static string GenerateApiKey()
        {
            using var rng = RandomNumberGenerator.Create();
            var tokenData = new byte[32];
            rng.GetBytes(tokenData);
            return "sk_live_" + Convert.ToBase64String(tokenData).Replace("+", "-").Replace("/", "_").Replace("=", "");
        }

        private static string GenerateApiSecret()
        {
            using var rng = RandomNumberGenerator.Create();
            var tokenData = new byte[64];
            rng.GetBytes(tokenData);
            return Convert.ToBase64String(tokenData).Replace("+", "-").Replace("/", "_").Replace("=", "");
        }
    }
}
