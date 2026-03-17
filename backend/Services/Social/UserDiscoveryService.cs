using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Data;
using SmartInvest.Models.Entities;
using SmartInvest.Models.Entities.User;

namespace SmartInvest.Services.Social
{
    public interface IUserDiscoveryService
    {
        Task<IReadOnlyList<UserDiscoveryResult>> DiscoverAsync(string actorId, string query, int limit);
    }

    public class UserDiscoveryService : IUserDiscoveryService
    {
        private readonly ApplicationDbContext _db;

        public UserDiscoveryService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IReadOnlyList<UserDiscoveryResult>> DiscoverAsync(string actorId, string query, int limit)
        {
            var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == actorId);
            var actorProfile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == actorId);
            if (actor == null || actorProfile == null)
            {
                return Array.Empty<UserDiscoveryResult>();
            }

            var q = (query ?? string.Empty).Trim();
            var tokens = Tokenize(actorProfile.InvestmentGoals)
                .Concat(Tokenize(actorProfile.Skills))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var candidates = await _db.UserProfiles
                .Where(p => p.UserId != actorId && p.IsPublicProfile)
                .Take(500)
                .ToListAsync();

            var users = await _db.Users
                .Where(u => candidates.Select(c => c.UserId).Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            var results = new List<UserDiscoveryResult>();
            foreach (var profile in candidates)
            {
                if (!users.TryGetValue(profile.UserId, out var user))
                {
                    continue;
                }

                var score = ScoreMatch(actor, actorProfile, profile, user, tokens, q);
                if (score <= 0)
                {
                    continue;
                }

                results.Add(new UserDiscoveryResult
                {
                    UserId = profile.UserId,
                    DisplayName = BuildDisplayName(profile),
                    Headline = profile.Headline,
                    Location = BuildLocation(profile),
                    Score = score
                });
            }

            return results
                .OrderByDescending(r => r.Score)
                .ThenBy(r => r.DisplayName)
                .Take(Math.Clamp(limit, 1, 50))
                .ToList();
        }

        private static int ScoreMatch(ApplicationUser actor, UserProfile actorProfile, UserProfile candidate, ApplicationUser candidateUser, HashSet<string> actorTokens, string query)
        {
            var score = 0;

            if (!string.IsNullOrWhiteSpace(actorProfile.Country) && actorProfile.Country == candidate.Country)
                score += 12;
            if (!string.IsNullOrWhiteSpace(actorProfile.City) && actorProfile.City == candidate.City)
                score += 8;
            if (!string.IsNullOrWhiteSpace(actor.PreferredCurrency) && actor.PreferredCurrency == candidateUser.PreferredCurrency)
                score += 6;
            if (!string.IsNullOrWhiteSpace(actor.RiskTolerance) && actor.RiskTolerance == candidateUser.RiskTolerance)
                score += 6;
            if (!string.IsNullOrWhiteSpace(actorProfile.Occupation) && actorProfile.Occupation == candidate.Occupation)
                score += 5;
            if (!string.IsNullOrWhiteSpace(actorProfile.InvestmentExperience) && actorProfile.InvestmentExperience == candidate.InvestmentExperience)
                score += 4;

            var overlap = Tokenize(candidate.InvestmentGoals).Concat(Tokenize(candidate.Skills))
                .Count(t => actorTokens.Contains(t));
            if (overlap > 0)
            {
                score += Math.Min(12, overlap * 3);
            }

            if (!string.IsNullOrWhiteSpace(query))
            {
                if (ContainsIgnoreCase(candidate.FirstName, query) || ContainsIgnoreCase(candidate.LastName, query))
                {
                    score += 8;
                }
                if (ContainsIgnoreCase(candidate.Headline, query) || ContainsIgnoreCase(candidate.Occupation, query))
                {
                    score += 6;
                }
            }

            return score;
        }

        private static IEnumerable<string> Tokenize(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return Array.Empty<string>();

            return value
                .Split(new[] { ',', ';', '|', ' ' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(t => t.Trim())
                .Where(t => t.Length > 1);
        }

        private static bool ContainsIgnoreCase(string source, string value)
        {
            if (string.IsNullOrWhiteSpace(source) || string.IsNullOrWhiteSpace(value)) return false;
            return CultureInfo.InvariantCulture.CompareInfo.IndexOf(source, value, CompareOptions.IgnoreCase) >= 0;
        }

        private static string BuildDisplayName(UserProfile profile)
        {
            return string.Join(' ', new[] { profile.FirstName, profile.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
        }

        private static string BuildLocation(UserProfile profile)
        {
            return string.Join(", ", new[] { profile.City, profile.Country }.Where(s => !string.IsNullOrWhiteSpace(s)));
        }
    }

    public class UserDiscoveryResult
    {
        public string UserId { get; set; }
        public string DisplayName { get; set; }
        public string Headline { get; set; }
        public string Location { get; set; }
        public int Score { get; set; }
    }
}
