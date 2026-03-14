using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Data;
using SmartInvest.Models.Entities;
using SmartInvest.Services.Analytics;
using SmartInvest.Services.Authorization;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/admin")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IAdminAuthorizationService _adminAuth;
        private readonly IUsageTrackingService _usage;
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminController(
            ApplicationDbContext db,
            IAdminAuthorizationService adminAuth,
            IUsageTrackingService usage,
            UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _adminAuth = adminAuth;
            _usage = usage;
            _userManager = userManager;
        }

        [HttpGet("verify-access")]
        public async Task<IActionResult> VerifyAccess()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var isAdmin = await _adminAuth.IsAdminAsync(userId);
            var isExecutive = await _adminAuth.IsExecutiveAsync(userId);

            if (!isAdmin && !isExecutive)
            {
                return Forbid();
            }

            var user = await _userManager.FindByIdAsync(userId);

            return Ok(new
            {
                isAdmin,
                isExecutive,
                email = user?.Email,
                access = "granted"
            });
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (!await _adminAuth.IsExecutiveAsync(userId))
            {
                return Forbid();
            }

            var stats = await _usage.GetDashboardStatsAsync();

            await _usage.LogActionAsync(userId, "ViewDashboard", "Admin", "Dashboard",
                GetIpAddress(), GetUserAgent());

            return Ok(stats);
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (!await _adminAuth.IsAdminAsync(userId))
            {
                return Forbid();
            }

            var skip = (page - 1) * pageSize;
            var users = await _db.Users
                .OrderByDescending(u => u.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    u.Role,
                    u.IsExecutive,
                    u.CreatedAt,
                    u.LastLoginDate,
                    u.KYCStatus,
                    u.Region
                })
                .ToListAsync();

            var totalUsers = await _db.Users.CountAsync();

            await _usage.LogActionAsync(userId, "ViewAllUsers", "Admin", "Users",
                GetIpAddress(), GetUserAgent());

            return Ok(new { users, total = totalUsers, page, pageSize });
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> GetAllTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (!await _adminAuth.IsAdminAsync(userId))
            {
                return Forbid();
            }

            var skip = (page - 1) * pageSize;
            var orders = await _db.Orders
                .OrderByDescending(o => o.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            var totalOrders = await _db.Orders.CountAsync();

            await _usage.LogActionAsync(userId, "ViewAllTransactions", "Admin", "Transactions",
                GetIpAddress(), GetUserAgent());

            return Ok(new { transactions = orders, total = totalOrders, page, pageSize });
        }

        [HttpGet("usage")]
        public async Task<IActionResult> GetUsageLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (!await _adminAuth.IsAdminAsync(userId))
            {
                return Forbid();
            }

            var skip = (page - 1) * pageSize;
            var logs = await _db.UsageLogs
                .OrderByDescending(l => l.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            var totalLogs = await _db.UsageLogs.CountAsync();

            await _usage.LogActionAsync(userId, "ViewUsageLogs", "Admin", "Usage", 
                GetIpAddress(), GetUserAgent());

            return Ok(new { logs, total = totalLogs, page, pageSize });
        }

        [HttpPost("executives/grant")]
        public async Task<IActionResult> GrantExecutiveAccess([FromBody] GrantExecutiveRequest request)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (!await _adminAuth.IsAdminAsync(userId))
            {
                return Forbid();
            }

            var access = await _adminAuth.GrantExecutiveAccessAsync(userId, request.TargetUserId, new GrantExecutiveInput
            {
                AccessLevel = request.AccessLevel,
                Permissions = request.Permissions,
                Reason = request.Reason
            });

            await _usage.LogActionAsync(userId, "GrantExecutiveAccess", "User", request.TargetUserId,
                GetIpAddress(), GetUserAgent(), $"Granted access to {request.TargetUserId}");

            return Ok(access);
        }

        [HttpPost("executives/revoke")]
        public async Task<IActionResult> RevokeExecutiveAccess([FromBody] RevokeExecutiveRequest request)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (!await _adminAuth.IsAdminAsync(userId))
            {
                return Forbid();
            }

            await _adminAuth.RevokeExecutiveAccessAsync(userId, request.TargetUserId);

            await _usage.LogActionAsync(userId, "RevokeExecutiveAccess", "User", request.TargetUserId,
                GetIpAddress(), GetUserAgent(), $"Revoked access from {request.TargetUserId}");

            return Ok(new { success = true });
        }

        [HttpGet("executives")]
        public async Task<IActionResult> GetExecutives()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (!await _adminAuth.IsAdminAsync(userId))
            {
                return Forbid();
            }

            var executives = await _db.ExecutiveAccesses
                .Where(e => e.IsActive)
                .OrderByDescending(e => e.GrantedAt)
                .ToListAsync();

            return Ok(new { executives });
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

    public class GrantExecutiveRequest
    {
        public string TargetUserId { get; set; }
        public string AccessLevel { get; set; }
        public string Permissions { get; set; }
        public string Reason { get; set; }
    }

    public class RevokeExecutiveRequest
    {
        public string TargetUserId { get; set; }
    }
}
