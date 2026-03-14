using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartInvest.Data;
using SmartInvest.Models.Entities.Marketplace;

namespace SmartInvest.Services.Marketplace
{
    public interface IShippingService
    {
        Task<ShippingLabel> CreateLabelAsync(int orderId, string originAddress, string destinationAddress, decimal weightKg, int carrierId);
        Task<List<ShippingRate>> GetRatesAsync(string fromCountry, string toCountry, int weightGrams);
        Task<ShippingAdvice> AddShippingAdviceAsync(int shippingLabelId, string status, string message);
        Task<string> GetTrackingInfoAsync(string trackingNumber);
        Task<ShippingLabel> GetLabelAsync(int id);
    }

    public class ShippingService : IShippingService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<ShippingService> _logger;

        public ShippingService(ApplicationDbContext db, ILogger<ShippingService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<ShippingLabel> CreateLabelAsync(int orderId, string originAddress, string destinationAddress, decimal weightKg, int carrierId)
        {
            var carrier = await _db.ShippingCarriers.FirstOrDefaultAsync(c => c.Id == carrierId && c.IsActive);
            if (carrier == null)
            {
                throw new ArgumentException("Invalid or inactive carrier");
            }

            var trackingNumber = GenerateTrackingNumber(carrier.CarrierName);

            var label = new ShippingLabel
            {
                OrderId = orderId,
                CarrierId = carrierId,
                TrackingNumber = trackingNumber,
                OriginAddress = originAddress,
                DestinationAddress = destinationAddress,
                Weight = weightKg,
                WeightUnit = "kg",
                Status = "pending",
                ShippedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.ShippingLabels.Add(label);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Shipping label created: {TrackingNumber} for order {OrderId}", trackingNumber, orderId);

            return label;
        }

        public async Task<List<ShippingRate>> GetRatesAsync(string fromCountry, string toCountry, int weightGrams)
        {
            return await _db.ShippingRates
                .Where(r => r.OriginCountry == fromCountry && r.DestinationCountry == toCountry &&
                    r.MinWeightGrams <= weightGrams && r.MaxWeightGrams >= weightGrams)
                .ToListAsync();
        }

        public async Task<ShippingAdvice> AddShippingAdviceAsync(int shippingLabelId, string status, string message)
        {
            var label = await _db.ShippingLabels.FirstOrDefaultAsync(l => l.Id == shippingLabelId);
            if (label == null)
            {
                throw new ArgumentException("Shipping label not found");
            }

            var advice = new ShippingAdvice
            {
                ShippingLabelId = shippingLabelId,
                Status = status,
                Message = message,
                CreatedAt = DateTime.UtcNow
            };

            label.Status = status;
            if (status == "delivered")
            {
                label.DeliveredAt = DateTime.UtcNow;
            }

            _db.ShippingAdvices.Add(advice);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Shipping advice added for label {LabelId}: {Status}", shippingLabelId, status);

            return advice;
        }

        public async Task<string> GetTrackingInfoAsync(string trackingNumber)
        {
            var label = await _db.ShippingLabels.FirstOrDefaultAsync(l => l.TrackingNumber == trackingNumber);
            if (label == null)
            {
                return "Tracking number not found";
            }

            var advices = await _db.ShippingAdvices
                .Where(a => a.ShippingLabelId == label.Id)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            var info = $"Tracking: {trackingNumber}\n";
            info += $"Current Status: {label.Status}\n";
            info += $"Shipped: {label.ShippedAt:g}\n";
            if (label.DeliveredAt.HasValue)
            {
                info += $"Delivered: {label.DeliveredAt:g}\n";
            }

            info += "\nUpdates:\n";
            foreach (var advice in advices)
            {
                info += $"{advice.CreatedAt:g} - {advice.Status}: {advice.Message}\n";
            }

            return info;
        }

        public async Task<ShippingLabel> GetLabelAsync(int id)
        {
            return await _db.ShippingLabels.FirstOrDefaultAsync(l => l.Id == id);
        }

        private static string GenerateTrackingNumber(string carrierName)
        {
            var prefix = carrierName.Substring(0, Math.Min(3, carrierName.Length)).ToUpper();
            var timestamp = DateTime.UtcNow.Ticks.ToString().Substring(0, 10);
            var random = new Random().Next(100000, 999999);
            return $"{prefix}{timestamp}{random}";
        }
    }
}
