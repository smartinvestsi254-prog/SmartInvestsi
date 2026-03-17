using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Marketplace
{
    public class Product
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string SellerId { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [StringLength(2000)]
        public string Description { get; set; }

        public decimal Price { get; set; }

        public string Currency { get; set; }

        public int Stock { get; set; }

        public string Category { get; set; }

        public string ImageUrls { get; set; }

        public decimal Weight { get; set; }

        public string WeightUnit { get; set; }

        public string Dimensions { get; set; }

        public ProductStatus Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }

    public enum ProductStatus
    {
        Draft,
        Active,
        OutOfStock,
        Suspended,
        Deleted
    }
}
