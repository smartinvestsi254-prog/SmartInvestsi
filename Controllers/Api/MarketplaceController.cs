using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SmartInvest.Models.Entities;
using SmartInvest.Models.Entities.Marketplace;
using SmartInvest.Services.Analytics;
using SmartInvest.Services.Marketplace;
using SmartInvest.Services.Security;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/marketplace")]
    public class MarketplaceController : ControllerBase
    {
        private readonly IMarketplaceService _marketplace;
        private readonly ISecurityService _security;
        private readonly IUsageTrackingService _usage;
        private readonly UserManager<ApplicationUser> _userManager;

        public MarketplaceController(
            IMarketplaceService marketplace,
            ISecurityService security,
            IUsageTrackingService usage,
            UserManager<ApplicationUser> userManager)
        {
            _marketplace = marketplace;
            _security = security;
            _usage = usage;
            _userManager = userManager;
        }

        [Authorize]
        [HttpPost("products")]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductInput input)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var product = await _marketplace.CreateProductAsync(userId, input);

            await _usage.LogActionAsync(userId, "CreateProduct", "Product", product.Id.ToString(),
                GetIpAddress(), GetUserAgent());

            return Ok(product);
        }

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] ProductFilter filter)
        {
            var products = await _marketplace.GetProductsAsync(filter);
            return Ok(new { products });
        }

        [Authorize]
        [HttpPost("orders")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderInput input, [FromQuery] string? recaptchaToken = null)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Verify reCAPTCHA for order creation
            if (!string.IsNullOrWhiteSpace(recaptchaToken))
            {
                var recaptchaValid = await _security.VerifyRecaptchaAsync(recaptchaToken);
                if (!recaptchaValid)
                {
                    return BadRequest(new { error = "reCAPTCHA verification failed" });
                }
            }

            // Assess fraud risk
            var fraudCheck = await _security.AssessFraudRiskAsync(userId, new FraudAssessmentInput
            {
                EntityType = "Order",
                EntityId = "new",
                TransactionAmount = 0, // Will be calculated
                IpAddress = GetIpAddress(),
                UserAgent = GetUserAgent()
            });

            if (fraudCheck.Blocked)
            {
                return BadRequest(new { error = "Transaction blocked due to security concerns", riskLevel = fraudCheck.RiskLevel });
            }

            var order = await _marketplace.CreateOrderAsync(userId, input);

            await _usage.LogActionAsync(userId, "CreateOrder", "Order", order.Id.ToString(),
                GetIpAddress(), GetUserAgent());

            return Ok(order);
        }

        [Authorize]
        [HttpPut("orders/{orderId}/status")]
        public async Task<IActionResult> UpdateOrderStatus(int orderId, [FromBody] UpdateOrderStatusInput input)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var order = await _marketplace.UpdateOrderStatusAsync(orderId, userId, input.Status);

            await _usage.LogActionAsync(userId, "UpdateOrderStatus", "Order", orderId.ToString(),
                GetIpAddress(), GetUserAgent(), $"Status: {input.Status}");

            return Ok(order);
        }

        [Authorize]
        [HttpPost("orders/{orderId}/shipping")]
        public async Task<IActionResult> CreateShippingAdvice(int orderId, [FromBody] CreateShippingAdviceInput input)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var advice = await _marketplace.CreateShippingAdviceAsync(orderId, input);

            await _usage.LogActionAsync(userId, "CreateShippingAdvice", "Order", orderId.ToString(),
                GetIpAddress(), GetUserAgent());

            return Ok(advice);
        }

        [Authorize]
        [HttpGet("orders")]
        public async Task<IActionResult> GetMyOrders([FromQuery] OrderFilter filter)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var orders = await _marketplace.GetOrdersForUserAsync(userId, filter);
            return Ok(new { orders });
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

    public class UpdateOrderStatusInput
    {
        public OrderStatus Status { get; set; }
    }
}
