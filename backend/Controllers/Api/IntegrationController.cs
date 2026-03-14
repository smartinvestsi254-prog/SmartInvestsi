using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Data;
using SmartInvest.Models.Entities;
using SmartInvest.Models.Entities.Subscription;
using SmartInvest.Services.Analytics;
using SmartInvest.Services.Integration;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/integration")]
    public class IntegrationController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IApiKeyService _apiKeys;
        private readonly IUsageTrackingService _usage;
        private readonly UserManager<ApplicationUser> _userManager;

        public IntegrationController(
            ApplicationDbContext db,
            IApiKeyService apiKeys,
            IUsageTrackingService usage,
            UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _apiKeys = apiKeys;
            _usage = usage;
            _userManager = userManager;
        }

        [Authorize]
        [HttpPost("api-keys")]
        public async Task<IActionResult> CreateApiKey([FromBody] CreateApiKeyInput input)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Check if user has premium subscription
            var user = await _userManager.FindByIdAsync(userId);
            var subscription = await _db.UserSubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == "Active");

            if (subscription == null)
            {
                return BadRequest(new { error = "API key creation requires an active premium subscription" });
            }

            var apiKey = await _apiKeys.CreateKeyAsync(userId, input);

            await _usage.LogActionAsync(userId, "CreateApiKey", "ApiKey", apiKey.Id.ToString(),
                GetIpAddress(), GetUserAgent());

            return Ok(new
            {
                apiKey.Id,
                apiKey.Key,
                apiKey.Name,
                apiKey.Description,
                apiKey.Status,
                apiKey.RateLimitPerHour,
                apiKey.ExpiresAt,
                apiKey.CreatedAt
            });
        }

        [Authorize]
        [HttpGet("api-keys")]
        public async Task<IActionResult> GetMyApiKeys()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var keys = await _db.ApiKeys
                .Where(k => k.UserId == userId)
                .OrderByDescending(k => k.CreatedAt)
                .Select(k => new
                {
                    k.Id,
                    Key = k.Key.Substring(0, 20) + "...", // Masked
                    k.Name,
                    k.Description,
                    k.Status,
                    k.RateLimitPerHour,
                    k.UsageCount,
                    k.LastUsedAt,
                    k.ExpiresAt,
                    k.CreatedAt
                })
                .ToListAsync();

            return Ok(new { apiKeys = keys });
        }

        [Authorize]
        [HttpDelete("api-keys/{keyId}")]
        public async Task<IActionResult> RevokeApiKey(int keyId)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var revoked = await _apiKeys.RevokeKeyAsync(userId, keyId);
            if (!revoked)
            {
                return NotFound();
            }

            await _usage.LogActionAsync(userId, "RevokeApiKey", "ApiKey", keyId.ToString(),
                GetIpAddress(), GetUserAgent());

            return Ok(new { success = true });
        }

        [HttpGet("public/connect-info")]
        public IActionResult GetConnectionInfo()
        {
            return Ok(new
            {
                message = "SmartInvest API Integration",
                requirements = new[]
                {
                    "Active premium subscription",
                    "Valid API key",
                    "Rate limiting enforced"
                },
                endpoints = new
                {
                    products = "/api/marketplace/products",
                    orders = "/api/marketplace/orders",
                    cryptoPayments = "/api/payments/crypto/intent"
                },
                documentation = "https://docs.smartinvest.com/api"
            });
        }

        private string? GetUserId()
        {
            if (User?.Identity?.IsAuthenticated == true)
            {
                return _userManager.GetUserId(User);
            }

            if (Request.Headers.TryGetValue("x-user-id", out var headerValue))
            {
                var value = headerValue.ToString();
                return string.IsNullOrWhiteSpace(value) ? null : value;
            }

            return null;
        }

        private string GetIpAddress()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }

        private string GetUserAgent()
        {
            return Request.Headers["User-Agent"].ToString() ?? "unknown";
        }
    }
}
