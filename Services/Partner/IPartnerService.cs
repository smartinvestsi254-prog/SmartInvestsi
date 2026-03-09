using System;
using System.Threading.Tasks;
using SmartInvest.Models.Entities.Partner;

namespace SmartInvest.Services.Partner
{
    public record PartnershipApplicationInput(
        string CompanyName,
        string PartnerType,
        string ContactEmail,
        string? ContactPhone,
        string? ContactPerson,
        string? ContactTitle,
        string? ServicesOffered,
        decimal? CommissionRate,
        decimal? RevenueSharePercentage,
        decimal? MinimumInvestment,
        string? PartnershipTier,
        string? WebhookUrl,
        bool? ApiEnabled);

    public record PartnershipStatusUpdateInput(
        string Status,
        DateTime? ActivationDate,
        string? Notes);

    public record PartnerProductInput(
        string ProductName,
        string ProductType,
        string? Ticker,
        decimal MinimumInvestment,
        decimal ManagementFee,
        decimal PerformanceFee,
        string RiskRating,
        decimal ExpectedReturn,
        string? Description,
        bool IsActive);

    public record PartnerTransactionInput(
        int PartnershipId,
        string UserId,
        decimal Amount,
        string TransactionType,
        string Status,
        decimal? CommissionOverrideRate);

    public record PartnerDashboardSummary(
        int PartnershipId,
        string CompanyName,
        string PartnershipStatus,
        string? PartnershipTier,
        decimal TotalVolume,
        decimal TotalCommission,
        int ActiveProducts,
        DateTime? LastTransactionAt);

    public interface IPartnerService
    {
        Task<Partnership> ApplyAsync(PartnershipApplicationInput input);
        Task<Partnership?> UpdateStatusAsync(int partnershipId, PartnershipStatusUpdateInput input);
        Task<PartnerInvestmentProduct?> AddProductAsync(int partnershipId, PartnerProductInput input);
        Task<PartnerTransaction?> RecordTransactionAsync(PartnerTransactionInput input);
        Task<PartnerDashboardSummary?> GetSummaryAsync(int partnershipId);
    }
}
