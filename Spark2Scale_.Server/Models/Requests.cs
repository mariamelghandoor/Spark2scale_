using System;
using System.Text.Json.Serialization;

namespace Spark2Scale_.Server.Models
{
    public class FullSignUpRequest
    {
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string ConfirmPassword { get; set; } = "";
        public string Phone { get; set; } = "";
        public string AddressRegion { get; set; } = "";
        public string UserType { get; set; } = "founder";
        public string[] Tags { get; set; } = Array.Empty<string>();
    }

    public class SignInRequest
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = "";
    }

    public class ResetPasswordRequest
    {
        public string AccessToken { get; set; } = "";
        public string NewPassword { get; set; } = "";
        public string ConfirmPassword { get; set; } = "";
    }
}

