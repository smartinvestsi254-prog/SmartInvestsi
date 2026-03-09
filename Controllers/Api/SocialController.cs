using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartInvest.Data;
using SmartInvest.Models.Entities;
using SmartInvest.Models.Entities.Social;
using SmartInvest.Services.Social;

namespace SmartInvest.Controllers.Api
{
    [ApiController]
    [Route("api/social")]
    public class SocialController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IUserDiscoveryService _discovery;
        private readonly IWebHostEnvironment _environment;
        private readonly UserManager<ApplicationUser> _userManager;

        public SocialController(ApplicationDbContext db, IUserDiscoveryService discovery, IWebHostEnvironment environment, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _discovery = discovery;
            _environment = environment;
            _userManager = userManager;
        }

        [Authorize]
        [HttpGet("discover")]
        public async Task<IActionResult> Discover([FromQuery] string query, [FromQuery] int limit = 20)
        {
            var actorId = GetActorId();
            if (actorId == null) return Unauthorized();

            var results = await _discovery.DiscoverAsync(actorId, query, limit);
            return Ok(new { results });
        }

        [Authorize]
        [HttpPost("connect")]
        public async Task<IActionResult> Connect([FromBody] ConnectionRequest input)
        {
            var actorId = GetActorId();
            if (actorId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(input.TargetUserId) || input.TargetUserId == actorId)
            {
                return BadRequest(new { error = "Invalid target user" });
            }

            var existing = await _db.UserConnections.FirstOrDefaultAsync(c =>
                (c.RequesterId == actorId && c.AddresseeId == input.TargetUserId) ||
                (c.RequesterId == input.TargetUserId && c.AddresseeId == actorId));

            if (existing != null)
            {
                return Ok(new { connection = existing, message = "Connection already exists" });
            }

            var connection = new UserConnection
            {
                RequesterId = actorId,
                AddresseeId = input.TargetUserId,
                Status = ConnectionStatus.Pending,
                Notes = input.Notes,
                CreatedAt = DateTime.UtcNow
            };

            _db.UserConnections.Add(connection);
            await _db.SaveChangesAsync();

            return Ok(new { connection });
        }

        [Authorize]
        [HttpPost("connections/{id:int}/respond")]
        public async Task<IActionResult> Respond(int id, [FromBody] ConnectionResponse input)
        {
            var actorId = GetActorId();
            if (actorId == null) return Unauthorized();

            var connection = await _db.UserConnections.FirstOrDefaultAsync(c => c.Id == id);
            if (connection == null) return NotFound();

            if (connection.AddresseeId != actorId)
            {
                return Forbid();
            }

            connection.Status = input.Action switch
            {
                "accept" => ConnectionStatus.Accepted,
                "reject" => ConnectionStatus.Rejected,
                "block" => ConnectionStatus.Blocked,
                _ => connection.Status
            };

            connection.RespondedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { connection });
        }

        [Authorize]
        [HttpGet("connections")]
        public async Task<IActionResult> Connections()
        {
            var actorId = GetActorId();
            if (actorId == null) return Unauthorized();

            var connections = await _db.UserConnections
                .Where(c => c.RequesterId == actorId || c.AddresseeId == actorId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return Ok(new { connections });
        }

        [Authorize]
        [HttpPost("posts")]
        [RequestSizeLimit(8_000_000)]
        public async Task<IActionResult> CreatePost([FromForm] CreatePostInput input)
        {
            var actorId = GetActorId();
            if (actorId == null) return Unauthorized();

            if (input.Image == null || input.Image.Length == 0)
            {
                return BadRequest(new { error = "Image is required" });
            }

            var uploadsRoot = Path.Combine(_environment.WebRootPath ?? "wwwroot", "uploads", "works", actorId);
            Directory.CreateDirectory(uploadsRoot);

            var fileName = $"{Guid.NewGuid():N}{Path.GetExtension(input.Image.FileName)}";
            var filePath = Path.Combine(uploadsRoot, fileName);
            await using (var stream = System.IO.File.Create(filePath))
            {
                await input.Image.CopyToAsync(stream);
            }

            var imageUrl = $"/uploads/works/{actorId}/{fileName}";

            var post = new WorkPost
            {
                UserId = actorId,
                Title = input.Title?.Trim() ?? "Untitled Work",
                Description = input.Description?.Trim(),
                ImageUrl = imageUrl,
                Visibility = input.Visibility == "connections" ? WorkPostVisibility.ConnectionsOnly : WorkPostVisibility.Public,
                CreatedAt = DateTime.UtcNow
            };

            _db.WorkPosts.Add(post);
            await _db.SaveChangesAsync();

            return Ok(new { post });
        }

        [HttpGet("feed")]
        public async Task<IActionResult> Feed([FromQuery] int limit = 20)
        {
            var posts = await _db.WorkPosts
                .Where(p => p.Visibility == WorkPostVisibility.Public)
                .OrderByDescending(p => p.CreatedAt)
                .Take(Math.Clamp(limit, 1, 50))
                .ToListAsync();

            return Ok(new { posts });
        }

        [HttpGet("users/{userId}/posts")]
        public async Task<IActionResult> UserPosts(string userId)
        {
            var posts = await _db.WorkPosts
                .Where(p => p.UserId == userId && p.Visibility == WorkPostVisibility.Public)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(new { posts });
        }

        private string? GetActorId()
        {
            if (User?.Identity?.IsAuthenticated == true)
            {
                return _userManager.GetUserId(User);
            }

            if (Request.Headers.TryGetValue("x-user-id", out var headerValue))
            {
                var value = headerValue.ToString();
                return string.IsNullOrWhiteSpace(value) ? null : value;
            }

            return null;
        }
    }

    public class ConnectionRequest
    {
        public string TargetUserId { get; set; }
        public string Notes { get; set; }
    }

    public class ConnectionResponse
    {
        public string Action { get; set; }
    }

    public class CreatePostInput
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string Visibility { get; set; }
        public Microsoft.AspNetCore.Http.IFormFile Image { get; set; }
    }
}
