using System;
using System.Text.Json.Serialization;

namespace Spark2Scale_.Server.Models
{
    // ============================
    // SIGN UP REQUEST
    // ============================
    public class SignUpRequest
    {
        public string Name { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string ConfirmPassword { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        // Frontend sends { "userType": "founder" | "investor" | "contributor" }
        [JsonPropertyName("userType")]
        public string UserType { get; set; } = "founder";

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
