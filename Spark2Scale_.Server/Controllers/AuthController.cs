using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using Spark2Scale_.Server.Services;
using Supabase;
using Supabase.Gotrue;
using Supabase.Gotrue.Exceptions;
using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

// Alias so we can use our own User model without clashing
using PublicUser = Spark2Scale_.Server.Models.User;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly EmailService _emailService;

        public AuthController(Supabase.Client supabase, EmailService emailService)
        {
            _supabase = supabase;
            _emailService = emailService;
        }

        // ------------------------------------------------------
        // Simple SHA256 hashing for our own "password_hash" column
        // (we don't use it for real auth; Supabase Auth handles that)
        // ------------------------------------------------------
        private static string HashPassword(string password)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }

        // ============================================================
        // SIGN UP (AUTH ONLY)
        // ============================================================
        // 1) Creates user in Supabase Auth (auth.users)
        // 2) Supabase sends verification email (if configured)
        // 3) We DO NOT touch public.users here.
        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] SignUpRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password) ||
                request.Password != request.ConfirmPassword)
            {
                return BadRequest(new { message = "Invalid data or passwords do not match." });
            }

            try
            {
                var email = request.Email.Trim().ToLower();

                // Create auth user
                var authResponse = await _supabase.Auth.SignUp(email, request.Password);

                // Supabase handles email sending.
                // Even if authResponse.User is null (email confirmation required),
                // we can just instruct user to check email.
                return Ok(new
                {
                    message = "Signup successful. Please check your email to confirm your account before logging in.",
                    requiresConfirmation = true
                });
            }
            catch (GotrueException gex)
            {
                // e.g. "User already registered"
                return BadRequest(new { message = $"Auth error: {gex.Message}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Signup failed.", detail = ex.Message });
            }
        }

        // ============================================================
        // SIGN IN
        // ============================================================
        // 1) Sign in via Supabase Auth
        // 2) Try to load profile from public.users (may not exist yet)
        // 3) Return hasProfile flag
        [HttpPost("signin")]
        public async Task<IActionResult> SignIn([FromBody] SignInRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required." });
            }

            try
            {
                var email = request.Email.Trim().ToLower();

                var response = await _supabase.Auth.SignIn(email, request.Password);

                if (response?.User == null)
                {
                    return Unauthorized(new { message = "Invalid credentials or email not verified." });
                }

                Guid uid = Guid.Parse(response.User.Id);

                PublicUser profile = null;
                bool hasProfile = false;

                try
                {
                    var dbResult = await _supabase
                        .From<PublicUser>()
                        .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid)
                        .Get();

                    profile = dbResult.Models.FirstOrDefault();
                    hasProfile = profile != null;
                }
                catch (PostgrestException)
                {
                    // If RLS or something else fails, just treat as no profile
                    hasProfile = false;
                }

                return Ok(new
                {
                    token = response.AccessToken,
                    refreshToken = response.RefreshToken,
                    user = new
                    {
                        id = uid,
                        email = response.User.Email ?? email,
                        hasProfile,

                        // These will be null on first login (before complete-profile)
                        fname = profile?.fname,
                        lname = profile?.lname,
                        phone = profile?.phone_number,
                        addressRegion = profile?.address_region,
                        avatarUrl = profile?.avatar_url,
                        userType = profile?.user_type,
                        createdAt = profile?.created_at
                    }
                });
            }
            catch (GotrueException)
            {
                return Unauthorized(new { message = "Login failed. Check your email/password or verify your account." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Unexpected error during login.", detail = ex.Message });
            }
        }

        // ============================================================
        // COMPLETE PROFILE
        // ============================================================
        // Called AFTER login, when user fills profile form.
        // - Creates/updates public.users
        // - Inserts role record (founder/investor/contributor)
        [HttpPost("complete-profile")]
        public async Task<IActionResult> CompleteProfile([FromBody] CompleteProfileRequest request)
        {
            if (request == null || request.UserId == Guid.Empty)
            {
                return BadRequest(new { message = "Missing or invalid userId." });
            }

            if (string.IsNullOrWhiteSpace(request.UserType))
            {
                return BadRequest(new { message = "UserType is required." });
            }

            var userType = request.UserType.Trim().ToLowerInvariant();
            if (userType != "founder" && userType != "investor" && userType != "contributor")
            {
                return BadRequest(new { message = "Invalid userType. Must be 'founder', 'investor', or 'contributor'." });
            }

            try
            {
                var table = _supabase.From<PublicUser>();

                // Check if profile already exists
                var existingResult = await table
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, request.UserId)
                    .Get();

                var existing = existingResult.Models.FirstOrDefault();

                // Build user row
                var userRow = new PublicUser
                {
                    uid = request.UserId,
                    fname = request.FirstName?.Trim() ?? string.Empty,
                    lname = request.LastName?.Trim() ?? string.Empty,
                    email = existing?.email ?? string.Empty,  // we don't change email here
                    password_hash = existing?.password_hash ?? string.Empty, // not used
                    phone_number = request.Phone?.Trim() ?? string.Empty,
                    address_region = request.AddressRegion?.Trim() ?? string.Empty,
                    created_at = existing?.created_at ?? DateTime.UtcNow,
                    avatar_url = existing?.avatar_url ?? string.Empty,
                    user_type = userType
                };

                if (existing == null)
                {
                    // Insert new profile row
                    await table.Insert(userRow);
                }
                else
                {
                    // Update existing profile row
                    await table.Update(userRow);
                }

                // Role-specific record
                switch (userType)
                {
                    case "founder":
                        {
                            var founderRes = await _supabase
                                .From<Founder>()
                                .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, request.UserId)
                                .Get();

                            if (!founderRes.Models.Any())
                            {
                                await _supabase.From<Founder>().Insert(new Founder
                                {
                                    user_id = request.UserId
                                });
                            }

                            break;
                        }
                    case "investor":
                        {
                            var investorRes = await _supabase
                                .From<Investor>()
                                .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, request.UserId)
                                .Get();

                            if (!investorRes.Models.Any())
                            {
                                await _supabase.From<Investor>().Insert(new Investor
                                {
                                    user_id = request.UserId,
                                    tags = request.Tags ?? Array.Empty<string>()
                                });
                            }
                            else
                            {
                                var investor = investorRes.Models.First();
                                investor.tags = request.Tags ?? Array.Empty<string>();
                                await _supabase.From<Investor>().Update(investor);
                            }

                            break;
                        }
                    case "contributor":
                        {
                            var contribRes = await _supabase
                                .From<Contributor>()
                                .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, request.UserId)
                                .Get();

                            if (!contribRes.Models.Any())
                            {
                                await _supabase.From<Contributor>().Insert(new Contributor
                                {
                                    user_id = request.UserId
                                });
                            }

                            break;
                        }
                }

                return Ok(new
                {
                    message = "Profile saved successfully.",
                    userType = userType
                });
            }
            catch (PostgrestException pex)
            {
                return StatusCode(500, new { message = "Database error while saving profile.", detail = pex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to complete profile.", detail = ex.Message });
            }
        }

        // ============================================================
        // FORGOT PASSWORD
        // ============================================================
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { message = "Email is required." });
            }

            try
            {
                await _supabase.Auth.ResetPasswordForEmail(request.Email.Trim().ToLower());

                return Ok(new
                {
                    message = "If an account with that email exists, a reset link has been sent."
                });
            }
            catch
            {
                // For security, same message even on error
                return Ok(new
                {
                    message = "If an account with that email exists, a reset link has been sent."
                });
            }
        }

        // ============================================================
        // RESET PASSWORD
        // ============================================================
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.AccessToken))
            {
                return BadRequest(new { message = "Missing reset token." });
            }

            if (request.NewPassword != request.ConfirmPassword)
            {
                return BadRequest(new { message = "Passwords do not match." });
            }

            try
            {
                // Attach session from the token
                var session = await _supabase.Auth.SetSession(request.AccessToken, string.Empty);

                // Update password in auth.users
                await _supabase.Auth.Update(new UserAttributes
                {
                    Password = request.NewPassword
                });

                // Optional: email notification
                if (session.User?.Email != null)
                {
                    await _emailService.SendEmailAsync(
                        session.User.Email,
                        "Password changed successfully",
                        "<p>Your password has been updated.</p>");
                }

                return Ok(new { message = "Password reset successful." });
            }
            catch (GotrueException ex)
            {
                return BadRequest(new
                {
                    message = "Reset failed. The link may be invalid or expired.",
                    detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Reset failed.", detail = ex.Message });
            }
        }
    }
}
