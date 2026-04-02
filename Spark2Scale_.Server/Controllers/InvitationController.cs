using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using Spark2Scale_.Server.Services;
using System;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvitationController : ControllerBase
    {
        private readonly Client _supabase;
        private readonly EmailService _emailService;
        private readonly ILogger<InvitationController> _logger;
        private readonly Spark2Scale_.Server.Services.AccessControlService _access;

        public InvitationController(Client supabase, EmailService emailService, ILogger<InvitationController> logger, Spark2Scale_.Server.Services.AccessControlService access)
        {
            _supabase = supabase;
            _emailService = emailService;
            _logger = logger;
            _access = access;
        }

        private string GetToken()
        {
            var header = Request.Headers["Authorization"].FirstOrDefault();
            return header?.StartsWith("Bearer ") == true ? header.Substring(7) : "";
        }

        [HttpGet("verify/{token}")]
        public async Task<IActionResult> VerifyInvitation(string token)
        {
            if (string.IsNullOrEmpty(token))
                return BadRequest("Token is required.");

            try
            {
                var res = await _supabase.From<Invitation>()
                    .Where(i => i.Token == token)
                    .Get();

                var invite = res.Models.FirstOrDefault();

                if (invite == null)
                    return NotFound(new { message = "Invalid invitation token." });

                if (invite.ExpiresAt < DateTime.UtcNow)
                    return BadRequest(new { message = "Invitation has expired." });

                if (invite.Status != "Pending")
                    return BadRequest(new { message = $"Invitation is already {invite.Status}." });

                // Fetch Startup Name
                var startupRes = await _supabase.From<Startup>()
                    .Where(s => s.Sid == invite.StartupId)
                    .Get();
                
                var startup = startupRes.Models.FirstOrDefault();
                var startupName = startup?.StartupName ?? "Unknown Startup";

                return Ok(new InvitationResponse
                {
                    InvitationId = invite.Id,
                    StartupId = invite.StartupId,
                    StartupName = startupName,
                    Email = invite.Email,
                    Role = invite.Role,
                    Status = invite.Status,
                    ExpiresAt = invite.ExpiresAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying token {Token}", token);
                return StatusCode(500, new { message = "Error verifying invitation." });
            }
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendInvitation([FromBody] CreateInvitationRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Email))
                return BadRequest("Invalid request.");

            // AUTH CHECK
            if (!await _access.IsFounderOrOwner(GetToken(), request.StartupId))
                return Unauthorized(new { message = "Only the founder can send invitations." });

            try
            {
                _logger.LogInformation("Sending invitation to {Email} for Startup {StartupId}", request.Email, request.StartupId);

                // 1. Check if Startup Exists
                var startupRes = await _supabase.From<Startup>()
                    .Where(s => s.Sid == request.StartupId)
                    .Get();

                var startup = startupRes.Models.FirstOrDefault();
                if (startup == null)
                {
                    _logger.LogWarning("Startup {StartupId} not found.", request.StartupId);
                    return NotFound("Startup not found.");
                }

                // 2. Check if already invited (Pending)
                var existing = await _supabase.From<Invitation>()
                    .Match(new Dictionary<string, string> {
                        { "email", request.Email },
                        { "startup_id", request.StartupId.ToString() },
                        { "status", "Pending" }
                    })
                    .Get();

                if (existing.Models.Any())
                {
                    return Conflict(new { message = "User already has a pending invitation." });
                }

                // 3. Create Invitation
                var token = Guid.NewGuid().ToString(); // Secure token
                var invitation = new Invitation
                {
                    StartupId = request.StartupId,
                    Email = request.Email,
                    Role = request.Role ?? "Contributor",
                    Token = token,
                    Status = "Pending",
                    InvitedBy = request.InvitedBy,
                    InvitedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddDays(7)
                };

                await _supabase.From<Invitation>().Insert(invitation);
                _logger.LogInformation("Invitation created in DB with token {Token}", token);

                // 4. Send Email
                // FIX: Load CLIENT_URL from Environment (Azure) or default to Localhost
                var clientBaseUrl = Environment.GetEnvironmentVariable("CLIENT_URL") ?? "http://localhost:3000";
                var inviteLink = $"{clientBaseUrl}/invite/accept?token={token}";

                await _emailService.SendInvitationEmailAsync(request.Email, startup.StartupName, inviteLink);
                _logger.LogInformation("Invitation email sent to {Email} with link {Link}", request.Email, inviteLink);

                return Ok(new { Message = "Invitation sent successfully.", Token = token });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending invitation to {Email}", request.Email);
                return StatusCode(500, $"Error sending invitation: {ex.Message}");
            }
        }

        [HttpPost("respond")]
        public async Task<IActionResult> RespondToInvitation([FromBody] RespondInvitationRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Token))
                return BadRequest("Invalid request.");

            _logger.LogInformation("Processing invitation response. Token: {Token}, Accept: {Accept}, UserId: {UserId}", request.Token, request.Accept, request.UserId);

            try 
            {
                var res = await _supabase.From<Invitation>()
                    .Where(i => i.Token == request.Token)
                    .Get();

                var invite = res.Models.FirstOrDefault();

                if (invite == null) 
                {
                    _logger.LogWarning("Invalid invitation token: {Token}", request.Token);
                    return NotFound(new { message = "Invalid invitation token." });
                }
                
                if (invite.Status != "Pending") 
                {
                    _logger.LogWarning("Invitation {InvitationId} is already {Status}", invite.Id, invite.Status);
                    return BadRequest(new { message = $"Invitation is already {invite.Status}." });
                }

                if (request.Accept)
                {
                    // Verify User
                    if (request.UserId == Guid.Empty)
                        return BadRequest(new { message = "User ID is required for acceptance." });

                    // Verify User exists (proxy check via public.models.User)
                    // If auth.users FK fails, it means user is deleted or ID is invalid.
                    // We can't query auth.users directly easily, but we can query public.users
                    var userCheck = await _supabase.From<Spark2Scale_.Server.Models.User>()
                        .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, request.UserId.ToString())
                        .Get();

                    if (!userCheck.Models.Any())
                    {
                        return BadRequest(new { message = "User account not found. Please sign out and sign in again." });
                    }

                    // 1. Add to Startup Contributors
                    _logger.LogInformation("Adding user {UserId} to startup {StartupId}", request.UserId, invite.StartupId);

                    var existingContrib = await _supabase.From<StartupContributor>()
                        .Match(new Dictionary<string, string> {
                            { "user_id", request.UserId.ToString() },
                            { "startup_id", invite.StartupId.ToString() }
                        }).Get();

                    if (!existingContrib.Models.Any())
                    {
                        var contributor = new StartupContributor
                        {
                            ContributorId = request.UserId,
                            StartupId = invite.StartupId,
                            Role = invite.Role,
                            InvitedBy = invite.InvitedBy,
                            InvitedAt = invite.InvitedAt
                        };
                        
                        try 
                        {
                            await _supabase.From<StartupContributor>().Insert(contributor);
                            _logger.LogInformation("User {UserId} added as contributor to {StartupId} with Role {Role}", request.UserId, invite.StartupId, invite.Role);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "FAILED to add contributor {UserId} to {StartupId}. This might be an RLS issue or constraint violation.", request.UserId, invite.StartupId);
                            // We should probably NOT mark invitation as accepted if this fails? 
                            // Or return error?
                            throw; // Re-throw so we don't mark invitation as accepted
                        }
                    }
                    else
                    {
                        _logger.LogInformation("User {UserId} is already a contributor to {StartupId}", request.UserId, invite.StartupId);
                    }

                    // 2. Update Invitation Status
                    await _supabase.From<Invitation>()
                        .Where(i => i.Id == invite.Id)
                        .Set(i => i.Status, "Accepted")
                        .Update();
                    
                    _logger.LogInformation("Invitation {InvitationId} marked as Accepted", invite.Id);

                    // 3. Fetch Startup Name for response
                    var startupRes = await _supabase.From<Startup>()
                        .Where(s => s.Sid == invite.StartupId)
                        .Get();
                    var startup = startupRes.Models.FirstOrDefault();
                    var startupName = startup?.StartupName ?? "Unknown Startup";

                    return Ok(new { 
                        message = "Invitation accepted.", 
                        startupId = invite.StartupId,
                        startupName = startupName
                    });
                }
                else
                {
                    // Reject - No User ID required
                    await _supabase.From<Invitation>()
                        .Where(i => i.Id == invite.Id)
                        .Set(i => i.Status, "Rejected")
                        .Update();

                    _logger.LogInformation("Invitation {InvitationId} marked as Rejected", invite.Id);

                    return Ok(new { message = "Invitation rejected." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error processing acceptance: {ex.Message}" });
            }
        }

        [HttpGet("my-pending")]
        public async Task<IActionResult> GetMyPendingInvitations()
        {
            var token = GetToken();
            if (string.IsNullOrEmpty(token)) return Unauthorized("Missing token.");

            try
            {
                var user = await _supabase.Auth.GetUser(token);
                if (user == null) return Unauthorized("Invalid token.");

                var email = user.Email;

                var res = await _supabase.From<Invitation>()
                    .Where(i => i.Email == email && i.Status == "Pending")
                    .Get();

                var invites = res.Models;
                var dtos = new List<object>();

                foreach (var invite in invites)
                {
                    // Fetch Startup Name
                    var startupRes = await _supabase.From<Startup>()
                        .Where(s => s.Sid == invite.StartupId)
                        .Get();
                    var startupName = startupRes.Models.FirstOrDefault()?.StartupName ?? "Unknown Startup";

                    dtos.Add(new 
                    {
                        invitationId = invite.Id,
                        startupId = invite.StartupId,
                        startupName = startupName,
                        role = invite.Role,
                        expiresAt = invite.ExpiresAt,
                        token = invite.Token
                    });
                }

                return Ok(dtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching pending invitations.");
                return StatusCode(500, "Error fetching pending invitations.");
            }
        }
    }

    public class CreateInvitationRequest
    {
        public Guid StartupId { get; set; }
        public string Email { get; set; }
        public string? Role { get; set; }
        public Guid? InvitedBy { get; set; }
    }

    public class RespondInvitationRequest
    {
        public string Token { get; set; }
        public bool Accept { get; set; }
        public Guid UserId { get; set; }
    }

    public class InvitationResponse
    {
        public Guid InvitationId { get; set; }
        public Guid StartupId { get; set; }
        public string StartupName { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public string Status { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}
