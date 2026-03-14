using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.User
{
    public class UserProfile
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string UserId { get; set; }
        
        // Personal Information
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; }
        
        [Required]
        [StringLength(100)]
        public string LastName { get; set; }
        
        public DateTime? DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string Nationality { get; set; }
        
        // Contact
        [Phone]
        public string PhoneNumber { get; set; }
        public string AlternativeEmail { get; set; }

        // Public profile
        public string Headline { get; set; }
        public string Bio { get; set; }
        public string Skills { get; set; }
        public bool IsPublicProfile { get; set; }
        
        // Address
        public string Address { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string PostalCode { get; set; }
        public string Country { get; set; }
        
        // Financial Profile
        public decimal AnnualIncome { get; set; }
        public decimal NetWorth { get; set; }
        public string EmploymentStatus { get; set; }
        public string Occupation { get; set; }
        
        // Investment Profile
        public string InvestmentExperience { get; set; } // Beginner, Intermediate, Advanced
        public string InvestmentGoals { get; set; }
        public int InvestmentHorizon { get; set; } // Years
        public decimal MonthlyInvestmentBudget { get; set; }
        
        // Documents
        public string ProfilePicture { get; set; }
        public string IdentityDocument { get; set; }
        public string ProofOfAddress { get; set; }
        public string TaxDocument { get; set; }
        
        // Subscription
        public string SubscriptionTier { get; set; } // Free, Premium, Enterprise
        public DateTime? SubscriptionStartDate { get; set; }
        public DateTime? SubscriptionEndDate { get; set; }
        
        // Settings
        public string PreferredLanguage { get; set; }
        public string PreferredCurrency { get; set; }
        public bool TwoFactorEnabled { get; set; }
        public bool EmailNotifications { get; set; }
        public bool SMSNotifications { get; set; }
        public bool PushNotifications { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
