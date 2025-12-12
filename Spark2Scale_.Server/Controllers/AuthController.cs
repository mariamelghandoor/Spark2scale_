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

                    // 2️⃣ Store signup data temporarily for use after email verification
                    // Profile will be created in verify-email callback, not here
                    var tempSignupData = new TempSignupData
                    {
                        email = email,
                        name = request.Name,
                        phone = request.Phone ?? "",
                        address_region = request.AddressRegion ?? "",
                        user_type = request.UserType.ToLower(),
                        tags = request.Tags ?? Array.Empty<string>(),
                        created_at = DateTime.UtcNow,
                        expires_at = DateTime.UtcNow.AddHours(24) // Expire after 24 hours
                    };

                    try
                    {
                        // Upsert to handle case where user tries to sign up again
                        await _supabase.From<TempSignupData>().Upsert(tempSignupData);
                        Console.WriteLine($"Temporary signup data stored for {email}: name={tempSignupData.name}, phone={tempSignupData.phone}, region={tempSignupData.address_region}, type={tempSignupData.user_type}");
                    }
                    catch (PostgrestException ex)
                    {
                        // Check if table doesn't exist
                        var errorMessage = ex.Message ?? "";
                        if (errorMessage.Contains("PGRST205") || 
                            errorMessage.Contains("Could not find the table") ||
                            (errorMessage.Contains("temp_signup_data") && errorMessage.Contains("not found")))
                        {
                            Console.WriteLine($"ERROR: temp_signup_data table does not exist! Please run the SQL migration CREATE_TEMP_SIGNUP_DATA_TABLE.sql in Supabase Dashboard.");
                            Console.WriteLine($"Signup data will be lost: name={tempSignupData.name}, phone={tempSignupData.phone}, region={tempSignupData.address_region}, type={tempSignupData.user_type}");
                            // Continue anyway - user can still verify email, but profile will have default values
                        }
                        else
                        {
                            Console.WriteLine($"Failed to store temporary signup data: {errorMessage}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to store temporary signup data: {ex.Message}");
                        // Continue anyway - we can still create profile with minimal data
                    }

                    // Return success - profile will be created after email verification
                    return Ok(new
                    {
                        message = "Signup successful. Please check your email to verify your account.",
                        requiresConfirmation = true
                    });
                }

                // If we have user ID, create profile immediately
                if (!string.IsNullOrEmpty(authUserId))
                {
                    var uid = Guid.Parse(authUserId);
                    var (fname, lname) = SplitName(request.Name);

                    // 2️⃣ Create profile (check if it already exists)
                    var existingProfileResult = await _supabase
                        .From<PublicUser>()
                        .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                        .Get();

                    var existingProfile = existingProfileResult.Models.FirstOrDefault();

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
                var userEmail = user.Email ?? "";

                // Check if profile already exists
                var profileResult = await _supabase
                    .From<PublicUser>()
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                    .Get();

                var existingProfile = profileResult.Models.FirstOrDefault();

                // Retrieve temporary signup data BEFORE creating profile (we'll need it for role creation)
                TempSignupData? tempData = null;
                try
                {
                    var tempDataResult = await _supabase
                        .From<TempSignupData>()
                        .Filter("email", Supabase.Postgrest.Constants.Operator.Equals, userEmail)
                        .Get();

                    tempData = tempDataResult.Models.FirstOrDefault();
                }
                catch (PostgrestException ex)
                {
                    // Handle case where table doesn't exist (PGRST205 error)
                    var errorMessage = ex.Message ?? "";
                    if (errorMessage.Contains("PGRST205") ||
                        errorMessage.Contains("Could not find the table") ||
                        (errorMessage.Contains("temp_signup_data") && errorMessage.Contains("not found")))
                    {
                        Console.WriteLine($"Warning: temp_signup_data table not found. Proceeding with default values. Error: {errorMessage}");
                    }
                    else
                    {
                        Console.WriteLine($"Warning: Failed to retrieve temp signup data: {errorMessage}. Proceeding with default values.");
                    }
                }
                catch (Exception ex)
                {
                    var errorMessage = ex.Message ?? "";
                    if (errorMessage.Contains("temp_signup_data") ||
                        errorMessage.Contains("PGRST205") ||
                        errorMessage.Contains("Could not find the table"))
                    {
                        Console.WriteLine($"Warning: temp_signup_data table not found. Proceeding with default values. Error: {errorMessage}");
                    }
                    else
                    {
                        Console.WriteLine($"Warning: Failed to retrieve temp signup data: {errorMessage}. Proceeding with default values.");
                    }
                }

                // Track if we need to update an existing incomplete profile
                bool needsProfileUpdate = existingProfile != null && 
                    (string.IsNullOrWhiteSpace(existingProfile.fname) || 
                     string.IsNullOrWhiteSpace(existingProfile.lname) || 
                     string.IsNullOrWhiteSpace(existingProfile.phone_number) || 
                     string.IsNullOrWhiteSpace(existingProfile.address_region) || 
                     string.IsNullOrWhiteSpace(existingProfile.user_type));

                // If profile doesn't exist OR has incomplete data, create/update it using signup data
                if (existingProfile == null || needsProfileUpdate)
                {
                    // Split name into first and last
                    var (fname, lname) = tempData != null
                        ? SplitName(tempData.name)
                        : existingProfile != null && !string.IsNullOrWhiteSpace(existingProfile.fname) && !string.IsNullOrWhiteSpace(existingProfile.lname)
                            ? (existingProfile.fname, existingProfile.lname)
                            : ("", "");

                    // Prepare profile data - use temp data if available, otherwise keep existing values
                    var profileData = new PublicUser
                    {
                        uid = uid,
                        fname = !string.IsNullOrWhiteSpace(fname) ? fname : (existingProfile?.fname ?? ""),
                        lname = !string.IsNullOrWhiteSpace(lname) ? lname : (existingProfile?.lname ?? ""),
                        email = userEmail,
                        phone_number = !string.IsNullOrWhiteSpace(tempData?.phone) ? tempData.phone : (existingProfile?.phone_number ?? ""),
                        address_region = !string.IsNullOrWhiteSpace(tempData?.address_region) ? tempData.address_region : (existingProfile?.address_region ?? ""),
                        avatar_url = existingProfile?.avatar_url ?? "",
                        created_at = existingProfile?.created_at ?? DateTime.UtcNow,
                        user_type = !string.IsNullOrWhiteSpace(tempData?.user_type) ? tempData.user_type : (existingProfile?.user_type ?? "founder")
                    };

                    if (existingProfile == null)
                    {
                        // Create new profile
                        var newProfile = profileData;

                        try
                        {
                            await _supabase.From<PublicUser>().Insert(newProfile);
                            existingProfile = newProfile;
                            Console.WriteLine($"Profile created for user {uid} after email verification with data: fname={newProfile.fname}, lname={newProfile.lname}, phone={newProfile.phone_number}, region={newProfile.address_region}, type={newProfile.user_type}");
                        }
                        catch (PostgrestException ex)
                        {
                            // Handle duplicate key error (23505) - profile might have been created by another request
                            if (ex.Message?.Contains("23505") == true || ex.Message?.Contains("duplicate key") == true)
                            {
                                Console.WriteLine($"Profile already exists for user {uid} (duplicate key - fetching existing profile)");
                            }
                            else
                            {
                                Console.WriteLine($"Profile insert failed: {ex.Message}");
                            }
                            
                            // Try to get existing profile
                            try
                            {
                                var retryProfile = await _supabase
                                    .From<PublicUser>()
                                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                                    .Get();
                                existingProfile = retryProfile.Models.FirstOrDefault();
                            }
                            catch (Exception retryEx)
                            {
                                Console.WriteLine($"Failed to retry profile fetch: {retryEx.Message}");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Unexpected error creating profile: {ex.Message}");
                            // Try one more time to get existing profile
                            try
                            {
                                var retryProfile = await _supabase
                                    .From<PublicUser>()
                                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                                    .Get();
                                existingProfile = retryProfile.Models.FirstOrDefault();
                            }
                            catch
                            {
                                // If we still can't get the profile, continue with null
                            }
                        }
                    }
                    else if (needsProfileUpdate)
                    {
                        // Update existing incomplete profile
                        try
                        {
                            var updateData = new PublicUser
                            {
                                uid = uid,
                                fname = !string.IsNullOrWhiteSpace(profileData.fname) ? profileData.fname : existingProfile.fname,
                                lname = !string.IsNullOrWhiteSpace(profileData.lname) ? profileData.lname : existingProfile.lname,
                                phone_number = !string.IsNullOrWhiteSpace(profileData.phone_number) ? profileData.phone_number : existingProfile.phone_number,
                                address_region = !string.IsNullOrWhiteSpace(profileData.address_region) ? profileData.address_region : existingProfile.address_region,
                                user_type = !string.IsNullOrWhiteSpace(profileData.user_type) ? profileData.user_type : existingProfile.user_type,
                                email = existingProfile.email,
                                avatar_url = existingProfile.avatar_url ?? "",
                                created_at = existingProfile.created_at
                            };

                            await _supabase.From<PublicUser>()
                                .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                                .Update(updateData);

                            // Refresh the profile
                            var updatedProfileResult = await _supabase
                                .From<PublicUser>()
                                .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                                .Get();
                            existingProfile = updatedProfileResult.Models.FirstOrDefault();
                            
                            Console.WriteLine($"Profile updated for user {uid} with missing data: fname={updateData.fname}, lname={updateData.lname}, phone={updateData.phone_number}, region={updateData.address_region}, type={updateData.user_type}");
                        }
                        catch (Exception updateEx)
                        {
                            Console.WriteLine($"Warning: Failed to update incomplete profile: {updateEx.Message}");
                        }
                    }
                }

                // Create role-specific entry based on user type (use tempData for tags if available)
                var userType = existingProfile?.user_type ?? tempData?.user_type ?? "founder";
                switch (userType.ToLower())
                {
                    case "founder":
                        var founderCheck = await _supabase
                            .From<Founder>()
                            .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                            .Get();
                        if (founderCheck.Models.Count == 0)
                        {
                            try
                            {
                                await _supabase.From<Founder>().Insert(new Founder { user_id = uid });
                                Console.WriteLine($"Founder role created for user {uid}");
                            }
                            catch (PostgrestException ex)
                            {
                                if (ex.Message?.Contains("23505") == true || ex.Message?.Contains("duplicate key") == true)
                                {
                                    Console.WriteLine($"Founder role already exists for user {uid} (duplicate key ignored)");
                                }
                                else
                                {
                                    Console.WriteLine($"Warning: Failed to create founder role: {ex.Message}");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Warning: Failed to create founder role: {ex.Message}");
                            }
                        }
                        break;

                    case "investor":
                        var investorCheck = await _supabase
                            .From<Investor>()
                            .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                            .Get();
                        if (investorCheck.Models.Count == 0)
                        {
                            try
                            {
                                await _supabase.From<Investor>().Insert(new Investor
                                {
                                    user_id = uid,
                                    tags = tempData?.tags ?? Array.Empty<string>()
                                });
                                Console.WriteLine($"Investor role created for user {uid} with tags");
                            }
                            catch (PostgrestException ex)
                            {
                                if (ex.Message?.Contains("23505") == true || ex.Message?.Contains("duplicate key") == true)
                                {
                                    Console.WriteLine($"Investor role already exists for user {uid} (duplicate key ignored)");
                                }
                                else
                                {
                                    Console.WriteLine($"Warning: Failed to create investor role: {ex.Message}");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Warning: Failed to create investor role: {ex.Message}");
                            }
                        }
                        break;

                    case "contributor":
                        var contributorCheck = await _supabase
                            .From<Contributor>()
                            .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                            .Get();
                        if (contributorCheck.Models.Count == 0)
                        {
                            try
                            {
                                await _supabase.From<Contributor>().Insert(new Contributor { user_id = uid });
                                Console.WriteLine($"Contributor role created for user {uid}");
                            }
                            catch (PostgrestException ex)
                            {
                                if (ex.Message?.Contains("23505") == true || ex.Message?.Contains("duplicate key") == true)
                                {
                                    Console.WriteLine($"Contributor role already exists for user {uid} (duplicate key ignored)");
                                }
                                else
                                {
                                    Console.WriteLine($"Warning: Failed to create contributor role: {ex.Message}");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Warning: Failed to create contributor role: {ex.Message}");
                            }
                        }
                        break;
                }

                // Delete temporary signup data after successful profile and role creation
                if (tempData != null)
                {
                    try
                    {
                        await _supabase.From<TempSignupData>()
                            .Filter("email", Supabase.Postgrest.Constants.Operator.Equals, userEmail)
                            .Delete();
                        Console.WriteLine($"Temporary signup data deleted for {userEmail}");
                    }
                    catch (PostgrestException deleteEx)
                    {
                        if (deleteEx.Message?.Contains("PGRST205") == true || deleteEx.Message?.Contains("Could not find the table") == true)
                        {
                            Console.WriteLine($"Warning: temp_signup_data table not found during cleanup. This is okay if table doesn't exist.");
                        }
                        else
                        {
                            Console.WriteLine($"Failed to delete temp signup data: {deleteEx.Message}");
                        }
                    }
                    catch (Exception deleteEx)
                    {
                        Console.WriteLine($"Failed to delete temp signup data: {deleteEx.Message}");
                    }
                }

                // Ensure we have a profile before returning
                if (existingProfile == null)
                {
                    return StatusCode(500, new { message = "Failed to create user profile. Please contact support." });
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
