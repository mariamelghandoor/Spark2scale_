using System;
using System.Text.Json.Serialization;

namespace Spark2Scale_.Server.Models
{
    // ============================
    // SIGN UP REQUEST
    // ============================
    // Used only to create auth.users in Supabase.
    // We NO LONGER write into public.users at signup.
    public class SignUpRequest
    {
        public string Name { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string ConfirmPassword { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;
    }

    // ============================
    // COMPLETE PROFILE REQUEST
    // ============================
    // Used after login to create/update public.users
    // and related founder/investor/contributor row.
    public class CompleteProfileRequest
    {
        [JsonPropertyName("userId")]
        public Guid UserId { get; set; }

        [JsonPropertyName("firstName")]
        public string FirstName { get; set; } = string.Empty;

        [JsonPropertyName("lastName")]
        public string LastName { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("addressRegion")]
        public string AddressRegion { get; set; } = string.Empty;

        // "founder" | "investor" | "contributor"
        [JsonPropertyName("userType")]
        public string UserType { get; set; } = string.Empty;

        [JsonPropertyName("tags")]
        public string[] Tags { get; set; } = Array.Empty<string>();
    }

    // ============================
    // SIGN IN REQUEST
    // ============================
    public class SignInRequest
    {
        public string Email { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }

    // ============================
    // FORGOT PASSWORD
    // ============================
    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    // ============================
    // RESET PASSWORD
    // ============================
    public class ResetPasswordRequest
    {
        public string AccessToken { get; set; } = string.Empty;

        public string NewPassword { get; set; } = string.Empty;

        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
