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
    public interface IMarketplaceService
    {
        Task<Product> CreateProductAsync(string sellerId, CreateProductInput input);
        Task<Order> CreateOrderAsync(string buyerId, CreateOrderInput input);
        Task<Order> UpdateOrderStatusAsync(int orderId, string userId, OrderStatus newStatus);
        Task<ShippingAdvice> CreateShippingAdviceAsync(int orderId, CreateShippingAdviceInput input);
        Task<IReadOnlyList<Product>> GetProductsAsync(ProductFilter filter);
        Task<IReadOnlyList<Order>> GetOrdersForUserAsync(string userId, OrderFilter filter);
    }

    public class MarketplaceService : IMarketplaceService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<MarketplaceService> _logger;

        public MarketplaceService(ApplicationDbContext db, ILogger<MarketplaceService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<Product> CreateProductAsync(string sellerId, CreateProductInput input)
        {
            var product = new Product
            {
                SellerId = sellerId,
                Name = input.Name,
                Description = input.Description,
                Price = input.Price,
                Currency = input.Currency ?? "USD",
                Stock = input.Stock,
                Category = input.Category,
                ImageUrls = input.ImageUrls,
                Weight = input.Weight,
                WeightUnit = input.WeightUnit ?? "kg",
                Dimensions = input.Dimensions,
                Status = ProductStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Products.Add(product);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Product {ProductId} created by seller {SellerId}", product.Id, sellerId);
            return product;
        }

        public async Task<Order> CreateOrderAsync(string buyerId, CreateOrderInput input)
        {
            var product = await _db.Products.FindAsync(input.ProductId);
            if (product == null)
            {
                throw new InvalidOperationException("Product not found");
            }

            if (product.Stock < input.Quantity)
            {
                throw new InvalidOperationException("Insufficient stock");
            }

            var orderNumber = GenerateOrderNumber();
            var totalAmount = product.Price * input.Quantity;

            var order = new Order
            {
                OrderNumber = orderNumber,
                BuyerId = buyerId,
                SellerId = product.SellerId,
                ProductId = product.Id,
                Quantity = input.Quantity,
                UnitPrice = product.Price,
                TotalAmount = totalAmount,
                Currency = product.Currency,
                Status = OrderStatus.Pending,
                ShippingAddress = input.ShippingAddress,
                ShippingCity = input.ShippingCity,
                ShippingState = input.ShippingState,
                ShippingPostalCode = input.ShippingPostalCode,
                ShippingCountry = input.ShippingCountry,
                ShippingPhone = input.ShippingPhone,
                RecipientName = input.RecipientName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Orders.Add(order);

            // Reserve stock
            product.Stock -= input.Quantity;
            product.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Order {OrderNumber} created by buyer {BuyerId}", orderNumber, buyerId);
            return order;
        }

        public async Task<Order> UpdateOrderStatusAsync(int orderId, string userId, OrderStatus newStatus)
        {
            var order = await _db.Orders.FindAsync(orderId);
            if (order == null)
            {
                throw new InvalidOperationException("Order not found");
            }

            // Verify user has permission
            if (order.BuyerId != userId && order.SellerId != userId)
            {
                throw new UnauthorizedAccessException("Not authorized to update this order");
            }

            order.Status = newStatus;
            order.UpdatedAt = DateTime.UtcNow;

            if (newStatus == OrderStatus.Paid)
            {
                order.PaidAt = DateTime.UtcNow;
            }
            else if (newStatus == OrderStatus.Shipped)
            {
                order.ShippedAt = DateTime.UtcNow;
            }
            else if (newStatus == OrderStatus.Delivered)
            {
                order.DeliveredAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            _logger.LogInformation("Order {OrderId} status updated to {Status}", orderId, newStatus);
            return order;
        }

        public async Task<ShippingAdvice> CreateShippingAdviceAsync(int orderId, CreateShippingAdviceInput input)
        {
            var order = await _db.Orders.FindAsync(orderId);
            if (order == null)
            {
                throw new InvalidOperationException("Order not found");
            }

            var advice = new ShippingAdvice
            {
                OrderId = orderId,
                Carrier = input.Carrier,
                TrackingNumber = input.TrackingNumber,
                EstimatedDelivery = input.EstimatedDelivery,
                ShippingMethod = input.ShippingMethod,
                ShippingCost = input.ShippingCost,
                Origin = input.Origin,
                Destination = input.Destination,
                Notes = input.Notes,
                InsurancePurchased = input.InsurancePurchased,
                InsuranceAmount = input.InsuranceAmount,
                SignatureRequired = input.SignatureRequired,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.ShippingAdvices.Add(advice);

            // Update order with tracking
            order.TrackingNumber = input.TrackingNumber;
            order.Carrier = input.Carrier;
            order.Status = OrderStatus.Shipped;
            order.ShippedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Shipping advice created for order {OrderId}", orderId);
            return advice;
        }

        public async Task<IReadOnlyList<Product>> GetProductsAsync(ProductFilter filter)
        {
            var query = _db.Products.AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.SellerId))
            {
                query = query.Where(p => p.SellerId == filter.SellerId);
            }

            if (!string.IsNullOrWhiteSpace(filter.Category))
            {
                query = query.Where(p => p.Category == filter.Category);
            }

            if (filter.Status.HasValue)
            {
                query = query.Where(p => p.Status == filter.Status.Value);
            }

            return await query
                .OrderByDescending(p => p.CreatedAt)
                .Take(filter.Limit > 0 ? filter.Limit : 50)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Order>> GetOrdersForUserAsync(string userId, OrderFilter filter)
        {
            var query = _db.Orders
                .Where(o => o.BuyerId == userId || o.SellerId == userId);

            if (filter.Status.HasValue)
            {
                query = query.Where(o => o.Status == filter.Status.Value);
            }

            return await query
                .OrderByDescending(o => o.CreatedAt)
                .Take(filter.Limit > 0 ? filter.Limit : 50)
                .ToListAsync();
        }

        private static string GenerateOrderNumber()
        {
            return $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";
        }
    }

    public class CreateProductInput
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; }
        public int Stock { get; set; }
        public string Category { get; set; }
        public string ImageUrls { get; set; }
        public decimal Weight { get; set; }
        public string WeightUnit { get; set; }
        public string Dimensions { get; set; }
    }

    public class CreateOrderInput
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public string ShippingAddress { get; set; }
        public string ShippingCity { get; set; }
        public string ShippingState { get; set; }
        public string ShippingPostalCode { get; set; }
        public string ShippingCountry { get; set; }
        public string ShippingPhone { get; set; }
        public string RecipientName { get; set; }
    }

    public class CreateShippingAdviceInput
    {
        public string Carrier { get; set; }
        public string TrackingNumber { get; set; }
        public string EstimatedDelivery { get; set; }
        public string ShippingMethod { get; set; }
        public decimal ShippingCost { get; set; }
        public string Origin { get; set; }
        public string Destination { get; set; }
        public string Notes { get; set; }
        public bool InsurancePurchased { get; set; }
        public decimal InsuranceAmount { get; set; }
        public bool SignatureRequired { get; set; }
    }

    public class ProductFilter
    {
        public string SellerId { get; set; }
        public string Category { get; set; }
        public ProductStatus? Status { get; set; }
        public int Limit { get; set; }
    }

    public class OrderFilter
    {
        public OrderStatus? Status { get; set; }
        public int Limit { get; set; }
    }
}
