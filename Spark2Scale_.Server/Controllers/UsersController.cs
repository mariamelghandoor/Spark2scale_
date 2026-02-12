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
        private readonly IWebHostEnvironment _environment; // 1. Added Environment for path access

        // Inject IWebHostEnvironment here
        public UsersController(Client supabase, IWebHostEnvironment environment)
        {
            _supabase = supabase;
            _environment = environment;
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

                // 2. Handle Photo Upload (LOCALLY)
                if (request.Photo != null && request.Photo.Length > 0)
                {
                    try
                    {
                        // Validate Extension
                        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                        var extension = Path.GetExtension(request.Photo.FileName).ToLowerInvariant();
                        if (!allowedExtensions.Contains(extension))
                        {
                            return BadRequest("Invalid file type. Only JPG, PNG, and GIF allowed.");
                        }

                        // Prepare Folder: wwwroot/uploads
                        string uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads");
                        if (!Directory.Exists(uploadsFolder))
                        {
                            Directory.CreateDirectory(uploadsFolder);
                        }

                        // Create Unique Filename
                        string fileName = $"{uid}_{DateTime.Now.Ticks}{extension}";
                        string filePath = Path.Combine(uploadsFolder, fileName);

                        // Save File to Disk (Safe & Crash-Free)
                        using (var stream = new FileStream(filePath, FileMode.Create))
                        {
                            await request.Photo.CopyToAsync(stream);
                        }

                        // Generate Local URL
                        // NOTE: Ensure your Program.cs has app.UseStaticFiles()
                        var baseUrl = $"{Request.Scheme}://{Request.Host}";
                        currentAvatarUrl = $"{baseUrl}/uploads/{fileName}";
                    }
                    catch (Exception uploadEx)
                    {
                        Console.WriteLine($"[Upload Failed] {uploadEx.Message}");
                        return StatusCode(500, "Failed to save image locally.");
                    }
                }

                // 3. Update User Fields in Database
                currentUser.fname = !string.IsNullOrEmpty(request.Fname) ? request.Fname : currentUser.fname;
                currentUser.lname = !string.IsNullOrEmpty(request.Lname) ? request.Lname : currentUser.lname;

                if (!string.IsNullOrEmpty(request.PhoneNumber) && request.PhoneNumber != "string")
                    currentUser.phone_number = request.PhoneNumber;

                currentUser.address_region = !string.IsNullOrEmpty(request.AddressRegion) ? request.AddressRegion : currentUser.address_region;

                // Update the URL in the database
                currentUser.avatar_url = currentAvatarUrl;

                await _supabase.From<User>().Update(currentUser);

                return Ok(new { message = "Updated successfully", avatarUrl = currentAvatarUrl });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"CRITICAL ERROR: {ex}"); // Log to console
                return StatusCode(500, $"Server Error: {ex.Message}");
            }
        }

        // DELETE: api/users/delete-profile/{userId}
        [HttpDelete("delete-profile/{userId}")]
        public async Task<IActionResult> DeleteProfile(string userId)
        {
            if (!Guid.TryParse(userId, out Guid uid)) return BadRequest("Invalid User ID");

            try
            {
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

        // NEW: Get only the user's role
        [HttpGet("role/{id}")]
        public async Task<IActionResult> GetUserRole(Guid id)
        {
            string detectedRole = "guest"; // Default

            // 1. Check Founder Table
            var founderCheck = await _supabase.From<Founder>()
                .Where(f => f.user_id == id)
                .Get();

            if (founderCheck.Models.Any())
            {
                detectedRole = "founder";
            }
            else
            {
                // 2. Check Investor Table
                var investorCheck = await _supabase.From<Investor>()
                    .Where(i => i.user_id == id)
                    .Get();

                if (investorCheck.Models.Any())
                {
                    detectedRole = "investor";
                }
            }

            return Ok(new { role = detectedRole });
        }
    }
}