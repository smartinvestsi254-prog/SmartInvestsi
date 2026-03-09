using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Data;
using SmartInvest.Models.Entities.Analytics;
using SmartInvest.Models.Entities.Integration;

namespace SmartInvest.Services.Integration
{
    public interface IApiKeyService
    {
        Task<ApiKey> CreateKeyAsync(string userId, CreateApiKeyInput input);
        Task<ApiKey> ValidateKeyAsync(string key);
        Task<bool> RevokeKeyAsync(string userId, int keyId);
        Task RecordUsageAsync(int keyId);
        Task<int> CountUsageSinceAsync(int keyId, DateTime sinceUtc);
    }

    public class ApiKeyService : IApiKeyService
    {
        private readonly ApplicationDbContext _db;

        public ApiKeyService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<ApiKey> CreateKeyAsync(string userId, CreateApiKeyInput input)
        {
            var key = GenerateApiKey();

            var apiKey = new ApiKey
            {
                UserId = userId,
                Key = key,
                Name = input.Name,
                Description = input.Description,
                Status = ApiKeyStatus.Active,
                AllowedOrigins = input.AllowedOrigins,
                RateLimitPerHour = input.RateLimitPerHour > 0 ? input.RateLimitPerHour : 1000,
                ExpiresAt = input.ExpiresInDays.HasValue ? DateTime.UtcNow.AddDays(input.ExpiresInDays.Value) : null,
                CreatedAt = DateTime.UtcNow
            };

            _db.ApiKeys.Add(apiKey);
            await _db.SaveChangesAsync();

            return apiKey;
        }

        public async Task<ApiKey> ValidateKeyAsync(string key)
        {
            var apiKey = await _db.ApiKeys
                .FirstOrDefaultAsync(k => k.Key == key && k.Status == ApiKeyStatus.Active);

            if (apiKey == null) return null;

            if (apiKey.ExpiresAt.HasValue && apiKey.ExpiresAt.Value <= DateTime.UtcNow)
            {
                return null;
            }

            return apiKey;
        }

        public async Task<bool> RevokeKeyAsync(string userId, int keyId)
        {
            var apiKey = await _db.ApiKeys
                .FirstOrDefaultAsync(k => k.Id == keyId && k.UserId == userId);

            if (apiKey == null) return false;

            apiKey.Status = ApiKeyStatus.Revoked;
            await _db.SaveChangesAsync();

            return true;
        }

        public async Task RecordUsageAsync(int keyId)
        {
            var apiKey = await _db.ApiKeys.FindAsync(keyId);
            if (apiKey != null)
            {
                apiKey.LastUsedAt = DateTime.UtcNow;
                apiKey.UsageCount++;

                _db.UsageLogs.Add(new UsageLog
                {
                    UserId = apiKey.UserId,
                    Action = "ApiKeyRequest",
                    EntityType = "ApiKey",
                    EntityId = apiKey.Id.ToString(),
                    IpAddress = null,
                    UserAgent = null,
                    Metadata = null,
                    CreatedAt = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();
            }
        }

        public async Task<int> CountUsageSinceAsync(int keyId, DateTime sinceUtc)
        {
            var keyIdString = keyId.ToString();

            return await _db.UsageLogs.CountAsync(log =>
                log.EntityType == "ApiKey" &&
                log.EntityId == keyIdString &&
                log.Action == "ApiKeyRequest" &&
                log.CreatedAt >= sinceUtc);
        }

        private static string GenerateApiKey()
        {
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[32];
            rng.GetBytes(bytes);
            return $"sk_{Convert.ToBase64String(bytes).Replace("+", "").Replace("/", "").Replace("=", "")}";
        }
    }

    public class CreateApiKeyInput
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string AllowedOrigins { get; set; }
        public int RateLimitPerHour { get; set; }
        public int? ExpiresInDays { get; set; }
    }
}
