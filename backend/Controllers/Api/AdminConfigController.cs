using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/admin/config")]
    [Authorize(Roles = "Admin")]
    public class AdminConfigController : ControllerBase
    {
        private readonly IConfiguration _config;

        public AdminConfigController(IConfiguration config)
        {
            _config = config;
        }

        [HttpGet]
        public IActionResult Get()
        {
            // Do NOT return secrets such as passwords.
            var adminEmail = _config["ADMIN_EMAIL"] ?? _config["ADMIN_USER"] ?? string.Empty;
            var adminAccountId = _config["ADMIN_ACCOUNT_ID"] ?? string.Empty;
            var paypalReceiver = _config["PAYPAL_RECEIVER_EMAIL"] ?? string.Empty;
            var googlePayEmail = _config["GOOGLE_PAY_EMAIL"] ?? string.Empty;

            return Ok(new
            {
                adminEmail,
                adminAccountId,
                payment = new
                {
                    paypalReceiver,
                    googlePayEmail
                }
            });
        }
    }
}
