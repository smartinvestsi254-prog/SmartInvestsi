using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Data;
using SmartInvest.Models.Entities;
using SmartInvest.Models.Entities.Admin;

namespace SmartInvest.Services.Authorization
{
    public interface IAdminAuthorizationService
    {
        Task<bool> IsAdminAsync(string userId);
        Task<bool> IsExecutiveAsync(string userId);
        Task<ExecutiveAccess> GrantExecutiveAccessAsync(string adminId, string targetUserId, GrantExecutiveInput input);
        Task<bool> RevokeExecutiveAccessAsync(string adminId, string targetUserId);
    }

    public class AdminAuthorizationService : IAdminAuthorizationService
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private const string ADMIN_EMAIL = "smartinvestsi254@gmail.com";

        public AdminAuthorizationService(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        public async Task<bool> IsAdminAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;

            // Only the designated admin email has admin access
            return string.Equals(user.Email, ADMIN_EMAIL, StringComparison.OrdinalIgnoreCase);
        }

        public async Task<bool> IsExecutiveAsync(string userId)
        {
            // Check if user is admin
            if (await IsAdminAsync(userId)) return true;

            // Check if user has active executive access
            var access = await _db.ExecutiveAccesses
                .FirstOrDefaultAsync(e => e.UserId == userId && e.IsActive);

            return access != null;
        }

        public async Task<ExecutiveAccess> GrantExecutiveAccessAsync(string adminId, string targetUserId, GrantExecutiveInput input)
        {
            if (!await IsAdminAsync(adminId))
            {
                throw new UnauthorizedAccessException("Only admin can grant executive access");
            }

            // Revoke any existing access first
            var existing = await _db.ExecutiveAccesses
                .Where(e => e.UserId == targetUserId && e.IsActive)
                .ToListAsync();

            foreach (var e in existing)
            {
                e.IsActive = false;
                e.RevokedAt = DateTime.UtcNow;
                e.RevokedBy = adminId;
            }

            // Grant new access
            var access = new ExecutiveAccess
            {
                UserId = targetUserId,
                GrantedByAdminId = adminId,
                AccessLevel = input.AccessLevel ?? "Executive",
                Permissions = input.Permissions ?? "ViewDashboard,ViewReports",
                Reason = input.Reason,
                GrantedAt = DateTime.UtcNow,
                IsActive = true
            };

            _db.ExecutiveAccesses.Add(access);

            // Update user record
            var user = await _userManager.FindByIdAsync(targetUserId);
            if (user != null)
            {
                user.IsExecutive = true;
                await _userManager.UpdateAsync(user);
            }

            await _db.SaveChangesAsync();
            return access;
        }

        public async Task<bool> RevokeExecutiveAccessAsync(string adminId, string targetUserId)
        {
            if (!await IsAdminAsync(adminId))
            {
                throw new UnauthorizedAccessException("Only admin can revoke executive access");
            }

            var accesses = await _db.ExecutiveAccesses
                .Where(e => e.UserId == targetUserId && e.IsActive)
                .ToListAsync();

            foreach (var access in accesses)
            {
                access.IsActive = false;
                access.RevokedAt = DateTime.UtcNow;
                access.RevokedBy = adminId;
            }

            // Update user record
            var user = await _userManager.FindByIdAsync(targetUserId);
            if (user != null)
            {
                user.IsExecutive = false;
                await _userManager.UpdateAsync(user);
            }

            await _db.SaveChangesAsync();
            return true;
        }
    }

    public class GrantExecutiveInput
    {
        public string AccessLevel { get; set; }
        public string Permissions { get; set; }
        public string Reason { get; set; }
    }
}
