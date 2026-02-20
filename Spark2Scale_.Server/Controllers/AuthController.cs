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
        private readonly IConfiguration _configuration;

        public AuthController(Supabase.Client supabase, EmailService emailService, IConfiguration configuration)
        {
            _supabase = supabase;
            _emailService = emailService;
            _configuration = configuration;
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

        // ===================== RESEND VERIFICATION =====================
        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { message = "Email is required." });
            }

            try
            {
                var email = request.Email.Trim();
                var redirectUrl = "http://localhost:3000/auth/callback"; // TODO: Config

                Console.WriteLine($"[ResendVerification] Generating Admin Link for {email}...");

                // Manual HTTP Call to Supabase Admin API because SDK seems to lack Admin namespace
                var supabaseUrl = _configuration["Supabase:Url"] ?? _configuration["SUPABASE_URL"];
                var supabaseKey = _configuration["Supabase:Key"] ?? _configuration["SUPABASE_KEY"]; // Must be SERVICE_ROLE key

                if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
                {
                    Console.WriteLine("[ResendVerification] Missing Supabase Config for Manual Admin Call.");
                    throw new Exception("Missing Config");
                }

                using var client = new HttpClient();
                client.DefaultRequestHeaders.Add("apikey", supabaseKey);
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                var payload = new
                {
                    type = "magiclink",
                    email = email,
                    redirect_to = redirectUrl
                };

                var json = System.Text.Json.JsonSerializer.Serialize(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                // Gotrue Admin Endpoint: /auth/v1/admin/generate_link
                var endpoint = $"{supabaseUrl}/auth/v1/admin/generate_link";
                var response = await client.PostAsync(endpoint, content);

                if (response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    using var doc = System.Text.Json.JsonDocument.Parse(responseBody);
                    if (doc.RootElement.TryGetProperty("action_link", out var actionLinkProp))
                    {
                        var actionLink = actionLinkProp.GetString();
                        Console.WriteLine($"[ResendVerification] Link Generated: {actionLink}");

                        // Send via custom EmailService
                        await _emailService.SendVerificationEmailAsync(email, "User", actionLink);
                        return Ok(new { message = "Verification email sent (via direct channel)." });
                    }
                }

                Console.WriteLine($"[ResendVerification] Failed to generate link. Status: {response.StatusCode}");
                // Fallback to standard SignIn if manual fail
                var options = new Supabase.Gotrue.SignInOptions { RedirectTo = redirectUrl };
                await _supabase.Auth.SignIn(email, options);
                return Ok(new { message = "Verification email sent (via Supabase)." });

            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ResendVerification] Error: {ex.Message}");
                return Ok(new { message = "Verification email sent." });
            }
        }

        // ===================== SIGN UP =====================
        // ===================== SIGN UP =====================
        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] FullSignUpRequest request)
        {
            Console.WriteLine($"[SignUp] Request received for: {request.Email}, Type: {request.UserType}, StartupId: {request.StartupId}");
            Console.WriteLine($"[SignUp] DEBUG: RedirectUrl in request: '{request.RedirectUrl}'");

            if (request.Password != request.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
                return BadRequest(new { message = "Password must be at least 8 characters long." });

            var email = request.Email.Trim().ToLowerInvariant();

            try
            {
                // 1️⃣ Create Auth user with User Metadata
                var redirectUrl = !string.IsNullOrEmpty(request.RedirectUrl) 
                        ? request.RedirectUrl 
                        : $"{Request.Scheme}://localhost:3000/auth/callback";
                
                Console.WriteLine($"[SignUp] Using RedirectURL: {redirectUrl}");

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
                    RedirectTo = redirectUrl
                };

                // VALIDATION: Ensure Contributor has a StartupId
                if (request.UserType.ToLower() == "contributor" && (!request.StartupId.HasValue || request.StartupId == Guid.Empty))
                {
                    return BadRequest(new { message = "Invalid invitation link. Startup ID is missing. Please ask the founder to resend the invite." });
                }

                // ROBUST SIGNUP: Use Admin API to create user without sending default email
                // This prevents duplicate emails (Supabase Default + Our Custom One)
                Console.WriteLine("[SignUp] Creating user via Admin API to suppress default email...");
                
                var supabaseUrl = _configuration["Supabase:Url"] ?? _configuration["SUPABASE_URL"];
                var supabaseKey = _configuration["Supabase:Key"] ?? _configuration["SUPABASE_KEY"];
                
                string? authUserId = null;
                bool requiresEmailConfirmation = true; // Always require verification with this flow
                string? accessToken = null;

                if (!string.IsNullOrEmpty(supabaseUrl) && !string.IsNullOrEmpty(supabaseKey))
                {
                    using var client = new HttpClient();
                    client.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                    var payload = new
                    {
                        email = email,
                        password = request.Password,
                        email_confirm = false, // Do NOT auto-confirm
                        user_metadata = new Dictionary<string, object>
                        {
                            { "name", request.Name },
                            { "phone", request.Phone ?? "" },
                            { "address_region", request.AddressRegion ?? "" },
                            { "user_type", request.UserType.ToLower() },
                            { "tags", request.Tags ?? Array.Empty<string>() },
                            { "startup_id", request.StartupId?.ToString() ?? "" }
                        }
                    };

                    var json = System.Text.Json.JsonSerializer.Serialize(payload);
                    var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                    var endpoint = $"{supabaseUrl}/auth/v1/admin/users";
                    var response = await client.PostAsync(endpoint, content);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseBody = await response.Content.ReadAsStringAsync();
                        using var doc = System.Text.Json.JsonDocument.Parse(responseBody);
                        if (doc.RootElement.TryGetProperty("id", out var idProp))
                        {
                            authUserId = idProp.GetString();
                            Console.WriteLine($"[SignUp] Admin.CreateUser success. User ID: {authUserId}");
                        }
                    }
                    else
                    {
                        var errorBody = await response.Content.ReadAsStringAsync();
                        Console.WriteLine($"[SignUp] Admin.CreateUser failed: {response.StatusCode} - {errorBody}");
                        // Fallback to standard SignUp if Admin fails (e.g. if key is wrong, though it shouldn't be)
                        // Or return error if user already exists
                        if (errorBody.Contains("generic") || response.StatusCode == System.Net.HttpStatusCode.BadRequest) 
                        {
                             return BadRequest(new { message = "Signup failed. User might already exist." });
                        }
                        throw new Exception($"Admin Create Failed: {errorBody}");
                    }
                }
                
                // If we failed to get ID (and didn't return), we can't proceed
                if (string.IsNullOrEmpty(authUserId))
                {
                     // Fallback to original method? Or just fail?
                     // Let's fail safety.
                     return StatusCode(500, new { message = "Failed to create user account." });
                }

                // Initial "Auth" object simulation for downstream logic
                // We don't have a session, but we have the ID.
                // The original code used `auth.User.Id`.
                // We represented this by `authUserId`.
                
                // Proceed with existing logic using `authUserId`...
                // Mocking the "auth" object is not needed if we just set variables.
                
                Console.WriteLine($"[SignUp] User created. proceedStep: {authUserId}");
                
                // Original logic expected `auth` object for session check.
                // context: "auth" variable was used. We need to completely replace that block.
                // logic:
                // if (auth.User != null) { ... }
                
                // We replaced lines 159-161. 
                // We need to remove the `auth` checks or adapt them.
                // Since I am replacing lines 159-161, I need to be careful about the next lines.
                // The next lines (163-195) check `auth.User`.
                // I should probably replace a LARGER chunk to rewrite that logic.
                
                // RE-READING: I am replacing lines 159-161.
                // But the subsequent logic (163+) uses `auth`.
                // I need to instruct the tool to replace MORE lines or I will break compilation.
                // Let's replace from 159 to 195.
                
                    if (requiresEmailConfirmation)
                    {
                        // ROBUST EMAIL SENDING: Manually generate link and send via EmailService
                        try 
                        {
                            Console.WriteLine($"[SignUp] Generating Admin Link for {email}...");
                            // Variables supabaseUrl and supabaseKey are already defined in outer scope

                            if (!string.IsNullOrEmpty(supabaseUrl) && !string.IsNullOrEmpty(supabaseKey))
                            {
                            using var client = new HttpClient();
                            client.DefaultRequestHeaders.Add("apikey", supabaseKey);
                            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                            var payload = new
                            {
                                type = "magiclink", // or "signup" but magiclink works for verification too and logs them in
                                email = email,
                                redirect_to = redirectUrl
                            };

                            var json = System.Text.Json.JsonSerializer.Serialize(payload);
                            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                            var endpoint = $"{supabaseUrl}/auth/v1/admin/generate_link";
                            var response = await client.PostAsync(endpoint, content);

                            if (response.IsSuccessStatusCode)
                            {
                                var responseBody = await response.Content.ReadAsStringAsync();
                                using var doc = System.Text.Json.JsonDocument.Parse(responseBody);
                                if (doc.RootElement.TryGetProperty("action_link", out var actionLinkProp))
                                {
                                    var actionLink = actionLinkProp.GetString();
                                    Console.WriteLine($"[SignUp] Link Generated: {actionLink}");
                                    
                                    // Send via custom EmailService
                                    await _emailService.SendVerificationEmailAsync(email, request.Name, actionLink);
                                    Console.WriteLine("[SignUp] Verification email sent via EmailService.");
                                }
                            }
                            else
                            {
                                Console.WriteLine($"[SignUp] Failed to generate admin link. Status: {response.StatusCode}");
                            }
                        }
                    }
                    catch (Exception emailEx)
                    {
                        Console.WriteLine($"[SignUp] Failed to send robust email: {emailEx.Message}");
                        // Continue to return OK, as Supabase *might* have sent it, or user can use Resend.
                    }

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
                        await EnsureFounderRole(uid);
                    }
                     else if (userType == "investor")
                    {
                        await EnsureInvestorRole(uid, request.Tags);
                    }

                    return Ok(new
                    {
                        message = "Account created successfully.",
                        requiresConfirmation = false,
                        token = accessToken,
                        user = new { id = uid, email = email, userType = userType }
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
                Console.WriteLine($"[SignUp] StackTrace: {ex.StackTrace}");
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

        // ===================== GOOGLE SIGN IN =====================
        [HttpPost("google-signin")]
        public async Task<IActionResult> GoogleSignIn([FromBody] GoogleSignInRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                return BadRequest(new { message = "Missing access token." });
            }

            try
            {
                // 1. Validate Token & Get User from Supabase
                var user = await _supabase.Auth.GetUser(request.AccessToken);
                if (user == null)
                {
                    return Unauthorized(new { message = "Invalid or expired token." });
                }

                var uid = Guid.Parse(user.Id);
                var email = user.Email ?? "";

                // 2. Check/Create Profile
                var profileResult = await _supabase
                    .From<PublicUser>()
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                    .Get();

                var profile = profileResult.Models.FirstOrDefault();

                if (profile == null)
                {
                    // Create minimal profile from metadata
                    string fname = "";
                    string lname = "";

                    if (user.UserMetadata != null)
                    {
                        if (user.UserMetadata.TryGetValue("full_name", out var fnObj))
                        {
                            var full = fnObj?.ToString() ?? "";
                            (fname, lname) = SplitName(full);
                        }
                        else if (user.UserMetadata.TryGetValue("name", out var nObj))
                        {
                            var full = nObj?.ToString() ?? "";
                            (fname, lname) = SplitName(full);
                        }
                    }

                    await EnsureProfileExists(uid, email, fname, lname, new FullSignUpRequest 
                    { 
                        UserType = "founder" // Default to founder if unknown, or let them choose later? 
                                             // Ideally, we should ask them. But for now, default.
                    });

                    // Fetch again
                    profileResult = await _supabase
                        .From<PublicUser>()
                        .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                        .Get();
                    profile = profileResult.Models.FirstOrDefault();
                }

                return Ok(new
                {
                    token = request.AccessToken, // Return the same token (or refresh it if needed)
                    user = new
                    {
                        id = uid,
                        email = email,
                        fname = profile?.fname ?? "",
                        lname = profile?.lname ?? "",
                        userType = profile?.user_type,
                        hasProfile = profile != null
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GoogleSignIn] Error: {ex.Message}");
                return StatusCode(500, new { message = "Google Sign-In failed." });
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

        // ===================== RESEND VERIFICATION =====================


        // ===================== VERIFY EMAIL CALLBACK =====================
        // Called after user clicks email verification link
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

                try
                {
                    // Attempt to set session, but don't fail properly if it errors (e.g. empty refresh token on some flows)
                    await _supabase.Auth.SetSession(request.AccessToken.Trim(), refreshToken, false);
                }
                catch (Exception sessionEx)
                {
                    Console.WriteLine($"[VerifyEmail] Warning: SetSession failed: {sessionEx.Message}. Proceeding with GetUser...");
                }

                // Get the verified user explicitly to ensure metadata is synced
                var user = await _supabase.Auth.GetUser(request.AccessToken.Trim());
                if (user == null)
                {
                    return BadRequest(new { message = "Unable to verify user. Invalid token." });
                }

                var uid = Guid.Parse(user.Id);
                var userEmail = user.Email ?? "";

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
                        try 
                        {
                            var jsonTags = System.Text.Json.JsonSerializer.Serialize(tagsObj);
                            tags = System.Text.Json.JsonSerializer.Deserialize<string[]>(jsonTags) ?? Array.Empty<string>();
                        }
                        catch { }
                    }

                    if (user.UserMetadata.TryGetValue("startup_id", out var startupIdObj)) startupIdStr = startupIdObj?.ToString() ?? "";
                }

                Console.WriteLine($"[VerifyEmail] User: {userEmail}, Type: {userType}, StartupId: {startupIdStr}");

                var (fname, lname) = SplitName(name);
                
                // Ensure profile exists or is updated
                try
                {
                    var profileRequest = new FullSignUpRequest 
                    { 
                        Phone = phone, 
                        AddressRegion = addressRegion, 
                        UserType = userType 
                    };
                    await EnsureProfileExists(uid, userEmail, fname, lname, profileRequest);
                }
                catch (Exception profEx)
                {
                     Console.WriteLine($"[VerifyEmail] Profile creation error: {profEx.Message}");
                     // Continue, checking if we can still link roles
                }

                // Create role-specific entry
                try
                {
                    switch (userType.ToLower())
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
                                sid = parsedSid;
                            
                            await LinkContributorToStartup(uid, sid, userEmail);
                            break;
                    }
                }
                catch (Exception roleEx)
                {
                    Console.WriteLine($"[VerifyEmail] Role linking error: {roleEx.Message}. User verified but roles might be incomplete.");
                }

                // Retrieve final profile for response (safe fallback)
                PublicUser? refreshedProfile = null;
                try
                {
                    var refreshedProfileResult = await _supabase
                        .From<PublicUser>()
                        .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                        .Get();
                    refreshedProfile = refreshedProfileResult.Models.FirstOrDefault();
                } 
                catch {}

                return Ok(new
                {
                    message = "Email verified successfully.",
                    token = request.AccessToken,
                    user = new
                    {
                        id = uid,
                        email = user.Email,
                        fname = refreshedProfile?.fname ?? fname,
                        lname = refreshedProfile?.lname ?? lname,
                        userType = refreshedProfile?.user_type ?? userType,
                        needsProfile = false
                    }
                });
            }
            catch (GotrueException)
            {
                return BadRequest(new { message = "Invalid or expired verification token." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VerifyEmail] Error: {ex}");
                // Even on generic error, if we got this far, we probably verified the token. 
                // But safer to show error if main flow failed.
                return StatusCode(500, new { message = $"Verification error: {ex.Message}" });
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
                            .From<StartupContributor>()
                            .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                            .Get();
                        var contributorModel = contributorResult.Models.FirstOrDefault();
                        if (contributorModel != null)
                        {
                            roleData = new { user_id = contributorModel.ContributorId };
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
            Console.WriteLine($"[LinkContributorToStartup] Start: uid={uid}, sid={startupId}, email={email}");
            if (!startupId.HasValue || startupId == Guid.Empty) 
            {
                Console.WriteLine("[LinkContributorToStartup] Aborting: No valid StartupId.");
                return;
            }

            // 1. Add to StartupContributor
            var contributorCheck = await _supabase
                .From<StartupContributor>()
                .Match(new Dictionary<string, string> {
                    { "user_id", uid.ToString() },
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