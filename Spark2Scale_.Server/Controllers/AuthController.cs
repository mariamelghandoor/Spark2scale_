using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using Spark2Scale_.Server.Services;
using Supabase;
using Supabase.Gotrue;
using Supabase.Gotrue.Exceptions;
using Supabase.Postgrest.Exceptions;
using System;
using System.Linq;

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

        private static (string first, string last) SplitName(string full)
        {
            var parts = full.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return parts.Length switch
            {
                0 => ("", ""),
                1 => (parts[0], ""),
                _ => (parts[0], string.Join(" ", parts.Skip(1)))
            };
        }

        // ===================== SIGN UP =====================
        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] FullSignUpRequest request)
        {
            if (request.Password != request.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            var email = request.Email.Trim().ToLowerInvariant();

            try
            {
                // 1️⃣ Create Auth user
                var auth = await _supabase.Auth.SignUp(email, request.Password);

                // Email confirmation ON → auth.User may be null
                var authUserId = auth.User?.Id;

                if (authUserId == null)
                {
                    return Ok(new
                    {
                        message = "Signup successful. Please verify your email.",
                        requiresConfirmation = true
                    });
                }

                var uid = Guid.Parse(authUserId);
                var (fname, lname) = SplitName(request.Name);

                // 2️⃣ Create profile
                var profile = new PublicUser
                {
                    uid = uid,
                    fname = fname,
                    lname = lname,
                    email = email,
                    phone_number = request.Phone,
                    address_region = request.AddressRegion ?? "",
                    avatar_url = "",
                    created_at = DateTime.UtcNow,
                    user_type = request.UserType.ToLower()
                };

                await _supabase.From<PublicUser>().Insert(profile);

                // 3️⃣ Role table
                switch (profile.user_type)
                {
                    case "founder":
                        await _supabase.From<Founder>().Insert(new Founder { user_id = uid });
                        break;

                    case "investor":
                        await _supabase.From<Investor>().Insert(new Investor
                        {
                            user_id = uid,
                            tags = request.Tags
                        });
                        break;

                    case "contributor":
                        await _supabase.From<Contributor>().Insert(new Contributor { user_id = uid });
                        break;
                }

                return Ok(new
                {
                    message = "Account created successfully.",
                    requiresConfirmation = false
                });
            }
            catch (GotrueException ex)
            {
                if (ex.Message.Contains("already registered"))
                {
                    return BadRequest(new
                    {
                        message = "An account with this email already exists."
                    });
                }

                return BadRequest(new { message = ex.Message });
            }
            catch (PostgrestException ex)
            {
                // Check for unique constraint violation (duplicate email)
                if (ex.Message?.Contains("23505") == true || ex.Message?.Contains("duplicate") == true)
                {
                    return BadRequest(new
                    {
                        message = "An account with this email already exists."
                    });
                }

                throw;
            }
        }

        // ===================== SIGN IN =====================
        [HttpPost("signin")]
        public async Task<IActionResult> SignIn([FromBody] SignInRequest request)
        {
            try
            {
                var auth = await _supabase.Auth.SignIn(
                    request.Email.Trim().ToLower(),
                    request.Password
                );

                if (auth.User == null)
                {
                    return Unauthorized(new
                    {
                        message = "Invalid credentials or email not verified."
                    });
                }

                var uid = Guid.Parse(auth.User.Id);

                var profileResult = await _supabase
                    .From<PublicUser>()
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid)
                    .Get();

                var profile = profileResult.Models.FirstOrDefault();

                if (profile == null)
                {
                    return StatusCode(500, new
                    {
                        message = "Profile record missing for this account. Please contact support."
                    });
                }

                return Ok(new
                {
                    token = auth.AccessToken,
                    user = new
                    {
                        id = uid,
                        email = auth.User.Email,
                        userType = profile?.user_type,
                        hasProfile = profile != null
                    }
                });
            }
            catch (GotrueException ex)
            {
                var message = ex.Message ?? "Login failed. Check email and password.";

                if (message.Contains("confirm", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(403, new
                    {
                        message = "Email not verified. Please confirm your email before signing in."
                    });
                }

                return Unauthorized(new { message });
            }
            catch (Exception ex)
            {
                return Unauthorized(new
                {
                    message = "Login failed. Check email and password."
                });
            }
        }

        // ===================== FORGOT PASSWORD =====================
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var redirectTo = Environment.GetEnvironmentVariable("SUPABASE_RESET_REDIRECT")
                             ?? "http://localhost:3000/reset-password";

            await _supabase.Auth.ResetPasswordForEmail(
                request.Email.Trim().ToLower(),
                new AuthOptions { RedirectTo = redirectTo }
            );

            return Ok(new
            {
                message = "If the email exists, a reset link has been sent."
            });
        }

        // ===================== RESET PASSWORD =====================
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (request.NewPassword != request.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                return BadRequest(new { message = "Missing reset token." });
            }

            // Set session with access token (refresh token not required for password reset flow)
            // The access token from the reset link is sufficient
            await _supabase.Auth.SetSession(request.AccessToken.Trim(), string.Empty, false);

            await _supabase.Auth.Update(new UserAttributes
            {
                Password = request.NewPassword
            });

            return Ok(new
            {
                message = "Password reset successful."
            });
        }
    }
}
    