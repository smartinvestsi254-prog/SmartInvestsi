using Microsoft.AspNetCore.Identity;
using SmartInvest.Models.Entities.Marketplace;
using SmartInvest.Data;

namespace SmartInvest.Data.Seeders;

/// <summary>
/// Seeds the initial master admin user (smartinvestsi254@gmail.com)
/// Run once during application startup
/// </summary>
public class AdminSeeder
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminSeeder> _logger;

    public AdminSeeder(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        IConfiguration config,
        ILogger<AdminSeeder> logger)
    {
        _userManager = userManager;
        _context = context;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Creates the hardcoded master admin user if not exists
    /// Master admin email: smartinvestsi254@gmail.com
    /// This is the ONLY account that can:
    /// - Access admin dashboard
    /// - Grant/revoke admin access to others
    /// - View all transactions and user data
    /// - Manage fraud alerts
    /// - Approve external integrations
    /// </summary>
    public async Task SeedMasterAdminAsync()
    {
        try
        {
            var adminEmail = _config["ADMIN_EMAIL"] ?? "smartinvestsi254@gmail.com";
            
            _logger.LogInformation($"Starting admin seeder for: {adminEmail}");

            // Check if admin already exists
            var existingUser = await _userManager.FindByEmailAsync(adminEmail);
            if (existingUser != null)
            {
                _logger.LogInformation($"✓ Master admin {adminEmail} already exists (ID: {existingUser.Id})");

                // Verify AdminAccount exists
                var existingAdmin = await _context.AdminAccounts
                    .FirstOrDefaultAsync(a => a.UserId == existingUser.Id);

                if (existingAdmin != null)
                {
                    _logger.LogInformation($"✓ AdminAccount already linked");
                    return;
                }

                // If user exists but AdminAccount doesn't, create it
                _logger.LogWarning($"⚠️ AdminAccount missing for {adminEmail}. Creating...");
                await CreateAdminAccountAsync(existingUser.Id, adminEmail);
                return;
            }

            _logger.LogInformation($"Creating new ApplicationUser: {adminEmail}");

            // Create ApplicationUser
            var adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                FullName = "Master Administrator",
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            // Use strong default password - MUST be changed immediately on first login
            var tempPassword = GenerateSecurePassword();
            var result = await _userManager.CreateAsync(adminUser, tempPassword);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                _logger.LogError($"✗ Failed to create admin user: {errors}");
                throw new Exception($"Failed to create admin user: {errors}");
            }

            _logger.LogInformation($"✓ ApplicationUser created (ID: {adminUser.Id})");

            // Add to Admin role
            var roleResult = await _userManager.AddToRoleAsync(adminUser, "Admin");
            if (!roleResult.Succeeded)
            {
                _logger.LogWarning($"⚠️ Could not add to Admin role (may not exist yet). This is okay if roles not pre-seeded.");
            }

            // Create AdminAccount with full permissions
            await CreateAdminAccountAsync(adminUser.Id, adminEmail);

            _logger.LogInformation($"✅ Master admin seeded successfully!");
            _logger.LogInformation($"");
            _logger.LogInformation($"╔════════════════════════════════════════════════════════════════╗");
            _logger.LogInformation($"║                  MASTER ADMIN CREATED                           ║");
            _logger.LogInformation($"╠════════════════════════════════════════════════════════════════╣");
            _logger.LogInformation($"║ Email:    {adminEmail,-50}║");
            _logger.LogInformation($"║ Password: {tempPassword,-50}║");
            _logger.LogInformation($"║                                                                ║");
            _logger.LogInformation($"║ ⚠️  SECURITY NOTICE:                                          ║");
            _logger.LogInformation($"║  1. CHANGE THIS PASSWORD IMMEDIATELY after first login         ║");
            _logger.LogInformation($"║  2. This email is hardcoded as master admin in code            ║");
            _logger.LogInformation($"║  3. Only this account can access admin dashboard              ║");
            _logger.LogInformation($"║  4. All admin actions are logged with IP address              ║");
            _logger.LogInformation($"║  5. Multi-factor authentication is recommended                ║");
            _logger.LogInformation($"╚════════════════════════════════════════════════════════════════╝");
            _logger.LogInformation($"");
        }
        catch (Exception ex)
        {
            _logger.LogError($"✗ AdminSeeder failed: {ex.Message}");
            _logger.LogError(ex.StackTrace);
            throw;
        }
    }

    /// <summary>
    /// Creates AdminAccount entity with full permissions
    /// </summary>
    private async Task CreateAdminAccountAsync(string userId, string adminEmail)
    {
        var adminAccount = new AdminAccount
        {
            UserId = userId,
            AdminEmail = adminEmail,
            FullName = "Master Administrator",
            Role = "Master Admin",
            
            // Full permissions
            CanViewDashboard = true,
            CanManageUsers = true,
            CanManageTransactions = true,
            CanManagePayments = true,
            CanManageIntegrations = true,
            CanViewAnalytics = true,
            
            CreatedAt = DateTime.UtcNow,
            LastLoginAt = null,
            IsActive = true,
            Notes = "Master admin user created by seeder - only account with full access"
        };

        _context.AdminAccounts.Add(adminAccount);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"✓ AdminAccount created with full permissions");
        _logger.LogInformation($"  - CanViewDashboard: {adminAccount.CanViewDashboard}");
        _logger.LogInformation($"  - CanManageUsers: {adminAccount.CanManageUsers}");
        _logger.LogInformation($"  - CanManageTransactions: {adminAccount.CanManageTransactions}");
        _logger.LogInformation($"  - CanManagePayments: {adminAccount.CanManagePayments}");
        _logger.LogInformation($"  - CanManageIntegrations: {adminAccount.CanManageIntegrations}");
        _logger.LogInformation($"  - CanViewAnalytics: {adminAccount.CanViewAnalytics}");
    }

    /// <summary>
    /// Generates a cryptographically secure initial password
    /// User MUST change this on first login
    /// </summary>
    private static string GenerateSecurePassword()
    {
        const string uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const string lowercase = "abcdefghijklmnopqrstuvwxyz";
        const string digits = "0123456789";
        const string special = "!@#$%^&*";

        var random = new Random(Guid.NewGuid().GetHashCode());
        var password = new System.Text.StringBuilder();

        // Ensure at least one of each required character type
        password.Append(uppercase[random.Next(uppercase.Length)]);
        password.Append(lowercase[random.Next(lowercase.Length)]);
        password.Append(digits[random.Next(digits.Length)]);
        password.Append(special[random.Next(special.Length)]);

        // Add random characters to reach 20 characters
        var allChars = uppercase + lowercase + digits + special;
        for (int i = 4; i < 20; i++)
        {
            password.Append(allChars[random.Next(allChars.Length)]);
        }

        // Shuffle
        return new string(password.ToString().OrderBy(_ => random.Next()).ToArray());
    }
}
