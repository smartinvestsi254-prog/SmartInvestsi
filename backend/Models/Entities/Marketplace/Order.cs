using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Marketplace
{
    public class Order
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(32)]
        public string OrderNumber { get; set; }

        [Required]
        public string BuyerId { get; set; }

        [Required]
        public string SellerId { get; set; }

        public int ProductId { get; set; }

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal TotalAmount { get; set; }

        public string Currency { get; set; }

        public OrderStatus Status { get; set; }

        public string PaymentReference { get; set; }

        public string PaymentMethod { get; set; }

        public DateTime? PaidAt { get; set; }

        // Shipping
        public string ShippingAddress { get; set; }

        public string ShippingCity { get; set; }

        public string ShippingState { get; set; }

        public string ShippingPostalCode { get; set; }

        public string ShippingCountry { get; set; }

        public string ShippingPhone { get; set; }

        public string RecipientName { get; set; }

        public string TrackingNumber { get; set; }

        public string Carrier { get; set; }

        public DateTime? ShippedAt { get; set; }

        public DateTime? DeliveredAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }

    public enum OrderStatus
    {
        Pending,            // Order created
        PaymentPending,     // Awaiting payment
        Paid,              // Payment confirmed
        Processing,        // Being prepared
        Shipped,           // In transit
        Delivered,         // Completed
        Cancelled,         // Cancelled by buyer/seller
        Refunded,          // Refunded
        Disputed           // Under dispute
    }
}
