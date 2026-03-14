using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SmartInvest.Models.Entities;
using SmartInvest.Services.Marketplace;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/admin/dashboard")]
    [Authorize]
    public class AdminDashboardController : ControllerBase
    {
        private readonly IAdminDashboardService _adminDashboard;
        private readonly UserManager<ApplicationUser> _userManager;
        private const string ALLOWED_ADMIN = "delijah5415@gmail.com";

        public AdminDashboardController(IAdminDashboardService adminDashboard, UserManager<ApplicationUser> userManager)
        {
            _adminDashboard = adminDashboard;
            _userManager = userManager;
        }

        [HttpGet("data")]
        public async Task<IActionResult> GetDashboardData()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var adminEmail = user.Email ?? user.UserName;
            if (!await _adminDashboard.IsValidAdminAsync(adminEmail))
            {
                await LogUnauthorizedAccessAsync(adminEmail);
                return Forbid("Only authorized administrators can access this resource");
            }

            try
            {
                var data = await _adminDashboard.GetDashboardDataAsync(adminEmail);
                return Ok(new { success = true, data });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpGet("analytics")]
        public async Task<IActionResult> GetAnalytics()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!await _adminDashboard.IsValidAdminAsync(user.Email!))
            {
                return Forbid();
            }

            var analytics = await _adminDashboard.GetPlatformAnalyticsAsync();
            return Ok(new { success = true, analytics });
        }

        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs([FromQuery] int days = 30)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!await _adminDashboard.IsValidAdminAsync(user.Email!))
            {
                return Forbid();
            }

            var logs = await _adminDashboard.GetAuditLogsAsync(user.Email!, days);
            return Ok(new { success = true, logs });
        }

        [HttpPost("users/{email}/grant-access")]
        public async Task<IActionResult> GrantAdminAccess(string email, [FromBody] GrantAccessRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!user.Email!.Equals(ALLOWED_ADMIN, System.StringComparison.OrdinalIgnoreCase))
            {
                return Forbid("Only master admin can grant access");
            }

            try
            {
                await _adminDashboard.GrantAdminAccessAsync(email, request.FullName, request.Role);
                await _adminDashboard.LogAdminActionAsync(user.Email!, "grant_admin_access", "AdminAccount", null, 
                    $"Granted access to {email}", true, null, HttpContext.Connection.RemoteIpAddress?.ToString()!);
                
                return Ok(new { success = true, message = $"Admin access granted to {email}" });
            }
            catch (System.Exception ex)
            {
                await _adminDashboard.LogAdminActionAsync(user.Email!, "grant_admin_access", "AdminAccount", null,
                    $"Attempt to grant access to {email}", false, ex.Message, HttpContext.Connection.RemoteIpAddress?.ToString()!);
                
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("users/{email}/revoke-access")]
        public async Task<IActionResult> RevokeAdminAccess(string email)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!user.Email!.Equals(ALLOWED_ADMIN, System.StringComparison.OrdinalIgnoreCase))
            {
                return Forbid("Only master admin can revoke access");
            }

            try
            {
                await _adminDashboard.RevokeAdminAccessAsync(email);
                await _adminDashboard.LogAdminActionAsync(user.Email!, "revoke_admin_access", "AdminAccount", null,
                    $"Revoked access from {email}", true, null, HttpContext.Connection.RemoteIpAddress?.ToString()!);

                return Ok(new { success = true, message = $"Admin access revoked from {email}" });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        private async Task LogUnauthorizedAccessAsync(string email)
        {
            await _adminDashboard.LogAdminActionAsync(email, "unauthorized_access_attempt", "AdminDashboard", null,
                "Unauthorized access attempt", false, "Invalid admin credentials", 
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        }
    }

    public class GrantAccessRequest
    {
        public string FullName { get; set; }
        public string Role { get; set; }
    }
}
