using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Data;
using SmartInvest.Models.Entities.Partner;

namespace SmartInvest.Services.Partner
{
    public class PartnerService : IPartnerService
    {
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "Pending",
            "Active",
            "Suspended",
            "Terminated"
        };

        private readonly ApplicationDbContext _db;

        public PartnerService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<Partnership> ApplyAsync(PartnershipApplicationInput input)
        {
            var now = DateTime.UtcNow;

            var partnership = new Partnership
            {
                CompanyName = input.CompanyName,
                PartnerType = input.PartnerType,
                ContactEmail = input.ContactEmail,
                ContactPhone = input.ContactPhone ?? string.Empty,
                ContactPerson = input.ContactPerson ?? string.Empty,
                ContactTitle = input.ContactTitle ?? string.Empty,
                ServicesOffered = input.ServicesOffered ?? string.Empty,
                CommissionRate = input.CommissionRate ?? 0.10m,
                RevenueSharePercentage = input.RevenueSharePercentage ?? 0.15m,
                MinimumInvestment = input.MinimumInvestment ?? 0,
                PartnershipTier = input.PartnershipTier ?? "Bronze",
                PartnershipStatus = "Pending",
                ApplicationDate = now,
                ActivationDate = null,
                ApprovalDate = null,
                ApiEnabled = input.ApiEnabled ?? false,
                WebhookUrl = input.WebhookUrl ?? string.Empty,
                CreatedAt = now,
                UpdatedAt = now,
                ProvidesStocks = false,
                ProvidesBonds = false,
                ProvidesCrypto = false,
                ProvidesRealEstate = false,
                ProvidesForex = false
            };

            _db.Partnerships.Add(partnership);
            await _db.SaveChangesAsync();
            return partnership;
        }

        public async Task<Partnership?> UpdateStatusAsync(int partnershipId, PartnershipStatusUpdateInput input)
        {
            if (!AllowedStatuses.Contains(input.Status))
            {
                throw new ArgumentException($"Invalid partnership status '{input.Status}'.", nameof(input.Status));
            }

            var partnership = await _db.Partnerships.FirstOrDefaultAsync(p => p.Id == partnershipId);
            if (partnership == null)
            {
                return null;
            }

            var now = DateTime.UtcNow;
            partnership.PartnershipStatus = input.Status;
            partnership.UpdatedAt = now;

            if (string.Equals(input.Status, "Active", StringComparison.OrdinalIgnoreCase))
            {
                partnership.ApprovalDate ??= input.ActivationDate ?? now;
                partnership.ActivationDate ??= input.ActivationDate ?? now;
            }

            await _db.SaveChangesAsync();
            return partnership;
        }

        public async Task<PartnerInvestmentProduct?> AddProductAsync(int partnershipId, PartnerProductInput input)
        {
            var partnership = await _db.Partnerships.FirstOrDefaultAsync(p => p.Id == partnershipId);
            if (partnership == null)
            {
                return null;
            }

            var product = new PartnerInvestmentProduct
            {
                PartnershipId = partnershipId,
                ProductName = input.ProductName,
                ProductType = input.ProductType,
                Ticker = input.Ticker ?? string.Empty,
                MinimumInvestment = input.MinimumInvestment,
                ManagementFee = input.ManagementFee,
                PerformanceFee = input.PerformanceFee,
                RiskRating = input.RiskRating,
                ExpectedReturn = input.ExpectedReturn,
                Description = input.Description ?? string.Empty,
                IsActive = input.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _db.PartnerInvestmentProducts.Add(product);
            await _db.SaveChangesAsync();
            return product;
        }

        public async Task<PartnerTransaction?> RecordTransactionAsync(PartnerTransactionInput input)
        {
            var partnership = await _db.Partnerships.FirstOrDefaultAsync(p => p.Id == input.PartnershipId);
            if (partnership == null)
            {
                return null;
            }

            var rate = input.CommissionOverrideRate ?? partnership.CommissionRate;
            if (rate < 0)
            {
                rate = 0;
            }

            var commissionEarned = input.Amount * rate;

            var transaction = new PartnerTransaction
            {
                PartnershipId = input.PartnershipId,
                UserId = input.UserId,
                Amount = input.Amount,
                CommissionEarned = commissionEarned,
                TransactionDate = DateTime.UtcNow,
                TransactionType = input.TransactionType,
                Status = input.Status
            };

            _db.PartnerTransactions.Add(transaction);
            await _db.SaveChangesAsync();
            return transaction;
        }

        public async Task<PartnerDashboardSummary?> GetSummaryAsync(int partnershipId)
        {
            var partnership = await _db.Partnerships
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == partnershipId);

            if (partnership == null)
            {
                return null;
            }

            var totals = await _db.PartnerTransactions
                .AsNoTracking()
                .Where(t => t.PartnershipId == partnershipId)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalVolume = g.Sum(t => t.Amount),
                    TotalCommission = g.Sum(t => t.CommissionEarned),
                    LastTx = g.Max(t => (DateTime?)t.TransactionDate)
                })
                .FirstOrDefaultAsync();

            var activeProducts = await _db.PartnerInvestmentProducts
                .AsNoTracking()
                .CountAsync(p => p.PartnershipId == partnershipId && p.IsActive);

            return new PartnerDashboardSummary(
                partnership.Id,
                partnership.CompanyName,
                partnership.PartnershipStatus,
                partnership.PartnershipTier,
                totals?.TotalVolume ?? 0,
                totals?.TotalCommission ?? 0,
                activeProducts,
                totals?.LastTx);
        }
    }
}
