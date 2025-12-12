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
        /// <summary>
        /// Creates an auth user AND full profile in ONE step.
        /// Sends verification email automatically.
        /// </summary>
        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] FullSignUpRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password) ||
                request.Password != request.ConfirmPassword)
            {
                return BadRequest(new { message = "Invalid signup data." });
            }

            try
            {
                var email = request.Email.Trim().ToLower();

                // 1) Create auth.users entry
                var authResponse = await _supabase.Auth.SignUp(email, request.Password);

                if (authResponse?.User == null)
                {
                    return Ok(new
                    {
                        message = "Signup complete. Check your email to activate your account.",
                        requiresConfirmation = true
                    });
                }

                Guid uid = Guid.Parse(authResponse.User.Id);

                // 2) Insert profile into public.users
                var profile = new PublicUser
                {
                    uid = uid,
                    fname = request.FirstName,
                    lname = request.LastName,
                    email = email,
                    password_hash = HashPassword(request.Password),
                    phone_number = request.Phone,
                    address_region = request.AddressRegion,
                    avatar_url = "",
                    created_at = DateTime.UtcNow,
                    user_type = request.UserType?.ToLower() ?? "founder"
                };

                await _supabase.From<PublicUser>().Insert(profile);

                // 3) Insert role record
                switch (profile.user_type)
                {
                    case "founder":
                        await _supabase.From<Founder>().Insert(new Founder { user_id = uid });
                        break;

                    case "investor":
                        await _supabase.From<Investor>().Insert(new Investor
                        {
                            user_id = uid,
                            tags = request.Tags ?? Array.Empty<string>()
                        });
                        break;

                    case "contributor":
                        await _supabase.From<Contributor>().Insert(new Contributor { user_id = uid });
                        break;
                }

                return Ok(new
                {
                    message = "Signup complete. Check your email to verify your account.",
                    requiresConfirmation = true
                });
            }
            catch (GotrueException ex)
            {
                return BadRequest(new { message = $"Auth error: {ex.Message}" });
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
