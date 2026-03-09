using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using SmartInvest.Models.Entities;
using SmartInvest.Models.Entities.Subscription;

namespace SmartInvest.Data.Seeders
{
    public static class SeedData
    {
        public static async Task Initialize(IServiceProvider serviceProvider)
        {
            var context = serviceProvider.GetRequiredService<ApplicationDbContext>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            // Ensure database is created
            await context.Database.EnsureCreatedAsync();

            // Seed Roles
            string[] roleNames = { "Admin", "SuperAdmin", "User", "Partner" };
            foreach (var roleName in roleNames)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole(roleName));
                }
            }

            // Seed Admin User
            var adminEmail = Environment.GetEnvironmentVariable("ADMIN_USER");
            var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASS");
            if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
            {
                if (await userManager.FindByEmailAsync(adminEmail) == null)
                {
                    var adminUser = new ApplicationUser
                    {
                        UserName = adminEmail,
                        Email = adminEmail,
                        EmailConfirmed = true,
                        ConsentGiven = true,
                        ConsentDate = DateTime.UtcNow,
                        DataProcessingConsent = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    var result = await userManager.CreateAsync(adminUser, adminPassword);
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(adminUser, "SuperAdmin");
                    }
                }
            }

            // Seed Subscription Plans
            if (!context.SubscriptionPlans.Any())
            {
                context.SubscriptionPlans.AddRange(
                    new SubscriptionPlan
                    {
                        Name = "Free",
                        Description = "Perfect for getting started with investing",
                        MonthlyPrice = 0,
                        AnnualPrice = 0,
                        MaxPortfolios = 1,
                        AdvancedAnalytics = false,
                        PrioritySupport = false,
                        APIAccess = false,
                        CustomReports = false,
                        TaxOptimization = false,
                        DedicatedAdvisor = false,
                        MaxTransactionsPerMonth = 10,
                        IsActive = true,
                        DisplayOrder = 1,
                        CreatedAt = DateTime.UtcNow
                    },
                    new SubscriptionPlan
                    {
                        Name = "Premium",
                        Description = "Advanced features for serious investors",
                        MonthlyPrice = 49.99m,
                        AnnualPrice = 499.99m,
                        MaxPortfolios = 5,
                        AdvancedAnalytics = true,
                        PrioritySupport = true,
                        APIAccess = true,
                        CustomReports = true,
                        TaxOptimization = true,
                        DedicatedAdvisor = false,
                        MaxTransactionsPerMonth = 100,
                        IsActive = true,
                        DisplayOrder = 2,
                        CreatedAt = DateTime.UtcNow
                    },
                    new SubscriptionPlan
                    {
                        Name = "Enterprise",
                        Description = "Complete solution for institutional investors",
                        MonthlyPrice = 199.99m,
                        AnnualPrice = 1999.99m,
                        MaxPortfolios = -1, // Unlimited
                        AdvancedAnalytics = true,
                        PrioritySupport = true,
                        APIAccess = true,
                        CustomReports = true,
                        TaxOptimization = true,
                        DedicatedAdvisor = true,
                        MaxTransactionsPerMonth = -1, // Unlimited
                        IsActive = true,
                        DisplayOrder = 3,
                        CreatedAt = DateTime.UtcNow
                    }
                );

                await context.SaveChangesAsync();
            }
        }
    }
}
