// Spark2Scale_.Server/Controllers/AuthController.cs
using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using Supabase;
using Supabase.Gotrue; // Required for GotrueException
using System;
using System.Linq;
using System.Threading.Tasks;
// Necessary alias to resolve conflict between local User model and Supabase.Gotrue.User
using LocalUser = Spark2Scale_.Server.Models.User;

namespace Spark2Scale_.Server.Controllers
{
    // Make DTOs accessible (no using static required if DTOs are in Models namespace)
    using Spark2Scale_.Server.Models.AuthModels;
    using Supabase.Gotrue.Exceptions;

    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public AuthController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // POST /api/auth/signup
        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] SignUpRequest request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                return BadRequest("Email and password are required.");

            if (request.Role != "founder" && request.Role != "investor" && request.Role != "contributor")
                return BadRequest("Invalid user role.");

            try
            {
                var session = await _supabase.Auth.SignUp(request.Email, request.Password);

                if (session?.User == null)
                    return StatusCode(500, "User registration failed.");

                Guid newUserId = session.User.Id;

                await CreatePersonaProfile(newUserId, request);

                // FIX: Use .ToString() for Guid and ?? "" for nullable strings (CS0029/CS8604)
                return Ok(new AuthResponse(
                    session.AccessToken ?? string.Empty,
                    session.RefreshToken ?? string.Empty,
                    newUserId.ToString(),
                    request.Role
                ));
            }
            catch (GotrueException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Profile creation error: {ex.Message}");
            }
        }

        // POST /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> SignIn([FromBody] AuthRequest request)
        {
            try
            {
                var session = await _supabase.Auth.SignIn(request.Email, request.Password);

                if (session?.User == null)
                    return Unauthorized("Invalid credentials.");

                string role = await GetUserRole(session.User.Id);

                // FIX: Use .ToString() for Guid and ?? "" for nullable strings (CS0029/CS8604)
                return Ok(new AuthResponse(
                    session.AccessToken ?? string.Empty,
                    session.RefreshToken ?? string.Empty,
                    session.User.Id.ToString(),
                    role
                ));
            }
            catch (Exception)
            {
                return Unauthorized("Invalid credentials.");
            }
        }

        // POST /api/auth/forgot-password, POST /api/auth/reset-password (methods fine)
        // ... (methods omitted for brevity, but they are correct)

        // POST /api/auth/reset-password
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                // FIX: Corrected constant name (CS0117)
                await _supabase.Auth.Update(
                    Supabase.Gotrue.UserAttribute.Password,
                    request.NewPassword,
                    request.Token
                );

                return Ok("Password successfully reset.");
            }
            catch (GotrueException ex)
            {
                return BadRequest($"Reset failed: {ex.Message}");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error resetting password: {ex.Message}");
            }
        }

        // --- Helper Methods (CreatePersonaProfile and GetUserRole remain correct using LocalUser) ---
        private async Task CreatePersonaProfile(Guid userId, SignUpRequest request)
        {
            string[] names = request.Name.Split(' ', 2);
            string firstName = names.Length > 0 ? names[0] : request.Name;
            string lastName = names.Length > 1 ? names[1] : string.Empty;

            if (request.Role == "founder")
            {
                var founder = new Founder { user_id = userId };
                await _supabase.From<Founder>().Insert(founder);
            }
            else if (request.Role == "investor")
            {
                var investor = new Investor { user_id = userId, tags = Array.Empty<string>() };
                await _supabase.From<Investor>().Insert(investor);
            }
            else if (request.Role == "contributor")
            {
                var contributor = new Contributor { user_id = userId };
                await _supabase.From<Contributor>().Insert(contributor);
            }

            // Using the LocalUser alias to reference the local User model
            var userProfile = new LocalUser
            {
                uid = userId,
                fname = firstName,
                lname = lastName,
                email = request.Email,
                phone_number = request.Phone
            };
            await _supabase.From<LocalUser>().Insert(userProfile);
        }

        private async Task<string> GetUserRole(Guid userId)
        {
            if (await _supabase.From<Founder>().Where(f => f.user_id == userId).Single() != null) return "founder";
            if (await _supabase.From<Investor>().Where(i => i.user_id == userId).Single() != null) return "investor";
            if (await _supabase.From<Contributor>().Where(c => c.user_id == userId).Single() != null) return "contributor";

            return "user"; // Fallback role
        }
    }
}