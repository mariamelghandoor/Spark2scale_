using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using Spark2Scale_.Server.Services;
using Supabase;
using Supabase.Gotrue;
using Supabase.Gotrue.Exceptions;
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
        // ------------------------------------------------------
        private static string HashPassword(string password)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }

        // ============================================================
        // SIGN UP
        // ============================================================
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

            // Normalize and validate user type
            var userType = (request.UserType ?? "founder").Trim().ToLowerInvariant();
            if (userType != "founder" && userType != "investor" && userType != "contributor")
            {
                return BadRequest(new { message = $"Invalid userType '{request.UserType}'. Must be 'founder', 'investor', or 'contributor'." });
            }

            try
            {
                // 1) Create auth user in auth.users
                var authResponse = await _supabase.Auth.SignUp(
                    request.Email.Trim().ToLower(),
                    request.Password
                );

                if (authResponse?.User == null)
                {
                    // DO NOT insert public.users row yet.
                    return Ok(new
                    {
                        message = "Signup complete. Please verify your email before continuing.",
                        requiresConfirmation = true
                    });
                }

                // Supabase User.Id is a string (UUID)
                Guid uid = Guid.Parse(authResponse.User.Id);

                // 2) Insert into public.users
                var firstName = request.Name.Split(" ", StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "";
                var lastName = request.Name.Split(" ", StringSplitOptions.RemoveEmptyEntries).Skip(1).FirstOrDefault() ?? "";

                var newUser = new PublicUser
                {
                    uid = uid,
                    fname = firstName,
                    lname = lastName,
                    email = request.Email.Trim().ToLower(),
                    password_hash = HashPassword(request.Password),
                    phone_number = request.Phone ?? string.Empty,
                    address_region = "Unknown",
                    created_at = DateTime.UtcNow,
                    avatar_url = "",
                    user_type = userType         // IMPORTANT: never null
                };

                // This is where the previous error came from when user_type was null
                await _supabase.From<PublicUser>().Insert(newUser);

                // 3) Insert into role-specific table
                switch (userType)
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

                return Ok(new { message = "Signup complete. Please verify your email." });
            }
            catch (GotrueException gex)
            {
                // Errors from Supabase Auth (duplicate email, etc.)
                return BadRequest(new { message = $"Auth error: {gex.Message}" });
            }
            catch (PostgrestException pex)
            {
                // Errors from Postgrest (public.users / founders / investors / contributors)
                return StatusCode(500, new
                {
                    message = "Database error while creating user.",
                    detail = pex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Signup failed.",
                    detail = ex.Message
                });
            }
        }

        // ============================================================
        // SIGN IN
        // ============================================================
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
                var response = await _supabase.Auth.SignIn(
                    request.Email.Trim().ToLower(),
                    request.Password);

                if (response?.User == null)
                {
                    return Unauthorized(new { message = "Invalid credentials or email not verified." });
                }

                Guid uid = Guid.Parse(response.User.Id);

                var profile = await _supabase
                    .From<PublicUser>()
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid)
                    .Single();

                return Ok(new
                {
                    token = response.AccessToken,
                    refreshToken = response.RefreshToken,
                    user = new
                    {
                        id = profile.uid,
                        email = profile.email,
                        fname = profile.fname,
                        lname = profile.lname,
                        phone = profile.phone_number,
                        addressRegion = profile.address_region,
                        avatarUrl = profile.avatar_url,
                        userType = profile.user_type,
                        createdAt = profile.created_at
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
