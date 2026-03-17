using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SmartInvest.Services.Partner;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/partners")]
    public class PartnersController : ControllerBase
    {
        private readonly IPartnerService _partners;

        public PartnersController(IPartnerService partners)
        {
            _partners = partners;
        }

        [HttpPost("apply")]
        public async Task<IActionResult> Apply([FromBody] PartnershipApplicationInput input)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var partnership = await _partners.ApplyAsync(input);
            return CreatedAtAction(nameof(GetSummary), new { id = partnership.Id }, partnership);
        }

        [HttpPut("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] PartnershipStatusUpdateInput input)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var updated = await _partners.UpdateStatusAsync(id, input);
            if (updated == null)
            {
                return NotFound();
            }

            return Ok(updated);
        }

        [HttpPost("{id:int}/products")]
        public async Task<IActionResult> AddProduct(int id, [FromBody] PartnerProductInput input)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var product = await _partners.AddProductAsync(id, input);
            if (product == null)
            {
                return NotFound();
            }

            return Ok(product);
        }

        [HttpPost("{id:int}/transactions")]
        public async Task<IActionResult> RecordTransaction(int id, [FromBody] PartnerTransactionInput input)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var txInput = input with { PartnershipId = id };
            var transaction = await _partners.RecordTransactionAsync(txInput);
            if (transaction == null)
            {
                return NotFound();
            }

            return Ok(transaction);
        }

        [HttpGet("{id:int}/summary")]
        public async Task<IActionResult> GetSummary(int id)
        {
            var summary = await _partners.GetSummaryAsync(id);
            if (summary == null)
            {
                return NotFound();
            }

            return Ok(summary);
        }
    }
}
