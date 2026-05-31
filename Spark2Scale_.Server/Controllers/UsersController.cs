// Spark2Scale_.Server/Controllers/UsersController.cs
using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using Supabase;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    public class ProfileUpdateRequest
    {
        public string? Fname { get; set; }
        public string? Lname { get; set; }
        public string? PhoneNumber { get; set; }
        public string? AddressRegion { get; set; }
        public IFormFile? Photo { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly Client _supabase;

        public UsersController(Client supabase)
        {
            _supabase = supabase;
        }

        // GET: api/users
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                var result = await _supabase.From<User>().Get();
                var users = result.Models.Select(u => new
                {
                    uid = u.uid,
                    fname = u.fname,
                    lname = u.lname,
                    email = u.email
                }).ToList();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching users: {ex.Message}");
            }
        }

        // GET: api/users/get-profile/{userId}
        [HttpGet("get-profile/{userId}")]
        public async Task<IActionResult> GetProfile(string userId)
        {
            if (!Guid.TryParse(userId, out Guid uid)) return BadRequest("Invalid User ID");

            try
            {
                var result = await _supabase.From<User>().Where(u => u.uid == uid).Get();
                var user = result.Models.FirstOrDefault();

                if (user == null) return NotFound("User not found");

                return Ok(new
                {
                    user = new
                    {
                        user.fname,
                        user.lname,
                        user.email,
                        user.phone_number,
                        user.address_region
                    },
                    // Return the clean URL stored in DB (no stale timestamp)
                    avatarUrl = user.avatar_url
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching profile: {ex.Message}");
            }
        }

        // PUT: api/users/update-profile/{userId}
        [HttpPut("update-profile/{userId}")]
        public async Task<IActionResult> UpdateProfile(string userId, [FromForm] ProfileUpdateRequest request)
        {
            if (!Guid.TryParse(userId, out Guid uid)) return BadRequest("Invalid User ID");

            try
            {
                // 1. Get Current User
                var result = await _supabase.From<User>().Where(u => u.uid == uid).Get();
                var currentUser = result.Models.FirstOrDefault();
                if (currentUser == null) return NotFound("User not found");

                string currentAvatarUrl = currentUser.avatar_url;

                // 2. Handle Photo Upload to Supabase Storage
                if (request.Photo != null && request.Photo.Length > 0)
                {
                    try
                    {
                        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                        var extension = Path.GetExtension(request.Photo.FileName).ToLowerInvariant();
                        if (!allowedExtensions.Contains(extension))
                            return BadRequest("Invalid file type. Only JPG, PNG, and GIF allowed.");

                        using var memoryStream = new MemoryStream();
                        await request.Photo.CopyToAsync(memoryStream);
                        var fileBytes = memoryStream.ToArray();

                        // Using userId as filename so upsert always overwrites the same file
                        string fileName = $"{uid}{extension}";

                        var storage = _supabase.Storage.From("avatars");
                        await storage.Upload(fileBytes, fileName, new Supabase.Storage.FileOptions { Upsert = true });

                        // FIX: Store CLEAN URL in DB — no timestamp pollution
                        currentAvatarUrl = storage.GetPublicUrl(fileName);
                    }
                    catch (Exception uploadEx)
                    {
                        Console.WriteLine($"[Upload Failed] {uploadEx.Message}");
                        return StatusCode(500, $"Failed to upload image to Supabase: {uploadEx.Message}");
                    }
                }

                // 3. Update User Fields in Database
                currentUser.fname = !string.IsNullOrEmpty(request.Fname) ? request.Fname : currentUser.fname;
                currentUser.lname = !string.IsNullOrEmpty(request.Lname) ? request.Lname : currentUser.lname;

                if (!string.IsNullOrEmpty(request.PhoneNumber) && request.PhoneNumber != "string")
                    currentUser.phone_number = request.PhoneNumber;

                currentUser.address_region = !string.IsNullOrEmpty(request.AddressRegion) ? request.AddressRegion : currentUser.address_region;

                // Save the clean URL to the database
                currentUser.avatar_url = currentAvatarUrl;

                await _supabase.From<User>().Update(currentUser);

                // FIX: Append cache-buster ONLY in the response, not in the DB
                // This forces the browser to reload the image immediately after update
                long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                string responseAvatarUrl = string.IsNullOrEmpty(currentAvatarUrl)
                    ? currentAvatarUrl
                    : $"{currentAvatarUrl}?t={timestamp}";

                return Ok(new { message = "Updated successfully", avatarUrl = responseAvatarUrl });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"CRITICAL ERROR: {ex}");
                return StatusCode(500, $"Server Error: {ex.Message}");
            }
        }

        private string GetToken()
        {
            var header = Request.Headers["Authorization"].FirstOrDefault();
            return header?.StartsWith("Bearer ") == true ? header.Substring(7) : "";
        }

        // DELETE: api/users/delete-profile/{userId}
        [HttpDelete("delete-profile/{userId}")]
        public async Task<IActionResult> DeleteProfile(string userId)
        {
            if (!Guid.TryParse(userId, out Guid uid)) return BadRequest("Invalid User ID");

            var token = GetToken();
            if (string.IsNullOrWhiteSpace(token))
            {
                return Unauthorized(new { message = "Authentication token is missing." });
            }

            try
            {
                var user = await _supabase.Auth.GetUser(token);
                if (user == null || string.IsNullOrEmpty(user.Id))
                {
                    return Unauthorized(new { message = "Invalid or expired session token." });
                }

                if (!Guid.TryParse(user.Id, out Guid authenticatedUid) || authenticatedUid != uid)
                {
                    return StatusCode(403, "Forbidden");
                }

                await _supabase.From<User>().Where(u => u.uid == uid).Delete();
                return Ok(new { message = "User deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error deleting user: {ex.Message}");
            }
        }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var result = await _supabase.From<User>()
                .Where(u => u.uid == id)
                .Single();

            if (result == null) return NotFound();

            return Ok(new
            {
                fname = result.fname,
                lname = result.lname
            });
        }

        // Get only the user's role
        [HttpGet("role/{id}")]
        public async Task<IActionResult> GetUserRole(Guid id)
        {
            string detectedRole = "guest";

            var founderCheck = await _supabase.From<Founder>()
                .Where(f => f.user_id == id)
                .Get();

            if (founderCheck.Models.Any())
            {
                detectedRole = "founder";
            }
            else
            {
                var investorCheck = await _supabase.From<Investor>()
                    .Where(i => i.user_id == id)
                    .Get();

                if (investorCheck.Models.Any())
                {
                    detectedRole = "investor";
                }
                else
                {
                    // 3. Check StartupContributor Table
                    var contributorCheck = await _supabase.From<StartupContributor>()
                        .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, id.ToString())
                        .Get();

                    if (contributorCheck.Models.Any())
                    {
                        detectedRole = "contributor";
                    }
                }
            }

            return Ok(new { role = detectedRole });
        }
    }
}