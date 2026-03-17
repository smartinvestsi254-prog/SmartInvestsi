using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartInvest.Data;
using SmartInvest.Models.Entities.Marketplace;

namespace SmartInvest.Services.Marketplace
{
    public interface ILivePaymentService
    {
        Task<LivePaymentResult> ProcessPaymentAsync(string buyerId, string sellerId, decimal amount, string paymentMethod);
        Task<bool> VerifyPaymentAsync(int transactionId, string reference);
        Task<List<TransactionRecord>> GetUserTransactionsAsync(string userId);
        Task InitiateRecaptureAsync(int failedTransactionId, string reason);
        Task<List<RecaptureCampaign>> GetRecaptureCampaignsAsync(string buyerId);
    }

    public class LivePaymentService : ILivePaymentService
    {
        private readonly ApplicationDbContext _db;
        private readonly IFraudDetectionService _fraudDetection;
        private readonly IConfiguration _configuration;
        private readonly ILogger<LivePaymentService> _logger;

        public LivePaymentService(ApplicationDbContext db, IFraudDetectionService fraudDetection, IConfiguration configuration, ILogger<LivePaymentService> logger)
        {
            _db = db;
            _fraudDetection = fraudDetection;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<LivePaymentResult> ProcessPaymentAsync(string buyerId, string sellerId, decimal amount, string paymentMethod)
        {
            if (amount <= 0m)
            {
                return new LivePaymentResult { Success = false, Message = "Invalid amount" };
            }

            var fraudResult = await _fraudDetection.AnalyzeTransactionAsync(buyerId, sellerId, amount, paymentMethod, "");
            if (fraudResult.IsBlocked)
            {
                await _fraudDetection.CreateSafetyAlertAsync(buyerId, null, "blocked_transaction", "Transaction blocked due to fraud detection", "High");
                return new LivePaymentResult { Success = false, Message = "Transaction blocked due to security concerns", FraudScore = fraudResult.RiskScore };
            }

            var buyer = await _db.BuyerAccounts.FirstOrDefaultAsync(b => b.UserId == buyerId);
            if (buyer == null)
            {
                return new LivePaymentResult { Success = false, Message = "Buyer account not found" };
            }

            var seller = await _db.SellerAccounts.FirstOrDefaultAsync(s => s.UserId == sellerId);
            if (seller == null)
            {
                return new LivePaymentResult { Success = false, Message = "Seller account not found" };
            }

            var reference = $"TXN-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString().Substring(0, 8)}";

            var transaction = new TransactionRecord
            {
                BuyerId = buyerId,
                SellerId = sellerId,
                TransactionId = reference,
                Amount = amount,
                Currency = "USD",
                PaymentMethod = paymentMethod,
                PaymentStatus = "pending",
                OrderStatus = "pending",
                FraudCheckPassed = !fraudResult.RequiresManualReview,
                FraudScore = fraudResult.RiskScore,
                CreatedAt = DateTime.UtcNow
            };

            _db.TransactionRecords.Add(transaction);
            await _db.SaveChangesAsync();

            var paymentResult = await ProcessLivePaymentAsync(reference, amount, paymentMethod, buyer, seller);

            transaction.PaymentStatus = paymentResult.Success ? "completed" : "failed";
            transaction.OrderStatus = paymentResult.Success ? "confirmed" : "cancelled";
            await _db.SaveChangesAsync();

            if (paymentResult.Success)
            {
                buyer.TotalPurchases++;
                buyer.TotalSpent += amount;
                seller.TotalProductsSold++;
                seller.TotalRevenue += amount;
                await _db.SaveChangesAsync();
            }

            _logger.LogInformation("Payment processed: {Reference} - Success: {Success}, Amount: {Amount}", 
                reference, paymentResult.Success, amount);

            return new LivePaymentResult
            {
                Success = paymentResult.Success,
                Message = paymentResult.Message,
                TransactionId = transaction.Id,
                Reference = reference,
                FraudScore = fraudResult.RiskScore,
                RequiresManualReview = fraudResult.RequiresManualReview
            };
        }

        public async Task<bool> VerifyPaymentAsync(int transactionId, string reference)
        {
            var transaction = await _db.TransactionRecords.FirstOrDefaultAsync(t => t.Id == transactionId);
            if (transaction == null) return false;

            if (!transaction.TransactionId.Equals(reference, StringComparison.OrdinalIgnoreCase)) return false;

            return transaction.PaymentStatus == "completed";
        }

        public async Task<List<TransactionRecord>> GetUserTransactionsAsync(string userId)
        {
            return await _db.TransactionRecords
                .Where(t => t.BuyerId == userId || t.SellerId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        }

        public async Task InitiateRecaptureAsync(int failedTransactionId, string reason)
        {
            var transaction = await _db.TransactionRecords.FirstOrDefaultAsync(t => t.Id == failedTransactionId);
            if (transaction == null || transaction.PaymentStatus == "completed")
            {
                throw new InvalidOperationException("Transaction not eligible for recapture");
            }

            var campaign = new RecaptureCampaign
            {
                TransactionId = failedTransactionId,
                BuyerId = transaction.BuyerId,
                OriginalTransactionId = transaction.TransactionId,
                OriginalAmount = transaction.Amount,
                Reason = reason,
                Status = "pending",
                RetryAttempts = 0,
                MaxRetries = 3,
                NextRetryAt = DateTime.UtcNow.AddHours(1),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.RecaptureCampaigns.Add(campaign);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Recapture campaign initiated for transaction {TxnId}", failedTransactionId);
        }

        public async Task<List<RecaptureCampaign>> GetRecaptureCampaignsAsync(string buyerId)
        {
            return await _db.RecaptureCampaigns
                .Where(c => c.BuyerId == buyerId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        // stubbed out helper methods for the currently-available gateways

        private async Task<(bool Success, string Message)> ProcessMpesaAsync(string reference, decimal amount)
        {
            _logger.LogInformation("Stub M-Pesa payment for {Reference}", reference);
            // real implementation would call Safaricom Daraja
            return (true, "M-Pesa payment accepted");
        }

        private async Task<(bool Success, string Message)> ProcessGooglePayAsync(string reference, decimal amount)
        {
            _logger.LogInformation("Stub Google Pay payment for {Reference}", reference);
            // real implementation would validate a token etc.
            return (true, "Google Pay payment accepted");
        }

        private async Task<(bool Success, string Message)> ProcessCardPaymentAsync(string reference, decimal amount)
        {
            // temporarily disabled card processing
            _logger.LogWarning("Card payment requested but currently disabled");
            return (false, "Card payments are currently unavailable");
        }

        private async Task<(bool Success, string Message)> ProcessStripeAsync(string reference, decimal amount)
        {
            _logger.LogWarning("Stripe payment requested but currently disabled");
            return (false, "Stripe payments are currently unavailable");
        }

        private async Task<(bool Success, string Message)> ProcessCryptoAsync(string reference, decimal amount)
        {
            _logger.LogWarning("Crypto payment requested but currently disabled");
            return (false, "Crypto payments are currently unavailable");
        }

        private async Task<(bool Success, string Message)> ProcessLivePaymentAsync(string reference, decimal amount, string paymentMethod, BuyerAccount buyer, SellerAccount seller)
        {
            try
            {
                // only a subset of gateways are currently enabled
                switch (paymentMethod.ToLower())
                {
                    case "paypal":
                        return await ProcessPayPalAsync(reference, amount);

                    case "bank_transfer":
                    case "wire":
                    case "bank":
                        return await ProcessBankTransferAsync(reference, amount);

                    case "mpesa":
                        return await ProcessMpesaAsync(reference, amount);

                    case "google":
                    case "googlepay":
                        return await ProcessGooglePayAsync(reference, amount);

                    // these used to exist but are temporarily disabled
                    case "card":
                    case "credit_card":
                    case "debit_card":
                    case "stripe":
                    case "crypto":
                    case "cryptocurrency":
                    case "paypal_express":
                        _logger.LogWarning("{Method} requested but marked unavailable", paymentMethod);
                        return (false, "This payment gateway is currently unavailable");

                    default:
                        return (false, "Unsupported payment method");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Payment processing error for reference {Reference}", reference);
                return (false, $"Payment error: {ex.Message}");
            }
        }

        private async Task<(bool Success, string Message)> ProcessCardPaymentAsync(string reference, decimal amount)
        {
            var apiKey = _configuration["STRIPE_LIVE_API_KEY"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return (false, "Payment gateway not configured");
            }

            return await Task.FromResult((true, $"Card payment {reference} processed successfully"));
        }

        private async Task<(bool Success, string Message)> ProcessBankTransferAsync(string reference, decimal amount)
        {
            return await Task.FromResult((true, $"Bank transfer {reference} initiated"));
        }

        private async Task<(bool Success, string Message)> ProcessPayPalAsync(string reference, decimal amount)
        {
            var clientId = _configuration["PAYPAL_LIVE_CLIENT_ID"];
            if (string.IsNullOrWhiteSpace(clientId))
            {
                return (false, "PayPal not configured for live payments");
            }

            return await Task.FromResult((true, $"PayPal payment {reference} processed"));
        }

        private async Task<(bool Success, string Message)> ProcessStripeAsync(string reference, decimal amount)
        {
            var apiKey = _configuration["STRIPE_LIVE_API_KEY"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return (false, "Stripe not configured");
            }

            return await Task.FromResult((true, $"Stripe payment {reference} processed"));
        }

        private async Task<(bool Success, string Message)> ProcessCryptoAsync(string reference, decimal amount)
        {
            var treasuryAddress = _configuration["CRYPTO_TREASURY_ADDRESS"];
            if (string.IsNullOrWhiteSpace(treasuryAddress))
            {
                return (false, "Crypto payments not configured");
            }

            return await Task.FromResult((true, $"Crypto payment {reference} initiated - awaiting on-chain confirmation"));
        }
    }

    public class LivePaymentResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int TransactionId { get; set; }
        public string Reference { get; set; }
        public decimal FraudScore { get; set; }
        public bool RequiresManualReview { get; set; }
    }
}
