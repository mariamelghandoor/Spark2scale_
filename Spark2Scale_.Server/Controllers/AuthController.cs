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

            // Server-side password validation
            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
                return BadRequest(new { message = "Password must be at least 8 characters long." });

            var email = request.Email.Trim().ToLowerInvariant();

            try
            {
                // 1️⃣ Create Auth user
                var auth = await _supabase.Auth.SignUp(email, request.Password);

                // Email confirmation ON → auth.User may be null, but user is still created in auth.users
                // We need to get the user ID even if email confirmation is required
                string? authUserId = null;
                bool requiresEmailConfirmation = false;

                if (auth.User != null)
                {
                    // Email confirmation OFF - user is immediately available
                    authUserId = auth.User.Id;
                }
                else
                {
                    // Email confirmation ON - user exists but needs verification
                    // When email confirmation is required, auth.User is null
                    // We can't get the user ID until email is verified
                    // Profile will be created in verify-email callback
                    requiresEmailConfirmation = true;

                    // Return success - profile will be created after email verification
                    return Ok(new
                    {
                        message = "Signup successful. Please verify your email.",
                        requiresConfirmation = true
                    });
                }

                // If we have user ID, create profile immediately
                if (!string.IsNullOrEmpty(authUserId))
                {
                    var uid = Guid.Parse(authUserId);
                    var (fname, lname) = SplitName(request.Name);

                    // 2️⃣ Create profile (check if it already exists)
                    var existingProfile = await _supabase
                        .From<PublicUser>()
                        .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                        .Get();

                    // Check if profile exists or needs update
                    PublicUser? finalProfile = existingProfile;
                    string userType = request.UserType.ToLower();

                    bool needsProfileCreation = existingProfile == null || 
                                               (existingProfile != null && string.IsNullOrEmpty(existingProfile.fname));

                    if (needsProfileCreation)
                    {
                        if (existingProfile == null)
                        {
                            // Create new profile
                            var profile = new PublicUser
                            {
                                uid = uid,
                                fname = fname,
                                lname = lname,
                                email = email,
                                phone_number = request.Phone ?? "",
                                address_region = request.AddressRegion ?? "",
                                avatar_url = "",
                                created_at = DateTime.UtcNow,
                                user_type = request.UserType.ToLower()
                            };

                            try
                            {
                                var insertResult = await _supabase.From<PublicUser>().Insert(profile);
                                Console.WriteLine($"Profile created successfully for user {uid} with name: {fname} {lname}");
                                finalProfile = profile;
                            }
                            catch (PostgrestException ex)
                            {
                                // If insert fails, try to update existing profile using Upsert
                                Console.WriteLine($"Profile insert failed: {ex.Message}. Attempting upsert...");
                                try
                                {
                                    // Use Upsert which will update if exists, insert if not
                                    await _supabase.From<PublicUser>().Upsert(profile);
                                    Console.WriteLine($"Profile upserted successfully for user {uid}");
                                    finalProfile = profile;
                                }
                                catch (Exception updateEx)
                                {
                                    Console.WriteLine($"Profile upsert also failed: {updateEx.Message}");
                                    throw; // Re-throw if both insert and upsert fail
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Unexpected error creating profile: {ex.Message}");
                                throw; // Re-throw unexpected errors
                            }
                        }
                        else
                        {
                            // Profile exists but has NULL values - update it using Upsert
                            try
                            {
                                // Update existing profile with signup data
                                existingProfile.fname = fname;
                                existingProfile.lname = lname;
                                existingProfile.phone_number = request.Phone ?? "";
                                existingProfile.address_region = request.AddressRegion ?? "";
                                existingProfile.user_type = request.UserType.ToLower();

                                await _supabase.From<PublicUser>().Upsert(existingProfile);
                                Console.WriteLine($"Profile updated with signup data for user {uid}");
                                finalProfile = existingProfile;
                            }
                            catch (Exception updateEx)
                            {
                                Console.WriteLine($"Failed to update existing profile: {updateEx.Message}");
                                // Don't throw - profile exists, just missing some data
                                finalProfile = existingProfile;
                            }
                        }
                    }

                    // 3️⃣ Role table (check if it already exists)
                    if (finalProfile != null)
                    {
                        userType = finalProfile.user_type;

                        switch (userType)
                        {
                            case "founder":
                                var founderCheck = await _supabase
                                    .From<Founder>()
                                    .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                                    .Get();
                                if (founderCheck.Models.Count == 0)
                                {
                                    await _supabase.From<Founder>().Insert(new Founder { user_id = uid });
                                }
                                break;

                            case "investor":
                                var investorCheck = await _supabase
                                    .From<Investor>()
                                    .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                                    .Get();
                                if (investorCheck.Models.Count == 0)
                                {
                                    await _supabase.From<Investor>().Insert(new Investor
                                    {
                                        user_id = uid,
                                        tags = request.Tags
                                    });
                                }
                                break;

                            case "contributor":
                                var contributorCheck = await _supabase
                                    .From<Contributor>()
                                    .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                                    .Get();
                                if (contributorCheck.Models.Count == 0)
                                {
                                    await _supabase.From<Contributor>().Insert(new Contributor { user_id = uid });
                                }
                                break;
                        }
                    }

                    return Ok(new
                    {
                        message = requiresEmailConfirmation
                            ? "Account created. Please verify your email before signing in."
                            : "Account created successfully.",
                        requiresConfirmation = requiresEmailConfirmation
                    });
                }

                // Fallback: Profile will be created in verify-email callback
                return Ok(new
                {
                    message = "Signup successful. Please verify your email.",
                    requiresConfirmation = true
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
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
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
            try
            {
                // ResetPasswordForEmail only takes email parameter
                // Redirect URL should be configured in Supabase Dashboard > Authentication > URL Configuration
                await _supabase.Auth.ResetPasswordForEmail(
                    request.Email.Trim().ToLowerInvariant()
                );

                return Ok(new
                {
                    message = "If the email exists, a reset link has been sent."
                });
            }
            catch (Exception ex)
            {
                // Return generic message even on error to avoid email enumeration
                return Ok(new
                {
                    message = "If the email exists, a reset link has been sent."
                });
            }
        }

        // ===================== RESET PASSWORD =====================
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (request.NewPassword != request.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            // Server-side password validation
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
                return BadRequest(new { message = "Password must be at least 8 characters long." });

            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                return BadRequest(new { message = "Missing reset token." });
            }

            try
            {
                // Set session with access token and refresh token (if provided)
                var refreshToken = string.IsNullOrWhiteSpace(request.RefreshToken)
                    ? string.Empty
                    : request.RefreshToken.Trim();

                await _supabase.Auth.SetSession(request.AccessToken.Trim(), refreshToken, false);

                await _supabase.Auth.Update(new UserAttributes
                {
                    Password = request.NewPassword
                });

                return Ok(new
                {
                    message = "Password reset successful."
                });
            }
            catch (GotrueException ex)
            {
                return BadRequest(new { message = "Invalid or expired reset token. Please request a new password reset link." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while resetting your password. Please try again." });
            }
        }

        // ===================== VERIFY EMAIL CALLBACK =====================
        // Called after user clicks email verification link
        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                return BadRequest(new { message = "Missing verification token." });
            }

            try
            {
                // Set session from verification tokens
                var refreshToken = string.IsNullOrWhiteSpace(request.RefreshToken)
                    ? string.Empty
                    : request.RefreshToken.Trim();

                await _supabase.Auth.SetSession(request.AccessToken.Trim(), refreshToken, false);

                // Get the verified user
                var user = _supabase.Auth.CurrentUser;
                if (user == null)
                {
                    return BadRequest(new { message = "Unable to verify user." });
                }

                var uid = Guid.Parse(user.Id);

                // Check if profile already exists
                var profileResult = await _supabase
                    .From<PublicUser>()
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                    .Get();

                var existingProfile = profileResult.Models.FirstOrDefault();

                // If profile doesn't exist or has NULL values, create/update it
                // This happens when email confirmation was required during signup
                if (existingProfile == null || string.IsNullOrEmpty(existingProfile.fname))
                {
                    if (existingProfile == null)
                    {
                        // Create new profile with email (user can complete profile later)
                        var newProfile = new PublicUser
                        {
                            uid = uid,
                            fname = "",
                            lname = "",
                            email = user.Email ?? "",
                            phone_number = "",
                            address_region = "",
                            avatar_url = "",
                            created_at = DateTime.UtcNow,
                            user_type = "founder" // Default, user can update later
                        };

                        try
                        {
                            await _supabase.From<PublicUser>().Insert(newProfile);
                            existingProfile = newProfile;
                        }
                        catch (PostgrestException ex)
                        {
                            // Profile might have been created by another process
                            var retryProfile = await _supabase
                                .From<PublicUser>()
                                .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                                .Get();
                            existingProfile = retryProfile.Models.FirstOrDefault();
                        }
                    }

                    // Ensure default role exists
                    var founderCheck = await _supabase
                        .From<Founder>()
                        .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                        .Get();
                    if (founderCheck.Models.Count == 0)
                    {
                        // Check other roles too
                        var investorCheck = await _supabase
                            .From<Investor>()
                            .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                            .Get();
                        var contributorCheck = await _supabase
                            .From<Contributor>()
                            .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                            .Get();

                        if (investorCheck.Models.Count == 0 && contributorCheck.Models.Count == 0)
                        {
                            await _supabase.From<Founder>().Insert(new Founder { user_id = uid });
                        }
                    }
                }

                return Ok(new
                {
                    message = "Email verified successfully.",
                    token = request.AccessToken,
                    user = new
                    {
                        id = uid,
                        email = user.Email,
                        emailVerified = user.EmailConfirmedAt != null,
                        userType = existingProfile.user_type,
                        needsProfile = false
                    }
                });
            }
            catch (GotrueException ex)
            {
                return BadRequest(new { message = "Invalid or expired verification token." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during email verification." });
            }
        }
    }
}
