using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartInvest.Services.Analytics;
using System.Threading.Tasks;

namespace SmartInvest.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class DashboardController : Controller
    {
        private readonly IAnalyticsService _analytics;

        public DashboardController(IAnalyticsService analytics)
        {
            _analytics = analytics;
        }

        public async Task<IActionResult> Index()
        {
            var analytics = await _analytics.GetPlatformAnalytics();
            return View(analytics);
        }

        public IActionResult Users()
        {
            return View();
        }

        public IActionResult Transactions()
        {
            return View();
        }

        public IActionResult Partners()
        {
            return View();
        }

        public IActionResult Compliance()
        {
            return View();
        }
    }
}
