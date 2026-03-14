using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace SmartInvest.Services.Notification
{
    public interface INotificationService
    {
        Task SendEmail(string to, string subject, string body);
        Task SendSMS(string phoneNumber, string message);
        Task SendPushNotification(string userId, string title, string message);
        Task NotifyInvestmentUpdate(string userId, string message);
    }

    public class NotificationService : INotificationService
    {
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(ILogger<NotificationService> logger)
        {
            _logger = logger;
        }

        public async Task SendEmail(string to, string subject, string body)
        {
            _logger.LogInformation("Sending email to {To}: {Subject}", to, subject);
            await Task.CompletedTask;
        }

        public async Task SendSMS(string phoneNumber, string message)
        {
            _logger.LogInformation("Sending SMS to {Phone}", phoneNumber);
            await Task.CompletedTask;
        }

        public async Task SendPushNotification(string userId, string title, string message)
        {
            _logger.LogInformation("Sending push notification to {UserId}: {Title}", userId, title);
            await Task.CompletedTask;
        }

        public async Task NotifyInvestmentUpdate(string userId, string message)
        {
            await SendEmail($"user{userId}@example.com", "Investment Update", message);
            await SendPushNotification(userId, "Investment Update", message);
        }
    }
}
