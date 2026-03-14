using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SmartInvest.Models.Entities;
using SmartInvest.Services.Marketplace;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/external")]
    public class ExternalIntegrationController : ControllerBase
    {
        private readonly IExternalIntegrationService _integrations;
        private readonly IAdminDashboardService _adminDashboard;
        private readonly UserManager<ApplicationUser> _userManager;

        public ExternalIntegrationController(IExternalIntegrationService integrations, IAdminDashboardService adminDashboard, UserManager<ApplicationUser> userManager)
        {
            _integrations = integrations;
            _adminDashboard = adminDashboard;
            _userManager = userManager;
        }

        [HttpPost("request")]
        public async Task<IActionResult> RequestIntegration([FromBody] RequestIntegrationInput input)
        {
            if (string.IsNullOrWhiteSpace(input.IntegrationName) || string.IsNullOrWhiteSpace(input.IntegrationUrl))
            {
                return BadRequest(new { error = "Integration name and URL are required" });
            }

            try
            {
                var integration = await _integrations.RequestIntegrationAsync(
                    input.IntegrationName,
                    input.IntegrationUrl,
                    input.Category,
                    input.RequestPremium
                );

                return Ok(new
                {
                    success = true,
                    message = "Integration request submitted for approval",
                    apiKey = integration.ApiKey,
                    integration
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("verify/{apiKey}")]
        public async Task<IActionResult> VerifyApiKey(string apiKey)
        {
            var isValid = await _integrations.VerifyApiKeyAsync(apiKey);
            return Ok(new { valid = isValid });
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveIntegrations()
        {
            var integrations = await _integrations.GetActiveIntegrationsAsync();
            return Ok(new { integrations });
        }

        [Authorize]
        [HttpGet("admin/pending")]
        public async Task<IActionResult> GetPendingIntegrations()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!await _adminDashboard.IsValidAdminAsync(user.Email!))
            {
                return Forbid();
            }

            var integrations = await _integrations.GetPendingIntegrationsAsync();
            return Ok(new { integrations });
        }

        [Authorize]
        [HttpPost("admin/{integrationId}/approve")]
        public async Task<IActionResult> ApproveIntegration(int integrationId)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!await _adminDashboard.IsValidAdminAsync(user.Email!))
            {
                return Forbid();
            }

            try
            {
                var integration = await _integrations.ApproveIntegrationAsync(integrationId);
                await _adminDashboard.LogAdminActionAsync(user.Email!, "approve_integration", "ExternalIntegration", 
                    integrationId, $"Approved integration: {integration.IntegrationName}", true, null, 
                    HttpContext.Connection.RemoteIpAddress?.ToString()!);

                return Ok(new { success = true, integration });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("admin/{integrationId}/reject")]
        public async Task<IActionResult> RejectIntegration(int integrationId)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!await _adminDashboard.IsValidAdminAsync(user.Email!))
            {
                return Forbid();
            }

            try
            {
                var integration = await _integrations.RejectIntegrationAsync(integrationId);
                await _adminDashboard.LogAdminActionAsync(user.Email!, "reject_integration", "ExternalIntegration",
                    integrationId, $"Rejected integration: {integration.IntegrationName}", true, null,
                    HttpContext.Connection.RemoteIpAddress?.ToString()!);

                return Ok(new { success = true, integration });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("check-request-limit")]
        public async Task<IActionResult> CheckRequestLimit([FromBody] CheckLimitRequest request)
        {
            var canContinue = await _integrations.CheckRequestLimitAsync(request.ApiKey);
            return Ok(new { canContinue });
        }
    }

    public class RequestIntegrationInput
    {
        public string IntegrationName { get; set; }
        public string IntegrationUrl { get; set; }
        public string Category { get; set; }
        public bool RequestPremium { get; set; }
    }

    public class CheckLimitRequest
    {
        public string ApiKey { get; set; }
    }
}
