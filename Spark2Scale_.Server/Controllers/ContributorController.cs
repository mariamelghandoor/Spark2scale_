using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using Spark2Scale_.Server.Services; // Ensure EmailService is imported
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContributorController : ControllerBase
    {
        private readonly Client _supabase;
        private readonly EmailService _emailService;

        // Inject EmailService here
        public ContributorController(Client supabase, EmailService emailService)
        {
            _supabase = supabase;
            _emailService = emailService;
        }

        [HttpPost("invite")]
        public async Task<IActionResult> InviteContributor([FromBody] InviteRequestDto request)
        {
            if (string.IsNullOrEmpty(request.Email) || request.StartupId == Guid.Empty)
                return BadRequest("Invalid request.");

            // 1. Check if user already exists
            var userResponse = await _supabase
                .From<User>()
                .Filter("email", Supabase.Postgrest.Constants.Operator.Equals, request.Email)
                .Get();

            var existingUser = userResponse.Models.FirstOrDefault();

            // --- SCENARIO A: USER EXISTS (Send Accept Link) ---
            if (existingUser != null)
            {
                // FIX IS HERE: Changed <string, object> to <string, string> and added .ToString()
                var check = await _supabase.From<Contributor>()
                    .Match(new Dictionary<string, string> {
                { "user_id", existingUser.uid.ToString() },
                { "startup_id", request.StartupId.ToString() }
                    }).Get();

                if (check.Models.Any()) return BadRequest("User is already a contributor.");

                // Send existing flow email
                string acceptLink = $"http://localhost:3000/accept-invite?uid={existingUser.uid}&sid={request.StartupId}";
                string body = $@"
            <h3>You're Invited!</h3>
            <p>You have been invited to collaborate on a startup.</p>
            <a href='{acceptLink}'>Click here to Accept</a>";

                await _emailService.SendEmailAsync(request.Email, "Join the Team - Spark2Scale", body);
                return Ok(new { message = "Invitation sent to existing user." });
            }

            // --- SCENARIO B: NEW USER (Send Signup Link) ---
            else
            {
                try
                {
                    var pending = new PendingInvite
                    {
                        StartupId = request.StartupId,
                        Email = request.Email,
                        Role = "contributor"
                    };

                    await _supabase.From<PendingInvite>().Insert(pending);

                    string signupLink = $"http://localhost:3000/signup?email={request.Email}";

                    string body = $@"
                <h3>You're Invited!</h3>
                <p>You have been invited to join a startup as a Contributor.</p>
                <p>You need to create an account to view the dashboard.</p>
                <br/>
                <a href='{signupLink}' style='background-color:#576238; color:white; padding:10px 20px; text-decoration:none;'>Create Account & Join</a>";

                    await _emailService.SendEmailAsync(request.Email, "Invitation to Spark2Scale", body);

                    return Ok(new { message = "User not found. Invite sent to join the platform." });
                }
                catch (Exception)
                {
                    return BadRequest("Invitation already pending for this email.");
                }
            }
        }

        [HttpPost("accept")]
        public async Task<IActionResult> AcceptInvite([FromBody] AcceptInviteDto request)
        {
            try
            {
                var newContributor = new Contributor
                {
                    user_id = request.UserId,
                    startup_id = request.StartupId
                };

                await _supabase.From<Contributor>().Insert(newContributor);

                return Ok(new { message = "You have successfully joined the startup!" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error accepting invite: {ex.Message}");
            }
        }
    }
}