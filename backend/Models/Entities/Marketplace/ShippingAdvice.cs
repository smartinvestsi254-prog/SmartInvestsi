using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Marketplace
{
    public class ShippingAdvice
    {
        [Key]
        public int Id { get; set; }

        public int OrderId { get; set; }

        [Required]
        public string Carrier { get; set; }

        [Required]
        public string TrackingNumber { get; set; }

        public string EstimatedDelivery { get; set; }

        public string ShippingMethod { get; set; }

        public decimal ShippingCost { get; set; }

        public string Origin { get; set; }

        public string Destination { get; set; }

        public string Notes { get; set; }

        // Safety measures
        public bool InsurancePurchased { get; set; }

        public decimal InsuranceAmount { get; set; }

        public bool SignatureRequired { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}
