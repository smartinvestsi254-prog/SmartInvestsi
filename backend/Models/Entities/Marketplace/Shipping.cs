using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Marketplace
{
    public class ShippingCarrier
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string CarrierName { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [StringLength(100)]
        public string ApiEndpoint { get; set; }

        [StringLength(100)]
        public string TrackingUrl { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class ShippingRate
    {
        [Key]
        public int Id { get; set; }

        public int CarrierId { get; set; }

        [StringLength(100)]
        public string ServiceType { get; set; }

        [StringLength(50)]
        public string OriginCountry { get; set; }

        [StringLength(50)]
        public string DestinationCountry { get; set; }

        public int MinWeightGrams { get; set; }

        public int MaxWeightGrams { get; set; }

        public decimal BaseRate { get; set; }

        public decimal RatePerKg { get; set; }

        public int EstimatedDaysMin { get; set; }

        public int EstimatedDaysMax { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }

    public class ShippingLabel
    {
        [Key]
        public int Id { get; set; }

        private int OrderId { get; set; }

        public int CarrierId { get; set; }

        [Required]
        [StringLength(100)]
        public string TrackingNumber { get; set; }

        [StringLength(100)]
        public string CarrierReference { get; set; }

        [StringLength(200)]
        public string OriginAddress { get; set; }

        [StringLength(200)]
        public string DestinationAddress { get; set; }

        public decimal Weight { get; set; }

        [StringLength(50)]
        public string WeightUnit { get; set; }

        public decimal ShippingCost { get; set; }

        [StringLength(50)]
        public string Status { get; set; }

        [StringLength(500)]
        public string LabelUrl { get; set; }

        public DateTime ShippedAt { get; set; }

        public DateTime? DeliveredAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }

    public class ShippingAdvice
    {
        [Key]
        public int Id { get; set; }

        public int ShippingLabelId { get; set; }

        [StringLength(100)]
        public string Status { get; set; }

        [StringLength(500)]
        public string Message { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
