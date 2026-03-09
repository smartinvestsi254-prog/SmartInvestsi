using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Subscription
{
    public class SubscriptionPlan
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } // Free, Premium, Enterprise
        
        public string Description { get; set; }
        
        public decimal MonthlyPrice { get; set; }
        public decimal AnnualPrice { get; set; }
        
        // Features
        public int MaxPortfolios { get; set; }
        public bool AdvancedAnalytics { get; set; }
        public bool PrioritySupport { get; set; }
        public bool APIAccess { get; set; }
        public bool CustomReports { get; set; }
        public bool TaxOptimization { get; set; }
        public bool DedicatedAdvisor { get; set; }
        public int MaxTransactionsPerMonth { get; set; }
        
        public bool IsActive { get; set; }
        public int DisplayOrder { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        public virtual ICollection<UserSubscription> UserSubscriptions { get; set; }
    }

    public class UserSubscription
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string UserId { get; set; }
        
        public int SubscriptionPlanId { get; set; }
        
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        
        public string BillingCycle { get; set; } // Monthly, Annual
        public decimal Amount { get; set; }
        
        public string Status { get; set; } // Active, Cancelled, Expired, PendingPayment
        
        public bool AutoRenew { get; set; }
        
        public string PaymentMethod { get; set; }
        public string PaymentReference { get; set; }
        
        public DateTime? CancellationDate { get; set; }
        public string CancellationReason { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public virtual SubscriptionPlan SubscriptionPlan { get; set; }
    }

    public class Notification
    {
        [Key]
        public int Id { get; set; }
        
        public string UserId { get; set; }
        
        [Required]
        public string Title { get; set; }
        
        [Required]
        public string Message { get; set; }
        
        public string Type { get; set; } // Email, SMS, Push, InApp
        
        public bool IsRead { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
    }
}
