using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Data;
using SmartInvest.Models.Entities.Analytics;

namespace SmartInvest.Services.Analytics
{
    public interface IUsageTrackingService
    {
        Task LogActionAsync(string userId, string action, string entityType, string entityId, string ipAddress, string userAgent, string metadata = null);
        Task<DashboardStats> GetDashboardStatsAsync();
    }

    public class UsageTrackingService : IUsageTrackingService
    {
        private readonly ApplicationDbContext _db;

        public UsageTrackingService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task LogActionAsync(string userId, string action, string entityType, string entityId, string ipAddress, string userAgent, string metadata = null)
        {
            var log = new UsageLog
            {
                UserId = userId,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Metadata = metadata,
                CreatedAt = DateTime.UtcNow
            };

            _db.UsageLogs.Add(log);
            await _db.SaveChangesAsync();
        }

        public async Task<DashboardStats> GetDashboardStatsAsync()
        {
            var totalUsers = await _db.Users.CountAsync();
            var totalProducts = await _db.Products.CountAsync();
            var totalOrders = await _db.Orders.CountAsync();
            var pendingOrders = await _db.Orders.CountAsync(o => o.Status == Models.Entities.Marketplace.OrderStatus.Pending || o.Status == Models.Entities.Marketplace.OrderStatus.PaymentPending);
            var totalRevenue = await _db.Orders
                .Where(o => o.Status == Models.Entities.Marketplace.OrderStatus.Paid || o.Status == Models.Entities.Marketplace.OrderStatus.Processing || o.Status == Models.Entities.Marketplace.OrderStatus.Shipped || o.Status == Models.Entities.Marketplace.OrderStatus.Delivered)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

            var activeApiKeys = await _db.ApiKeys
                .CountAsync(k => k.Status == Models.Entities.Integration.ApiKeyStatus.Active);

            var executiveCount = await _db.ExecutiveAccesses
                .CountAsync(e => e.IsActive);

            var last24hOrders = await _db.Orders
                .CountAsync(o => o.CreatedAt >= DateTime.UtcNow.AddHours(-24));

            var last24hUsers = await _db.Users
                .CountAsync(u => u.CreatedAt >= DateTime.UtcNow.AddHours(-24));

            return new DashboardStats
            {
                TotalUsers = totalUsers,
                TotalProducts = totalProducts,
                TotalOrders = totalOrders,
                PendingOrders = pendingOrders,
                TotalRevenue = totalRevenue,
                ActiveApiKeys = activeApiKeys,
                ExecutiveCount = executiveCount,
                Last24hOrders = last24hOrders,
                Last24hUsers = last24hUsers
            };
        }
    }

    public class DashboardStats
    {
        public int TotalUsers { get; set; }
        public int TotalProducts { get; set; }
        public int TotalOrders { get; set; }
        public int PendingOrders { get; set; }
        public decimal TotalRevenue { get; set; }
        public int ActiveApiKeys { get; set; }
        public int ExecutiveCount { get; set; }
        public int Last24hOrders { get; set; }
        public int Last24hUsers { get; set; }
    }
}
