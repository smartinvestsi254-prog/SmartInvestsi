using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartInvest.Services.Marketplace;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/shipping")]
    [Authorize]
    public class ShippingController : ControllerBase
    {
        private readonly IShippingService _shipping;

        public ShippingController(IShippingService shipping)
        {
            _shipping = shipping;
        }

        [HttpPost("labels")]
        public async Task<IActionResult> CreateLabel([FromBody] CreateLabelRequest request)
        {
            if (request.Amount <= 0m || string.IsNullOrWhiteSpace(request.OriginAddress) || 
                string.IsNullOrWhiteSpace(request.DestinationAddress))
            {
                return BadRequest(new { error = "Invalid label parameters" });
            }

            try
            {
                var label = await _shipping.CreateLabelAsync(
                    request.OrderId,
                    request.OriginAddress,
                    request.DestinationAddress,
                    request.Amount,
                    request.CarrierId
                );

                return Ok(new { success = true, label });
            }
            catch (System.ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("rates")]
        public async Task<IActionResult> GetRates([FromQuery] string from, [FromQuery] string to, [FromQuery] int weightGrams)
        {
            if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to) || weightGrams <= 0)
            {
                return BadRequest(new { error = "Invalid parameters" });
            }

            var rates = await _shipping.GetRatesAsync(from, to, weightGrams);
            return Ok(new { rates });
        }

        [HttpPost("labels/{labelId}/advice")]
        public async Task<IActionResult> AddAdvice(int labelId, [FromBody] AddAdviceRequest request)
        {
            try
            {
                var advice = await _shipping.AddShippingAdviceAsync(labelId, request.Status, request.Message);
                return Ok(new { success = true, advice });
            }
            catch (System.ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("tracking/{trackingNumber}")]
        public async Task<IActionResult> GetTracking(string trackingNumber)
        {
            var info = await _shipping.GetTrackingInfoAsync(trackingNumber);
            return Ok(new { trackingInfo = info });
        }
    }

    public class CreateLabelRequest
    {
        public int OrderId { get; set; }
        public string OriginAddress { get; set; }
        public string DestinationAddress { get; set; }
        public decimal Amount { get; set; }
        public int CarrierId { get; set; }
    }

    public class AddAdviceRequest
    {
        public string Status { get; set; }
        public string Message { get; set; }
    }
}
