using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using SmartInvest.Services.Integration;

namespace SmartInvest.Middleware
{
    public class ApiKeyAuthenticationMiddleware
    {
        private readonly RequestDelegate _next;

        public ApiKeyAuthenticationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, IApiKeyService apiKeyService)
        {
            // Only check API key for API routes
            var path = context.Request.Path.ToString();
            if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            // Skip API key check for public endpoints
            var publicEndpoints = new[]
            {
                "/api/health",
                "/api/public-config",
                "/api/auth/signup",
                "/api/auth/login",
                "/api/integration/public/connect-info",
                "/api/social/feed"
            };

            if (publicEndpoints.Any(e => path.StartsWith(e, StringComparison.OrdinalIgnoreCase)))
            {
                await _next(context);
                return;
            }

            // Check for Authorization header or x-api-key header
            var hasAuth = context.Request.Headers.ContainsKey("Authorization");
            var hasApiKey = context.Request.Headers.TryGetValue("x-api-key", out var apiKeyHeader);

            // If has Authorization (JWT), proceed normally
            if (hasAuth)
            {
                await _next(context);
                return;
            }

            // If has API key, validate it
            if (hasApiKey)
            {
                var apiKey = apiKeyHeader.ToString();
                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("Invalid API key");
                    return;
                }

                var validKey = await apiKeyService.ValidateKeyAsync(apiKey);
                if (validKey == null)
                {
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("Invalid or expired API key");
                    return;
                }

                // Check rate limit
                var now = DateTime.UtcNow;
                var hourlyUsage = await CountHourlyUsageAsync(validKey.Id, apiKeyService);
                if (hourlyUsage >= validKey.RateLimitPerHour)
                {
                    context.Response.StatusCode = 429;
                    await context.Response.WriteAsync("Rate limit exceeded");
                    return;
                }

                // Record usage
                await apiKeyService.RecordUsageAsync(validKey.Id);

                // Set user context for API key
                context.Items["ApiKeyUserId"] = validKey.UserId;
                context.Items["ApiKeyId"] = validKey.Id;

                await _next(context);
                return;
            }

            // No auth method provided
            await _next(context);
        }

        private async Task<int> CountHourlyUsageAsync(int keyId, IApiKeyService apiKeyService)
        {
            var sinceUtc = DateTime.UtcNow.AddHours(-1);
            return await apiKeyService.CountUsageSinceAsync(keyId, sinceUtc);
        }
    }
}
