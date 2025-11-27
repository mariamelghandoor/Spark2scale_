using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StartupContributorController : ControllerBase
    {
        private readonly Client _supabase;

        public StartupContributorController(Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost("add")] // Explicitly named route
        public async Task<IActionResult> AddStartupContributor([FromBody] CreateStartupContributorRequest request)
        {
            // 1. Validate Input
            if (request == null) return BadRequest("Request body is required.");

            if (!Guid.TryParse(request.ContributorId, out Guid contributorGuid))
                return BadRequest($"Invalid Contributor ID format: {request.ContributorId}");

            if (!Guid.TryParse(request.StartupId, out Guid startupGuid))
                return BadRequest($"Invalid Startup ID format: {request.StartupId}");

            Guid? invitedByGuid = null;
            if (!string.IsNullOrEmpty(request.InvitedBy))
            {
                if (Guid.TryParse(request.InvitedBy, out Guid tempGuid))
                    invitedByGuid = tempGuid;
                else
                    return BadRequest($"Invalid InvitedBy ID format: {request.InvitedBy}");
            }

            // 2. Verify Startup Exists
            var startupCheck = await _supabase.From<Startup>()
                .Where(s => s.Sid == startupGuid)
                .Get();

            if (!startupCheck.Models.Any())
                return BadRequest("Startup does not exist.");

            // 3. Verify Contributor Exists (in 'contributors' table)
            // Note: Use the model you defined earlier for contributors
            var contributorCheck = await _supabase.From<Contributor>()
                .Where(c => c.user_id == contributorGuid)
                .Get();

            if (!contributorCheck.Models.Any())
                return BadRequest("User is not registered as a Contributor yet.");

            // 4. Check for Duplicates (Is he already in this startup?)
            var existing = await _supabase.From<StartupContributor>()
                .Where(x => x.ContributorId == contributorGuid && x.StartupId == startupGuid)
                .Get();

            if (existing.Models.Any())
                return Conflict("This contributor is already part of this startup.");

            // 5. Create Model
            var newRecord = new StartupContributor
            {
                ContributorId = contributorGuid,
                StartupId = startupGuid,
                Role = request.Role,
                InvitedBy = invitedByGuid,
                InvitedAt = DateTime.UtcNow
            };

            // 6. Insert
            try
            {
                await _supabase.From<StartupContributor>().Insert(newRecord);

                return Ok(new StartupContributorDto
                {
                    ContributorId = contributorGuid,
                    StartupId = startupGuid,
                    Role = request.Role,
                    InvitedBy = invitedByGuid,
                    InvitedAt = newRecord.InvitedAt
                });
            }
            catch (Exception ex)
            {
                // This catches the 23502 error if it still happens, giving us the message
                return StatusCode(500, $"Database Error: {ex.Message}");
            }
        }

        // GET method to list contributors for a startup
        [HttpGet("{startupId}")]
        public async Task<IActionResult> GetContributors(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId))
                return BadRequest("Invalid Startup ID.");

            var result = await _supabase.From<StartupContributor>()
                .Where(x => x.StartupId == sId)
                .Get();

            var dtos = result.Models.Select(x => new StartupContributorDto
            {
                ContributorId = x.ContributorId,
                StartupId = x.StartupId,
                Role = x.Role,
                InvitedBy = x.InvitedBy,
                InvitedAt = x.InvitedAt
            }).ToList();

            return Ok(dtos);
        }
    }
}