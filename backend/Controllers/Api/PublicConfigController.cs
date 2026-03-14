using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/public-config")]
    public class PublicConfigController : ControllerBase
    {
        private readonly IConfiguration _config;

        public PublicConfigController(IConfiguration config)
        {
            _config = config;
        }

        [HttpGet]
        public IActionResult Get()
        {
            var supportEmail = _config["SUPPORT_EMAIL"] ?? _config["EMAIL_USER"] ?? "support@example.com";
            var partnerEmail = _config["PARTNER_EMAIL"] ?? _config["PARTNER_CONTACT"] ?? supportEmail;
            var supportPhone = _config["SUPPORT_PHONE"] ?? "Support line available on request";
            var adminEmail = _config["ADMIN_EMAIL"] ?? null;

            var paypalReceiver = _config["PAYPAL_RECEIVER_EMAIL"] ?? _config["PAYPAL_EMAIL"] ?? null;
            var googlePayEmail = _config["GOOGLE_PAY_EMAIL"] ?? null;

            var frontendUrl = _config["FRONTEND_URL"] ?? _config["APP_URL"] ?? string.Empty;

            return Ok(new
            {
                supportEmail,
                partnerEmail,
                supportPhone,
                adminEmail,
                payment = new
                {
                    paypalReceiver,
                    googlePayEmail
                },
                frontendUrl
            });
        }
    }
}
