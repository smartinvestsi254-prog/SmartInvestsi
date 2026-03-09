using Microsoft.AspNetCore.Mvc;
using SmartInvest.Services.Calculation;

namespace SmartInvest.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class CalculationController : ControllerBase
    {
        private readonly IInvestmentCalculationService _calculationService;

        public CalculationController(IInvestmentCalculationService calculationService)
        {
            _calculationService = calculationService;
        }

        [HttpPost("compound-interest")]
        public IActionResult CalculateCompoundInterest([FromBody] CompoundInterestRequest request)
        {
            var result = _calculationService.CalculateCompoundInterest(
                request.Principal,
                request.Rate,
                request.Years,
                request.CompoundingFrequency
            );

            return Ok(new { futureValue = result, gain = result - request.Principal });
        }

        [HttpPost("future-value")]
        public IActionResult CalculateFutureValue([FromBody] FutureValueRequest request)
        {
            var result = _calculationService.CalculateFutureValue(
                request.Principal,
                request.MonthlyContribution,
                request.AnnualRate,
                request.Years
            );

            return Ok(new { futureValue = result });
        }

        [HttpPost("roi")]
        public IActionResult CalculateROI([FromBody] ROIRequest request)
        {
            var result = _calculationService.CalculateROI(
                request.InitialInvestment,
                request.CurrentValue,
                request.Years
            );

            return Ok(result);
        }

        [HttpPost("tax")]
        public IActionResult CalculateTax([FromBody] TaxRequest request)
        {
            var result = _calculationService.CalculateTax(request.Income, request.Region);
            return Ok(result);
        }
    }

    // Request Models
    public record CompoundInterestRequest(decimal Principal, decimal Rate, int Years, int CompoundingFrequency);
    public record FutureValueRequest(decimal Principal, decimal MonthlyContribution, decimal AnnualRate, int Years);
    public record ROIRequest(decimal InitialInvestment, decimal CurrentValue, int Years);
    public record TaxRequest(decimal Income, string Region);
}
