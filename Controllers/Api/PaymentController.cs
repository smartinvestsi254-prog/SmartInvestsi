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
    [Route("api/payments")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly ILivePaymentService _payments;
        private readonly IFraudDetectionService _fraudDetection;
        private readonly UserManager<ApplicationUser> _userManager;

        public PaymentController(ILivePaymentService payments, IFraudDetectionService fraudDetection, UserManager<ApplicationUser> userManager)
        {
            _payments = payments;
            _fraudDetection = fraudDetection;
            _userManager = userManager;
        }

        [HttpPost("process")]
        public async Task<IActionResult> ProcessPayment([FromBody] ProcessPaymentRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.SellerId) || request.Amount <= 0m)
            {
                return BadRequest(new { error = "Invalid seller ID or amount" });
            }

            var method = (request.PaymentMethod ?? string.Empty).Trim().ToLower();
            var available = new[] { "paypal", "bank", "bank_transfer", "mpesa", "google", "googlepay" };
            if (!available.Contains(method))
            {
                return BadRequest(new { error = "Payment method currently unavailable. Use PayPal, Bank, Google Pay or M-Pesa." });
            }

            var result = await _payments.ProcessPaymentAsync(user.Id, request.SellerId, request.Amount, request.PaymentMethod);
            return Ok(result);
        }

        [HttpPost("verify/{transactionId}")]
        public async Task<IActionResult> VerifyPayment(int transactionId, [FromBody] VerifyPaymentRequest request)
        {
            var verified = await _payments.VerifyPaymentAsync(transactionId, request.Reference);
            return Ok(new { success = verified });
        }

        [HttpGet("user/transactions")]
        public async Task<IActionResult> GetUserTransactions()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var transactions = await _payments.GetUserTransactionsAsync(user.Id);
            return Ok(new { transactions });
        }

        [HttpPost("recapture")]
        public async Task<IActionResult> InitiateRecapture([FromBody] InitiateRecaptureRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            try
            {
                await _payments.InitiateRecaptureAsync(request.TransactionId, request.Reason);
                return Ok(new { success = true, message = "Recapture campaign initiated" });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("recapture/campaigns")]
        public async Task<IActionResult> GetRecaptureCampaigns()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var campaigns = await _payments.GetRecaptureCampaignsAsync(user.Id);
            return Ok(new { campaigns });
        }

        [HttpPost("fraud-check")]
        public async Task<IActionResult> CheckFraud([FromBody] FraudCheckRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var result = await _fraudDetection.AnalyzeTransactionAsync(
                user.Id, request.SellerId, request.Amount, request.PaymentMethod, 
                HttpContext.Connection.RemoteIpAddress?.ToString()!);

            return Ok(new
            {
                riskScore = result.RiskScore,
                riskLevel = result.RiskLevel,
                isBlocked = result.IsBlocked,
                requiresManualReview = result.RequiresManualReview,
                indicators = result.Indicators
            });
        }
    }

    public class ProcessPaymentRequest
    {
        public string SellerId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; }
    }

    public class VerifyPaymentRequest
    {
        public string Reference { get; set; }
    }

    public class InitiateRecaptureRequest
    {
        public int TransactionId { get; set; }
        public string Reason { get; set; }
    }

    public class FraudCheckRequest
    {
        public string SellerId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; }
    }
}
