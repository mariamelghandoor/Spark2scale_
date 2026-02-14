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
            Console.WriteLine($"[SignUp] Request received for: {request.Email}, Type: {request.UserType}, StartupId: {request.StartupId}");

            if (request.Password != request.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
                return BadRequest(new { message = "Password must be at least 8 characters long." });

            var email = request.Email.Trim().ToLowerInvariant();

            try
            {
                // 1️⃣ Create Auth user with User Metadata
                var options = new Supabase.Gotrue.SignUpOptions
                {
                    Data = new Dictionary<string, object>
                    {
                        { "name", request.Name },
                        { "phone", request.Phone ?? "" },
                        { "address_region", request.AddressRegion ?? "" },
                        { "user_type", request.UserType.ToLower() },
                        { "tags", request.Tags ?? Array.Empty<string>() },
                        { "startup_id", request.StartupId?.ToString() ?? "" }
                    },
                    RedirectTo = $"{Environment.GetEnvironmentVariable("CLIENT_URL") ?? "http://localhost:3000"}/auth/callback"
                };

                // VALIDATION: Ensure Contributor has a StartupId
                if (request.UserType.ToLower() == "contributor" && (!request.StartupId.HasValue || request.StartupId == Guid.Empty))
                {
                    return BadRequest(new { message = "Invalid invitation link. Startup ID is missing. Please ask the founder to resend the invite." });
                }

                Console.WriteLine("[SignUp] Calling Supabase Auth.SignUp...");
                var auth = await _supabase.Auth.SignUp(email, request.Password, options);
                Console.WriteLine($"[SignUp] Auth.SignUp complete. User ID: {auth.User?.Id ?? "NULL (Confirmation Required)"}");

                string? authUserId = null;
                bool requiresEmailConfirmation = false;

                if (auth.User != null && auth.User.Identities != null && auth.User.Identities.Count > 0)
                {
                    // User created and available
                     authUserId = auth.User.Id;
                }
                else
                {
                    requiresEmailConfirmation = true;
                    return Ok(new
                    {
                        message = "Signup successful. Please check your email to verify your account.",
                        requiresConfirmation = true
                    });
                }

                // If immediate (Email Confirm OFF), create profile/roles now
                if (!string.IsNullOrEmpty(authUserId))
                {
                    var uid = Guid.Parse(authUserId);
                    var (fname, lname) = SplitName(request.Name);

                    // 2️⃣ Create/Update Profile
                    await EnsureProfileExists(uid, email, fname, lname, request);

                    // 3️⃣ Roles & Invitation Sync
                    string userType = request.UserType.ToLower();
                    if (userType == "contributor")
                    {
                        await LinkContributorToStartup(uid, request.StartupId, email);
                    }
                    else if (userType == "founder") 
                    {
                        // ... ensure founder role ...
                        await EnsureFounderRole(uid);
                    }
                     else if (userType == "investor")
                    {
                        await EnsureInvestorRole(uid, request.Tags);
                    }


                    return Ok(new
                    {
                        message = "Account created successfully.",
                        requiresConfirmation = false
                    });
                }

                return Ok(new
                {
                    message = "Signup successful. Please verify your email.",
                    requiresConfirmation = true
                });
            }
           catch (Exception ex)
            {
                Console.WriteLine($"[SignUp] ERROR: {ex.Message}");
                return StatusCode(500, new { message = $"Internal Error: {ex.Message}" });
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
                        fname = profile?.fname ?? "",
                        lname = profile?.lname ?? "",
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

                // Retrieve signup data from User Metadata (stored during SignUp)
                string name = "";
                string phone = "";
                string addressRegion = "";
                string userType = "founder";
                string[] tags = Array.Empty<string>();
                string startupIdStr = "";

                if (user.UserMetadata != null)
                {
                    if (user.UserMetadata.TryGetValue("name", out var nameObj)) name = nameObj?.ToString() ?? "";
                    if (user.UserMetadata.TryGetValue("phone", out var phoneObj)) phone = phoneObj?.ToString() ?? "";
                    if (user.UserMetadata.TryGetValue("address_region", out var regionObj)) addressRegion = regionObj?.ToString() ?? "";
                    if (user.UserMetadata.TryGetValue("user_type", out var typeObj)) userType = typeObj?.ToString() ?? "founder";
                    
                    if (user.UserMetadata.TryGetValue("tags", out var tagsObj))
                    {
                        // Handle tags which could be JArray or List
                        try 
                        {
                            var jsonTags = System.Text.Json.JsonSerializer.Serialize(tagsObj);
                            tags = System.Text.Json.JsonSerializer.Deserialize<string[]>(jsonTags) ?? Array.Empty<string>();
                        }
                        catch 
                        {
                            // Fallback if deserialization fails
                        }
                    }

                    if (user.UserMetadata.TryGetValue("startup_id", out var startupIdObj)) startupIdStr = startupIdObj?.ToString() ?? "";
                }

                // Track if we need to update an existing incomplete profile
                bool needsProfileUpdate = existingProfile != null &&
                    (string.IsNullOrWhiteSpace(existingProfile.fname) ||
                     string.IsNullOrWhiteSpace(existingProfile.lname) ||
                     string.IsNullOrWhiteSpace(existingProfile.phone_number) ||
                     string.IsNullOrWhiteSpace(existingProfile.address_region) ||
                     string.IsNullOrWhiteSpace(existingProfile.user_type));

                // If profile doesn't exist OR has incomplete data, create/update it using signup data
                // We reconstruct a minimal request object from metadata for the helper
                var profileRequest = new FullSignUpRequest 
                { 
                    Phone = phone, 
                    AddressRegion = addressRegion, 
                    UserType = userType 
                };
                
                var (fname, lname) = SplitName(name);
                await EnsureProfileExists(uid, userEmail, fname, lname, profileRequest);

                // Create role-specific entry based on user type
                var finalUserType = userType ?? "founder";
                switch (finalUserType.ToLower())
                {
                    case "founder":
                        await EnsureFounderRole(uid);
                        break;

                    case "investor":
                        await EnsureInvestorRole(uid, tags);
                        break;

                    case "contributor":
                         Guid? sid = null;
                        if (!string.IsNullOrEmpty(startupIdStr) && Guid.TryParse(startupIdStr, out var parsedSid))
                        {
                            sid = parsedSid;
                        }
                        await LinkContributorToStartup(uid, sid, userEmail);
                        break;
                }

                // Retrieve profile again to return consistent user type
                 var refreshedProfileResult = await _supabase
                    .From<PublicUser>()
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                    .Get();
                existingProfile = refreshedProfileResult.Models.FirstOrDefault();

                return Ok(new
                {
                    message = "Email verified successfully.",
                    token = request.AccessToken,
                    user = new
                    {
                        id = uid,
                        email = user.Email,
                        emailVerified = user.EmailConfirmedAt != null,
                        userType = existingProfile?.user_type ?? "founder",
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

        // ===================== GET CURRENT USER =====================
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                // Get token from Authorization header
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
                {
                    return Unauthorized(new { message = "Missing or invalid authorization token." });
                }

                var token = authHeader.Substring("Bearer ".Length).Trim();
                if (string.IsNullOrWhiteSpace(token))
                {
                    return Unauthorized(new { message = "Missing authorization token." });
                }

                // Get current user from Supabase Auth explicitly using the token
                // Use GetUser to validate the token against the server
                var currentUser = await _supabase.Auth.GetUser(token);

                if (currentUser == null)
                {
                    return Unauthorized(new { message = "Invalid or expired token." });
                }

                var uid = Guid.Parse(currentUser.Id);

                // Get user profile from public.users
                var profileResult = await _supabase
                    .From<PublicUser>()
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                    .Get();

                var profile = profileResult.Models.FirstOrDefault();

                if (profile == null)
                {
                    return StatusCode(500, new
                    {
                        message = "Profile record missing for this account. Please contact support.",
                        user = new
                        {
                            id = uid,
                            email = currentUser.Email,
                            needsProfile = true
                        }
                    });
                }

                // Get role-specific data
                object? roleData = null;
                switch (profile.user_type?.ToLower())
                {
                    case "founder":
                        var founderResult = await _supabase
                            .From<Founder>()
                            .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                            .Get();
                        var founderModel = founderResult.Models.FirstOrDefault();
                        if (founderModel != null)
                        {
                            roleData = new { user_id = founderModel.user_id };
                        }
                        break;

                    case "investor":
                        var investorResult = await _supabase
                            .From<Investor>()
                            .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                            .Get();
                        var investorModel = investorResult.Models.FirstOrDefault();
                        if (investorModel != null)
                        {
                            roleData = new { user_id = investorModel.user_id, tags = investorModel.tags };
                        }
                        break;

                    case "contributor":
                        var contributorResult = await _supabase
                            .From<Contributor>()
                            .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                            .Get();
                        var contributorModel = contributorResult.Models.FirstOrDefault();
                        if (contributorModel != null)
                        {
                            roleData = new { user_id = contributorModel.user_id };
                        }
                        break;
                }

                return Ok(new
                {
                    user = new
                    {
                        id = uid,
                        email = profile.email,
                        fname = profile.fname ?? "",
                        lname = profile.lname ?? "",
                        phone_number = profile.phone_number ?? "",
                        address_region = profile.address_region ?? "",
                        avatar_url = profile.avatar_url ?? "",
                        user_type = profile.user_type ?? "founder",
                        created_at = profile.created_at,
                        emailVerified = currentUser.EmailConfirmedAt != null,
                        needsProfile = false
                    },
                    roleData = roleData
                });
            }
            catch (GotrueException ex)
            {
                return Unauthorized(new { message = "Invalid or expired token." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching user data." });
            }
        }

        // ===================== HELPERS =====================

        private async Task EnsureProfileExists(Guid uid, string email, string fname, string lname, FullSignUpRequest? request)
        {
             // 2️⃣ Create profile (check if it already exists)
            var existingProfileResult = await _supabase
                .From<PublicUser>()
                .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                .Get();

            var existingProfile = existingProfileResult.Models.FirstOrDefault();
            
            if (existingProfile == null)
            {
                var profile = new PublicUser
                {
                    uid = uid,
                    fname = fname,
                    lname = lname,
                    email = email,
                    phone_number = request?.Phone ?? "",
                    address_region = request?.AddressRegion ?? "",
                    avatar_url = "",
                    created_at = DateTime.UtcNow,
                    user_type = request?.UserType?.ToLower() ?? "founder"
                };
                 await _supabase.From<PublicUser>().Insert(profile);
            }
             else
            {
                 // Update if needed
                 if (string.IsNullOrEmpty(existingProfile.fname))
                 {
                    existingProfile.fname = fname;
                    existingProfile.lname = lname; 
                    existingProfile.phone_number = request?.Phone ?? "";
                    existingProfile.address_region = request?.AddressRegion ?? "";
                    existingProfile.user_type = request?.UserType?.ToLower() ?? "founder";
                    await _supabase.From<PublicUser>().Upsert(existingProfile);
                 }
            }
        }

        private async Task EnsureFounderRole(Guid uid)
        {
            var founderCheck = await _supabase.From<Founder>()
                .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                .Get();
            if (founderCheck.Models.Count == 0)
            {
                await _supabase.From<Founder>().Insert(new Founder { user_id = uid });
            }
        }

        private async Task EnsureInvestorRole(Guid uid, string[] tags)
        {
            var investorCheck = await _supabase.From<Investor>()
                .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                .Get();
            if (investorCheck.Models.Count == 0)
            {
                await _supabase.From<Investor>().Insert(new Investor { user_id = uid, tags = tags });
            }
        }

        private async Task LinkContributorToStartup(Guid uid, Guid? startupId, string email)
        {
            if (!startupId.HasValue || startupId == Guid.Empty) return;

            // 1. Add to StartupContributor
            var contributorCheck = await _supabase
                .From<StartupContributor>()
                .Match(new Dictionary<string, string> {
                    { "contributor_id", uid.ToString() },
                    { "startup_id", startupId.Value.ToString() }
                })
                .Get();
            
            if (contributorCheck.Models.Count == 0)
            {
                var contributor = new StartupContributor 
                { 
                    ContributorId = uid,
                    StartupId = startupId.Value,
                    Role = "Contributor",
                    InvitedAt = DateTime.UtcNow
                };

                // Try to find who invited them (optional, for metadata)
                 var inviteRes = await _supabase.From<Invitation>()
                    .Match(new Dictionary<string, string> {
                        { "email", email },
                        { "startup_id", startupId.Value.ToString() },
                        { "status", "Pending" }
                    })
                    .Get();
                
                var invite = inviteRes.Models.FirstOrDefault();
                if (invite != null)
                {
                    contributor.InvitedBy = invite.InvitedBy;
                    
                    // 2. Update Invitation to Accepted
                    await _supabase.From<Invitation>()
                        .Where(i => i.Id == invite.Id)
                        .Set(i => i.Status, "Accepted")
                        .Update();
                }

                await _supabase.From<StartupContributor>().Insert(contributor);
                Console.WriteLine($"[LinkContributor] User {uid} linked to Startup {startupId}");
            }
        }
    }
}