gitusing System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace SmartInvest.Services.Payment
{
    public interface IPaymentService
    {
        Task<PaymentResult> ProcessPayment(PaymentRequest request);
        Task<PaymentResult> ProcessRefund(string transactionId, decimal amount);
        Task<bool> VerifyPayment(string reference);
    }

    public class PaymentService : IPaymentService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<PaymentService> _logger;

        public PaymentService(IConfiguration configuration, ILogger<PaymentService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<PaymentResult> ProcessPayment(PaymentRequest request)
        {
            var method = request.PaymentMethod?.Trim().ToLower() ?? string.Empty;
            var available = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "paypal",
                "bank",
                "bank_transfer",
                "mpesa",
                "google",
                "googlepay",
            };

            if (!available.Contains(method))
            {
                _logger.LogWarning("Payment method '{Method}' requested but is currently unavailable", method);
                return new PaymentResult
                {
                    Success = false,
                    Message = "Selected payment gateway is currently unavailable. Please choose PayPal, Bank, Google Pay or M-Pesa."
                };
            }

            try
            {
                // Route to appropriate payment gateway - only available ones will reach here
                return method switch
                {
                    "paypal" => await ProcessPayPalPayment(request),
                    "bank" or "bank_transfer" => await ProcessBankPayment(request),
                    "mpesa" => await ProcessMpesaPayment(request),
                    "google" or "googlepay" => await ProcessGooglePayPayment(request),
                    _ => new PaymentResult { Success = false, Message = "Unsupported payment method" }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Payment processing failed");
                return new PaymentResult { Success = false, Message = ex.Message };
            }
        }

        private async Task<PaymentResult> ProcessPaystackPayment(PaymentRequest request)
        {
            // paystack is currently not available – kept for future reference
            _logger.LogWarning("Paystack requested but marked unavailable");
            return await Task.FromResult(new PaymentResult
            {
                Success = false,
                Message = "Paystack payments are currently unavailable"
            });
        }

        private async Task<PaymentResult> ProcessFlutterwavePayment(PaymentRequest request)
        {
            // flutterwave currently unavailable
            _logger.LogWarning("Flutterwave requested but marked unavailable");
            return await Task.FromResult(new PaymentResult { Success = false, Message = "Flutterwave payments are currently unavailable" });
        }

        private async Task<PaymentResult> ProcessStripePayment(PaymentRequest request)
        {
            // stripe currently unavailable
            _logger.LogWarning("Stripe requested but marked unavailable");
            return await Task.FromResult(new PaymentResult { Success = false, Message = "Stripe payments are currently unavailable" });
        }

        private async Task<PaymentResult> ProcessPayPalPayment(PaymentRequest request)
        {
            // PayPal integration - currently available
            var totalAmount = request.Amount + (request.OptionalTip ?? 0);
            _logger.LogInformation("Processing PayPal payment for {Amount} {Currency} + {Tip} tip", request.Amount, request.Currency, request.OptionalTip ?? 0);
            return await Task.FromResult(new PaymentResult
            {
                Success = true,
                TransactionId = Guid.NewGuid().ToString(),
                Reference = $"PP_{DateTime.UtcNow:yyyyMMddHHmmss}",
                Message = "PayPal payment accepted",
                Amount = request.Amount,
                TipAmount = request.OptionalTip
            });
        }

        private async Task<PaymentResult> ProcessGooglePayPayment(PaymentRequest request)
        {
            // Google Pay integration - currently available
            var totalAmount = request.Amount + (request.OptionalTip ?? 0);
            _logger.LogInformation("Processing Google Pay payment for {Amount} {Currency} + {Tip} tip", request.Amount, request.Currency, request.OptionalTip ?? 0);
            return await Task.FromResult(new PaymentResult
            {
                Success = true,
                TransactionId = Guid.NewGuid().ToString(),
                Reference = $"GP_{DateTime.UtcNow:yyyyMMddHHmmss}",
                Message = "Google Pay payment accepted",
                Amount = request.Amount,
                TipAmount = request.OptionalTip
            });
        }

        private async Task<PaymentResult> ProcessMpesaPayment(PaymentRequest request)
        {
            // M-Pesa integration stub - currently available
            var totalAmount = request.Amount + (request.OptionalTip ?? 0);
            _logger.LogInformation("Processing M-Pesa payment for {Amount} {Currency} + {Tip} tip", request.Amount, request.Currency, request.OptionalTip ?? 0);
            return await Task.FromResult(new PaymentResult
            {
                Success = true,
                TransactionId = Guid.NewGuid().ToString(),
                Reference = $"MPESA_{DateTime.UtcNow:yyyyMMddHHmmss}",
                Message = "M-Pesa payment accepted",
                Amount = request.Amount,
                TipAmount = request.OptionalTip
            });
        }

        private async Task<PaymentResult> ProcessBankPayment(PaymentRequest request)
        {
            // Bank transfer manual instructions - currently available
            var totalAmount = request.Amount + (request.OptionalTip ?? 0);
            _logger.LogInformation("Bank transfer selected for {Amount} {Currency} + {Tip} tip", request.Amount, request.Currency, request.OptionalTip ?? 0);
            return await Task.FromResult(new PaymentResult
            {
                Success = true,
                Message = "Please complete the bank transfer using the provided account details",
                Amount = request.Amount,
                TipAmount = request.OptionalTip
            });
        }

        public async Task<PaymentResult> ProcessRefund(string transactionId, decimal amount)
        {
            _logger.LogInformation("Processing refund for transaction {TransactionId}", transactionId);
            
            return await Task.FromResult(new PaymentResult
            {
                Success = true,
                Message = "Refund processed successfully",
                Amount = amount
            });
        }

        public async Task<bool> VerifyPayment(string reference)
        {
            _logger.LogInformation("Verifying payment {Reference}", reference);
            return await Task.FromResult(true);
        }
    }

    public class PaymentRequest
    {
        public string UserId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public string PaymentMethod { get; set; }
        public string Email { get; set; }
        public string Description { get; set; }
        public Dictionary<string, string> Metadata { get; set; }
        public decimal? OptionalTip { get; set; }
        public string TipCurrency { get; set; } = "USD";
    }

    public class PaymentResult
    {
        public bool Success { get; set; }
        public string TransactionId { get; set; }
        public string Reference { get; set; }
        public string Message { get; set; }
        public decimal Amount { get; set; }
        public decimal? TipAmount { get; set; }
        public decimal TotalAmount => Amount + (TipAmount ?? 0);
    }
}
