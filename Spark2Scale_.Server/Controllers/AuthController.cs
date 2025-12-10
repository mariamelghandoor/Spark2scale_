using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Spark2Scale_.Server.Models;
using Spark2Scale_.Server.Services;

// FIX AMBIGUOUS USER TYPE
using DbUser = Spark2Scale_.Server.Models.User;
using AuthUser = Supabase.Gotrue.User;

using Supabase;
using Supabase.Gotrue;
using Supabase.Gotrue.Exceptions;
using Supabase.Postgrest.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly EmailService _emailService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            Supabase.Client supabase,
            EmailService emailService,
            ILogger<AuthController> logger)
        {
            _supabase = supabase;
            _emailService = emailService;
            _logger = logger;
        }

        // ------------------- Helpers -------------------
        private bool IsValidEmail(string email) =>
            !string.IsNullOrWhiteSpace(email) &&
            Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$");

        private bool IsValidPhone(string phone) =>
            phone?.Where(char.IsDigit).Count() >= 10;

        private string HashPassword(string password)
        {
            using var sha = SHA256.Create();
            return Convert.ToBase64String(
                sha.ComputeHash(Encoding.UTF8.GetBytes(password))
            );
        }

        // ------------------- SIGN UP -------------------
        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] SignUpRequest req)
        {
            try
            {
                if (req == null ||
                    !IsValidEmail(req.Email) ||
                    string.IsNullOrWhiteSpace(req.Password))
                {
                    return BadRequest(new { message = "Invalid signup request." });
                }

                string email = req.Email.Trim().ToLower();

                // Check if email exists
                var exists = await _supabase.From<DbUser>().Where(x => x.email == email).Get();
                if (exists.Models.Any())
                    return Conflict(new { message = "Email already registered." });

                // Create Supabase Auth user
                var options = new SignUpOptions
                {
                    Data = new Dictionary<string, object>
                    {
                        { "user_type", req.UserType.ToLower() },
                        { "name", req.Name },
                        { "phone", req.Phone }
                    }
                };

                var auth = await _supabase.Auth.SignUp(email, req.Password, options);
                if (auth?.User == null)
                    return StatusCode(500, new { message = "Failed to create auth account." });

                Guid uid = Guid.Parse(auth.User.Id);

                // Insert into users table
                var names = req.Name.Split(" ", 2);

                await _supabase.From<DbUser>().Insert(new DbUser
                {
                    uid = uid,
                    email = email,
                    fname = names[0],
                    lname = names.Length > 1 ? names[1] : "",
                    password_hash = HashPassword(req.Password),
                    phone_number = req.Phone,
                    created_at = DateTime.UtcNow
                });

                // Insert role
                switch (req.UserType.ToLower())
                {
                    case "founder":
                        await _supabase.From<Founder>().Insert(new Founder { user_id = uid });
                        break;
                    case "investor":
                        await _supabase.From<Investor>().Insert(new Investor
                        {
                            user_id = uid,
                            tags = req.Tags ?? Array.Empty<string>()
                        });
                        break;
                    case "contributor":
                        await _supabase.From<Contributor>().Insert(new Contributor { user_id = uid });
                        break;
                }

                return Ok(new { message = "Signup successful! Please verify your email." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Signup failed");
                return StatusCode(500, new { message = "Signup failed.", detail = ex.Message });
            }
        }

        // ------------------- SIGN IN -------------------
        [HttpPost("signin")]
        public async Task<IActionResult> SignIn([FromBody] SignInRequest req)
        {
            try
            {
                if (req == null || !IsValidEmail(req.Email))
                    return BadRequest(new { message = "Invalid email or password." });

                var auth = await _supabase.Auth.SignIn(req.Email.Trim().ToLower(), req.Password);
                if (auth?.User == null)
                    return Unauthorized(new { message = "Invalid credentials." });

                if (auth.User.ConfirmedAt == null)
                    return Unauthorized(new { message = "Please confirm your email." });

                Guid uid = Guid.Parse(auth.User.Id);
                var db = await _supabase.From<DbUser>().Where(x => x.uid == uid).Single();

                return Ok(new
                {
                    token = auth.AccessToken,
                    user = new
                    {
                        id = uid,
                        email = db.email,
                        name = $"{db.fname} {db.lname}",
                        phone = db.phone_number,
                        userType = auth.User.UserMetadata["user_type"]
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Signin failed");
                return StatusCode(500, new { message = "Signin failed." });
            }
        }

        // ------------------- FORGOT PASSWORD -------------------
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
        {
            try
            {
                await _supabase.Auth.ResetPasswordForEmail(req.Email.Trim().ToLower());
                return Ok(new { message = "Password reset link sent." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Password reset email failed");
                return StatusCode(500, new { message = "Failed to send reset email." });
            }
        }

        // ------------------- RESET PASSWORD -------------------
        // Backend CANNOT reset Supabase passwords directly — frontend must call:
        // supabase.auth.updateUser({ password: newPassword })
        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest req)
        {
            if (req.NewPassword != req.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            return Ok(new
            {
                message = "Use Supabase client on the frontend to complete password reset.",
                instructions = "Call supabase.auth.updateUser({ password: newPassword }) after receiving the token."
            });
        }
    }
}
