using System;
using System.Text.Json.Serialization;

namespace Spark2Scale_.Server.Models
{
    // ============================
    // SIGN UP REQUEST
    // ============================
    // Used only to create auth.users in Supabase.
    // We NO LONGER write into public.users at signup.
    public class FullSignUpRequest
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }

        public string Email { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }

        public string Phone { get; set; }
        public string AddressRegion { get; set; }

        public string UserType { get; set; } // founder, investor, contributor
        public string[] Tags { get; set; }   // only for investors
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
