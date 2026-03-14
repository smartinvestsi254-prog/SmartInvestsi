using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SmartInvest.Models.Entities;
using SmartInvest.Services.Payment;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/payments/crypto")]
    public class CryptoPaymentsController : ControllerBase
    {
        private readonly ICryptoPaymentService _cryptoPayments;
        private readonly UserManager<ApplicationUser> _userManager;

        public CryptoPaymentsController(ICryptoPaymentService cryptoPayments, UserManager<ApplicationUser> userManager)
        {
            _cryptoPayments = cryptoPayments;
            _userManager = userManager;
        }

        [Authorize]
        [HttpPost("intent")]
        public async Task<IActionResult> CreateIntent([FromBody] CryptoIntentRequest request)
        {
            var actorId = GetActorId();
            if (actorId == null) return Unauthorized();

            var intent = await _cryptoPayments.CreateIntentAsync(actorId, new CryptoPaymentCreateInput
            {
                AmountUsd = request.AmountUsd,
                AmountNative = request.AmountNative
            });

            return Ok(new
            {
                intent.Reference,
                intent.AssetSymbol,
                intent.ChainId,
                intent.TreasuryAddress,
                intent.AmountNative,
                intent.AmountUsd,
                intent.AmountWei,
                intent.Memo,
                intent.ExpiresAt
            });
        }

        [Authorize]
        [HttpPost("verify")]
        public async Task<IActionResult> Verify([FromBody] CryptoVerifyRequest request)
        {
            var actorId = GetActorId();
            if (actorId == null) return Unauthorized();

            var result = await _cryptoPayments.VerifyAsync(actorId, request.Reference, request.TransactionHash);
            if (!result.Success)
            {
                return BadRequest(new { result.Message, result.Confirmations });
            }

            return Ok(new { result.Message, result.Confirmations, result.Intent });
        }

        private string? GetActorId()
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
    }

    public class CryptoIntentRequest
    {
        public decimal? AmountUsd { get; set; }
        public decimal? AmountNative { get; set; }
    }

    public class CryptoVerifyRequest
    {
        public string Reference { get; set; }
        public string TransactionHash { get; set; }
    }
}
