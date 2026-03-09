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
    public interface IFraudDetectionService
    {
        Task<FraudAnalysisResult> AnalyzeTransactionAsync(string buyerId, string sellerId, decimal amount, string paymentMethod, string ipAddress);
        Task<bool> IsBlacklistedAsync(string identifier);
        Task BlacklistAsync(string identifier, string type, string reason, TimeSpan? duration = null);
        Task CreateSafetyAlertAsync(string userId, int? transactionId, string alertType, string message, string severity);
    }

    public class FraudDetectionService : IFraudDetectionService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<FraudDetectionService> _logger;

        public FraudDetectionService(ApplicationDbContext db, ILogger<FraudDetectionService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<FraudAnalysisResult> AnalyzeTransactionAsync(string buyerId, string sellerId, decimal amount, string paymentMethod, string ipAddress)
        {
            var result = new FraudAnalysisResult { RiskScore = 0m, IsBlocked = false };

            if (await IsBlacklistedAsync(buyerId))
            {
                result.RiskScore = 100m;
                result.IsBlocked = true;
                result.Indicators.Add("Buyer is blacklisted");
                return result;
            }

            if (await IsBlacklistedAsync(sellerId))
            {
                result.RiskScore = 100m;
                result.IsBlocked = true;
                result.Indicators.Add("Seller is blacklisted");
                return result;
            }

            var buyerFrequentTransactions = await _db.TransactionRecords
                .Where(t => t.BuyerId == buyerId && t.CreatedAt > DateTime.UtcNow.AddDays(-7))
                .CountAsync();

            if (buyerFrequentTransactions > 50)
            {
                result.RiskScore += 25m;
                result.Indicators.Add("Unusual transaction frequency");
            }

            var buyerTotalToday = await _db.TransactionRecords
                .Where(t => t.BuyerId == buyerId && t.CreatedAt.Date == DateTime.UtcNow.Date)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            if (buyerTotalToday + amount > 50000m)
            {
                result.RiskScore += 20m;
                result.Indicators.Add("Daily spending limit exceeded");
            }

            if (amount > 10000m)
            {
                result.RiskScore += 15m;
                result.Indicators.Add("Unusually large transaction");
            }

            var buyerAverageAmount = await _db.TransactionRecords
                .Where(t => t.BuyerId == buyerId && t.CreatedAt > DateTime.UtcNow.AddDays(-30))
                .AverageAsync(t => (decimal?)t.Amount) ?? 500m;

            if (amount > (buyerAverageAmount * 5))
            {
                result.RiskScore += 18m;
                result.Indicators.Add("Amount exceeds buyer's average");
            }

            var sellerChargebackRate = await GetSellerChargebackRateAsync(sellerId);
            if (sellerChargebackRate > 0.05m)
            {
                result.RiskScore += 12m;
                result.Indicators.Add("Seller has high chargeback rate");
            }

            if (paymentMethod == "crypto" || paymentMethod == "cryptocurrency")
            {
                result.RiskScore += 8m;
                result.Indicators.Add("High-risk payment method");
            }

            if (result.RiskScore >= 70m)
            {
                result.IsBlocked = true;
            }
            else if (result.RiskScore >= 50m)
            {
                result.RequiresManualReview = true;
            }

            var score = new FraudDetectionScore
            {
                UserId = buyerId,
                RiskScore = result.RiskScore,
                RiskLevel = GetRiskLevel(result.RiskScore),
                IsBlocked = result.IsBlocked,
                Indicators = string.Join("; ", result.Indicators),
                CreatedAt = DateTime.UtcNow
            };

            _db.FraudDetectionScores.Add(score);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Fraud analysis for buyer {BuyerId} -> Score: {Score}, Blocked: {IsBlocked}", 
                buyerId, result.RiskScore, result.IsBlocked);

            return result;
        }

        public async Task<bool> IsBlacklistedAsync(string identifier)
        {
            return await _db.BlacklistEntries
                .AnyAsync(b => b.Identifier == identifier && b.IsActive && 
                    (b.ExpiresAt == null || b.ExpiresAt > DateTime.UtcNow));
        }

        public async Task BlacklistAsync(string identifier, string type, string reason, TimeSpan? duration = null)
        {
            var existing = await _db.BlacklistEntries
                .FirstOrDefaultAsync(b => b.Identifier == identifier && b.IsActive);

            if (existing != null)
            {
                existing.Reason = reason;
                existing.ExpiresAt = duration.HasValue ? DateTime.UtcNow.Add(duration.Value) : null;
            }
            else
            {
                var entry = new BlacklistEntry
                {
                    Identifier = identifier,
                    Type = type,
                    Reason = reason,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = duration.HasValue ? DateTime.UtcNow.Add(duration.Value) : null
                };
                _db.BlacklistEntries.Add(entry);
            }

            await _db.SaveChangesAsync();
            _logger.LogWarning("User {Identifier} blacklisted: {Reason}", identifier, reason);
        }

        public async Task CreateSafetyAlertAsync(string userId, int? transactionId, string alertType, string message, string severity)
        {
            var alert = new SafetyAlert
            {
                UserId = userId,
                TransactionId = transactionId,
                AlertType = alertType,
                AlertMessage = message,
                Severity = severity,
                IsResolved = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.SafetyAlerts.Add(alert);
            await _db.SaveChangesAsync();
        }

        private static string GetRiskLevel(decimal score)
        {
            return score switch
            {
                < 20m => "Low",
                < 50m => "Medium",
                < 70m => "High",
                _ => "Critical"
            };
        }

        private async Task<decimal> GetSellerChargebackRateAsync(string sellerId)
        {
            var total = await _db.TransactionRecords
                .Where(t => t.SellerId == sellerId && t.CreatedAt > DateTime.UtcNow.AddDays(-90))
                .CountAsync();

            if (total == 0) return 0m;

            var chargebacks = await _db.TransactionRecords
                .Where(t => t.SellerId == sellerId && t.PaymentStatus == "chargeback")
                .CountAsync();

            return (decimal)chargebacks / total;
        }
    }

    public class FraudAnalysisResult
    {
        public decimal RiskScore { get; set; }
        public bool IsBlocked { get; set; }
        public bool RequiresManualReview { get; set; }
        public List<string> Indicators { get; set; } = new();
    }
}
