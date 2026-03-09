using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Data;
using SmartInvest.Models.Entities;
using SmartInvest.Models.Entities.Marketplace;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/accounts")]
    public class AccountsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;

        public AccountsController(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        [Authorize]
        [HttpPost("seller/register")]
        public async Task<IActionResult> RegisterAsSeller([FromBody] RegisterSellerRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var existing = await _db.SellerAccounts.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (existing != null)
            {
                return BadRequest(new { error = "You are already registered as a seller" });
            }

            var seller = new SellerAccount
            {
                UserId = user.Id,
                StoreName = request.StoreName,
                StoreDescription = request.StoreDescription,
                StoreEmail = request.StoreEmail ?? user.Email,
                StorePhone = request.StorePhone,
                PayoutMethod = request.PayoutMethod,
                PayoutAccount = request.PayoutAccount,
                Status = "pending_verification",
                KycVerified = false,
                AverageRating = 0m,
                CreatedAt = System.DateTime.UtcNow,
                UpdatedAt = System.DateTime.UtcNow
            };

            _db.SellerAccounts.Add(seller);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, seller });
        }

        [Authorize]
        [HttpPost("buyer/register")]
        public async Task<IActionResult> RegisterAsBuyer()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var existing = await _db.BuyerAccounts.FirstOrDefaultAsync(b => b.UserId == user.Id);
            if (existing != null)
            {
                return Ok(new { success = true, message = "Already registered as buyer", buyer = existing });
            }

            var buyer = new BuyerAccount
            {
                UserId = user.Id,
                Status = "active",
                CreatedAt = System.DateTime.UtcNow,
                UpdatedAt = System.DateTime.UtcNow
            };

            _db.BuyerAccounts.Add(buyer);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, buyer });
        }

        [Authorize]
        [HttpGet("seller/profile")]
        public async Task<IActionResult> GetMySellerProfile()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var seller = await _db.SellerAccounts.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (seller == null) return NotFound();

            return Ok(new { seller });
        }

        [Authorize]
        [HttpGet("buyer/profile")]
        public async Task<IActionResult> GetMyBuyerProfile()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var buyer = await _db.BuyerAccounts.FirstOrDefaultAsync(b => b.UserId == user.Id);
            if (buyer == null) return NotFound();

            return Ok(new { buyer });
        }

        [HttpGet("seller/{userId}")]
        public async Task<IActionResult> GetSellerProfile(string userId)
        {
            var seller = await _db.SellerAccounts
                .FirstOrDefaultAsync(s => s.UserId == userId && s.Status != "inactive");

            if (seller == null) return NotFound();

            return Ok(new { seller });
        }

        [Authorize]
        [HttpGet("sellers/top")]
        public async Task<IActionResult> GetTopSellers([FromQuery] int limit = 10)
        {
            var sellers = await _db.SellerAccounts
                .Where(s => s.Status != "inactive")
                .OrderByDescending(s => s.TotalRevenue)
                .Take(limit)
                .ToListAsync();

            return Ok(new { sellers });
        }

        [Authorize]
        [HttpPut("seller/update")]
        public async Task<IActionResult> UpdateSellerProfile([FromBody] UpdateSellerRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var seller = await _db.SellerAccounts.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (seller == null) return NotFound();

            seller.StoreName = request.StoreName ?? seller.StoreName;
            seller.StoreDescription = request.StoreDescription ?? seller.StoreDescription;
            seller.StoreLogoUrl = request.StoreLogoUrl ?? seller.StoreLogoUrl;
            seller.PayoutMethod = request.PayoutMethod ?? seller.PayoutMethod;
            seller.PayoutAccount = request.PayoutAccount ?? seller.PayoutAccount;
            seller.UpdatedAt = System.DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { success = true, seller });
        }

        [Authorize]
        [HttpPut("buyer/update")]
        public async Task<IActionResult> UpdateBuyerProfile([FromBody] UpdateBuyerRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var buyer = await _db.BuyerAccounts.FirstOrDefaultAsync(b => b.UserId == user.Id);
            if (buyer == null) return NotFound();

            buyer.ShippingAddress = request.ShippingAddress ?? buyer.ShippingAddress;
            buyer.BillingAddress = request.BillingAddress ?? buyer.BillingAddress;
            buyer.PreferredPaymentMethod = request.PreferredPaymentMethod ?? buyer.PreferredPaymentMethod;
            buyer.UpdatedAt = System.DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { success = true, buyer });
        }

        [Authorize]
        [HttpPost("seller/kyc-submit")]
        public async Task<IActionResult> SubmitKyc([FromBody] KycSubmissionRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var seller = await _db.SellerAccounts.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (seller == null) return NotFound();

            seller.KycVerified = true;
            seller.Status = "active";
            seller.UpdatedAt = System.DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "KYC verified successfully", seller });
        }
    }

    public class RegisterSellerRequest
    {
        public string StoreName { get; set; }
        public string StoreDescription { get; set; }
        public string StoreEmail { get; set; }
        public string StorePhone { get; set; }
        public string PayoutMethod { get; set; }
        public string PayoutAccount { get; set; }
    }

    public class UpdateSellerRequest
    {
        public string StoreName { get; set; }
        public string StoreDescription { get; set; }
        public string StoreLogoUrl { get; set; }
        public string PayoutMethod { get; set; }
        public string PayoutAccount { get; set; }
    }

    public class UpdateBuyerRequest
    {
        public string ShippingAddress { get; set; }
        public string BillingAddress { get; set; }
        public string PreferredPaymentMethod { get; set; }
    }

    public class KycSubmissionRequest
    {
        public string IdentityDocument { get; set; }
        public string ProofOfAddress { get; set; }
        public string BusinessRegistration { get; set; }
    }
}
