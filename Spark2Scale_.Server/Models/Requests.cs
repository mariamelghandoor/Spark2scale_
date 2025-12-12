using System;

namespace Spark2Scale_.Server.Models
{
    public class SignUpRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string UserType { get; set; } = "founder";
        public string[] Tags { get; set; } = Array.Empty<string>();
    }

    public class SignInRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    // Used for the initial form submission on the frontend to trigger the email
    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    // Used after the user clicks the email link and lands on the reset page
    public class ResetPasswordRequest
    {
        public string AccessToken { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}