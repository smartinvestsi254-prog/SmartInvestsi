using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartInvest.Data;
using SmartInvest.Models.Entities.Marketplace;

namespace SmartInvest.Services.Marketplace
{
    public interface IAdminDashboardService
    {
        Task<AdminDashboardData> GetDashboardDataAsync(string adminEmail);
        Task<bool> IsValidAdminAsync(string adminEmail);
        Task LogAdminActionAsync(string adminEmail, string action, string resourceType, int? resourceId, string details, bool success, string errorMessage, string ipAddress);
        Task<List<AdminAuditLog>> GetAuditLogsAsync(string adminEmail, int days = 30);
        Task<PlatformAnalytics> GetPlatformAnalyticsAsync();
        Task GrantAdminAccessAsync(string email, string fullName, string role);
        Task RevokeAdminAccessAsync(string email);
    }

    public class AdminDashboardService : IAdminDashboardService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<AdminDashboardService> _logger;
        private const string ALLOWED_ADMIN_EMAIL = "smartinvestsi254@gmail.com";

        public AdminDashboardService(ApplicationDbContext db, ILogger<AdminDashboardService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<AdminDashboardData> GetDashboardDataAsync(string adminEmail)
        {
            if (!await IsValidAdminAsync(adminEmail))
            {
                _logger.LogWarning("Unauthorized admin access attempt: {Email}", adminEmail);
                throw new UnauthorizedAccessException("You do not have admin access");
            }

            var totalUsers = await _db.Users.CountAsync();
            var totalSellers = await _db.SellerAccounts.CountAsync();
            var totalBuyers = await _db.BuyerAccounts.CountAsync();
            var totalTransactions = await _db.TransactionRecords.CountAsync();
            var totalRevenue = await _db.TransactionRecords.SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var fraudAlerts = await _db.SafetyAlerts.Where(a => !a.IsResolved).CountAsync();
            var activeIntegrations = await _db.ExternalIntegrations.Where(i => i.IsActive).CountAsync();

            var recentTransactions = await _db.TransactionRecords
                .OrderByDescending(t => t.CreatedAt)
                .Take(20)
                .ToListAsync();

            var topSellers = await _db.SellerAccounts
                .OrderByDescending(s => s.TotalRevenue)
                .Take(10)
                .ToListAsync();

            var recentRegistrations = await _db.Users
                .OrderByDescending(u => u.CreatedAt)
                .Take(10)
                .ToListAsync();

            var unresolveFraudAlerts = await _db.SafetyAlerts
                .Where(a => !a.IsResolved)
                .OrderByDescending(a => a.CreatedAt)
                .Take(5)
                .ToListAsync();

            return new AdminDashboardData
            {
                TotalUsers = totalUsers,
                TotalSellers = totalSellers,
                TotalBuyers = totalBuyers,
                TotalTransactions = totalTransactions,
                TotalRevenue = totalRevenue,
                UnresolvedFraudAlerts = fraudAlerts,
                ActiveIntegrations = activeIntegrations,
                RecentTransactions = recentTransactions,
                TopSellers = topSellers,
                RecentRegistrations = recentRegistrations,
                UnresolvedAlerts = unresolveFraudAlerts
            };
        }

        public async Task<bool> IsValidAdminAsync(string adminEmail)
        {
            if (string.IsNullOrWhiteSpace(adminEmail)) return false;

            if (adminEmail.Equals(ALLOWED_ADMIN_EMAIL, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var admin = await _db.AdminAccounts
                .FirstOrDefaultAsync(a => a.AdminEmail == adminEmail && a.CanViewDashboard);

            return admin != null;
        }

        public async Task LogAdminActionAsync(string adminEmail, string action, string resourceType, int? resourceId, string details, bool success, string errorMessage, string ipAddress)
        {
            var log = new AdminAuditLog
            {
                AdminEmail = adminEmail,
                Action = action,
                ResourceType = resourceType,
                ResourceId = resourceId,
                Details = details,
                Success = success,
                ErrorMessage = errorMessage,
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow
            };

            _db.AdminAuditLogs.Add(log);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Admin action: {Action} by {Email} - Success: {Success}", action, adminEmail, success);
        }

        public async Task<List<AdminAuditLog>> GetAuditLogsAsync(string adminEmail, int days = 30)
        {
            if (!await IsValidAdminAsync(adminEmail))
            {
                throw new UnauthorizedAccessException("You do not have admin access");
            }

            var cutoff = DateTime.UtcNow.AddDays(-days);
            return await _db.AdminAuditLogs
                .Where(l => l.CreatedAt >= cutoff)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
        }

        public async Task<PlatformAnalytics> GetPlatformAnalyticsAsync()
        {
            var totalUsers = await _db.Users.CountAsync();
            var totalSellers = await _db.SellerAccounts.CountAsync();
            var totalBuyers = await _db.BuyerAccounts.CountAsync();
            var totalTransactions = await _db.TransactionRecords.CountAsync();
            var totalRevenue = await _db.TransactionRecords.SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var fraudCount = await _db.SafetyAlerts.CountAsync();
            var activeIntegrations = await _db.ExternalIntegrations.Where(i => i.IsActive).CountAsync();

            var avgTxValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0m;
            var fraudRate = totalTransactions > 0 ? (decimal)fraudCount / totalTransactions : 0m;

            var analytics = new PlatformAnalytics
            {
                TotalUsers = totalUsers,
                TotalSellers = totalSellers,
                TotalBuyers = totalBuyers,
                TotalTransactions = totalTransactions,
                TotalRevenue = totalRevenue,
                AverageTransactionValue = avgTxValue,
                FraudDetectedCount = fraudCount,
                FraudRate = fraudRate,
                TotalIntegrations = await _db.ExternalIntegrations.CountAsync(),
                ActiveIntegrations = activeIntegrations,
                CalculatedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _db.PlatformAnalytics.Add(analytics);
            await _db.SaveChangesAsync();

            return analytics;
        }

        public async Task GrantAdminAccessAsync(string email, string fullName, string role)
        {
            if (!email.Equals(ALLOWED_ADMIN_EMAIL, StringComparison.OrdinalIgnoreCase))
            {
                var existing = await _db.AdminAccounts.FirstOrDefaultAsync(a => a.AdminEmail == email);
                if (existing != null)
                {
                    _logger.LogWarning("Attempt to grant admin access to {Email} - not using master email", email);
                    throw new InvalidOperationException("Only master admin can grant access");
                }
            }

            var admin = new AdminAccount
            {
                AdminEmail = email,
                AdminFullName = fullName,
                Role = role,
                CanViewDashboard = true,
                CanManageUsers = true,
                CanManageTransactions = true,
                CanManageSellers = true,
                CanManagePayments = true,
                CanManageIntegrations = true,
                CanViewAnalytics = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.AdminAccounts.Add(admin);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Admin access granted to {Email} with role {Role}", email, role);
        }

        public async Task RevokeAdminAccessAsync(string email)
        {
            if (email.Equals(ALLOWED_ADMIN_EMAIL, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Cannot revoke master admin access");
            }

            var admin = await _db.AdminAccounts.FirstOrDefaultAsync(a => a.AdminEmail == email);
            if (admin != null)
            {
                _db.AdminAccounts.Remove(admin);
                await _db.SaveChangesAsync();
                _logger.LogInformation("Admin access revoked for {Email}", email);
            }
        }
    }

    public class AdminDashboardData
    {
        public int TotalUsers { get; set; }
        public int TotalSellers { get; set; }
        public int TotalBuyers { get; set; }
        public int TotalTransactions { get; set; }
        public decimal TotalRevenue { get; set; }
        public int UnresolvedFraudAlerts { get; set; }
        public int ActiveIntegrations { get; set; }
        public List<TransactionRecord> RecentTransactions { get; set; }
        public List<SellerAccount> TopSellers { get; set; }
        public List<Models.Entities.ApplicationUser> RecentRegistrations { get; set; }
        public List<SafetyAlert> UnresolvedAlerts { get; set; }
    }
}
