using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Investment
{
    public class Portfolio
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string UserId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; }
        
        public string Description { get; set; }
        
        public DateTime CreatedDate { get; set; }
        public DateTime LastUpdated { get; set; }
        
        public decimal TotalValue { get; set; }
        public decimal InitialInvestment { get; set; }
        public decimal CurrentReturn { get; set; }
        public decimal ReturnPercentage { get; set; }
        
        // Risk Metrics
        public string RiskProfile { get; set; } // Conservative, Moderate, Aggressive
        public decimal VolatilityScore { get; set; }
        public decimal SharpeRatio { get; set; }
        
        // Diversification
        public decimal DiversificationScore { get; set; }
        
        public virtual ICollection<PortfolioAsset> Assets { get; set; }
        public virtual ICollection<Transaction> Transactions { get; set; }
    }

    public class PortfolioAsset
    {
        [Key]
        public int Id { get; set; }
        
        public int PortfolioId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; }
        
        [Required]
        public string AssetClass { get; set; } // Stocks, Bonds, Crypto, Real Estate, Commodities
        
        public string Ticker { get; set; }
        
        public decimal Quantity { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal CurrentPrice { get; set; }
        public decimal TotalValue { get; set; }
        
        public decimal Allocation { get; set; } // Percentage of portfolio
        
        public DateTime PurchaseDate { get; set; }
        
        public virtual Portfolio Portfolio { get; set; }
    }

    public class Transaction
    {
        [Key]
        public int Id { get; set; }
        
        public string UserId { get; set; }
        public int? PortfolioId { get; set; }
        
        [Required]
        public string Type { get; set; } // Buy, Sell, Deposit, Withdrawal, Dividend
        
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        
        public string AssetName { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? PricePerUnit { get; set; }
        
        public DateTime Date { get; set; }
        public string Status { get; set; } // Pending, Completed, Failed
        
        public string Description { get; set; }
        
        // Compliance
        public bool ComplianceChecked { get; set; }
        public string ComplianceStatus { get; set; }
        
        public virtual Portfolio Portfolio { get; set; }
    }
}
