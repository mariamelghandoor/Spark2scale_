using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StartupsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly Services.AccessControlService _access;

        public StartupsController(Supabase.Client supabase, Services.AccessControlService access)
        {
            _supabase = supabase;
            _access = access;
        }

        // ─────────────────────────────────────────────────────────────
        // Helper: map a Startup DB model → StartupResponseDto
        // Keeps all response mappings consistent across every endpoint.
        // ─────────────────────────────────────────────────────────────
        private static StartupResponseDto ToDto(Startup s, string? role = null) =>
            new StartupResponseDto
            {
                sid               = s.Sid,
                startupname       = s.StartupName,
                field             = s.Field,
                idea_description  = s.IdeaDescription,
                founder_id        = s.FounderId,
                created_at        = s.CreatedAt,
                current_iteration = s.CurrentIteration,
                region            = s.Region,
                startup_stage     = s.StartupStage,
                json_response     = s.JsonResponse.HasValue && s.JsonResponse.Value.ValueKind != JsonValueKind.Undefined
                                        ? s.JsonResponse.Value
                                        : null,
                logo_path         = s.LogoPath,
                current_role      = role,
            };

        // ─────────────────────────────────────────────────────────────
        // POST api/Startups/add
        // ─────────────────────────────────────────────────────────────
        [HttpPost("add")]
        public async Task<IActionResult> AddStartup([FromBody] StartupInsertDto input)
        {
            if (input == null || string.IsNullOrEmpty(input.startupname))
                return BadRequest("Startup Name is required.");

            var newStartup = new Startup
            {
                StartupName  = input.startupname,
                Field        = input.field,
                IdeaDescription = input.idea_description,
                Region       = input.region,
                StartupStage = input.startup_stage,
                FounderId    = input.founder_id,
                LogoPath     = input.logo_path,
                CreatedAt    = DateTime.UtcNow,
                CurrentIteration = 0,
            };

            var result   = await _supabase.From<Startup>().Insert(newStartup);
            var inserted = result.Models.FirstOrDefault();

            if (inserted == null) return StatusCode(500, "Failed to insert startup");

            return Ok(ToDto(inserted));
        }

        // ─────────────────────────────────────────────────────────────
        // GET api/Startups
        // ─────────────────────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetStartups(
            [FromQuery] string? founderId,
            [FromQuery] string? contributorId)
        {
            try
            {
                // --- By founder ---
                if (!string.IsNullOrEmpty(founderId) && Guid.TryParse(founderId, out Guid fId))
                {
                    var result = await _supabase.From<Startup>()
                        .Where(s => s.FounderId == fId)
                        .Get();

                    return Ok(result.Models.Select(s => ToDto(s)).ToList());
                }

                // --- By contributor ---
                if (!string.IsNullOrEmpty(contributorId) && Guid.TryParse(contributorId, out Guid cId))
                {
                    Console.WriteLine($"[GetStartups] Fetching startups for ContributorId: {cId}");

                    var linkResult = await _supabase.From<StartupContributor>()
                        .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, cId.ToString())
                        .Get();

                    var links = linkResult.Models;
                    Console.WriteLine($"[GetStartups] Found {links.Count} startup links.");

                    if (!links.Any())
                        return Ok(new List<StartupResponseDto>());

                    var startupIds = links.Select(x => x.StartupId.ToString()).ToList();

                    var startupResult = await _supabase.From<Startup>()
                        .Filter("sid", Supabase.Postgrest.Constants.Operator.In, startupIds)
                        .Get();

                    var dtos = startupResult.Models.Select(s =>
                    {
                        var link = links.FirstOrDefault(l => l.StartupId == s.Sid);
                        return ToDto(s, link?.Role ?? "Contributor");
                    }).ToList();

                    return Ok(dtos);
                }

                // --- All startups (investor feed) ---
                {
                    var result = await _supabase.From<Startup>().Get();
                    var dtos   = new List<StartupResponseDto>();

                    Guid? currentUserId = null;
                    var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                    {
                        var token = authHeader.Substring("Bearer ".Length).Trim();
                        try
                        {
                            var user = await _supabase.Auth.GetUser(token);
                            if (user != null && Guid.TryParse(user.Id, out Guid uid))
                                currentUserId = uid;
                        }
                        catch { /* ignore */ }
                    }

                    foreach (var s in result.Models)
                    {
                        string? role = null;
                        if (currentUserId.HasValue)
                        {
                            if (s.FounderId == currentUserId.Value)
                            {
                                role = "Founder";
                            }
                            else
                            {
                                var contrib = await _supabase.From<StartupContributor>()
                                    .Match(new Dictionary<string, string> {
                                        { "startup_id", s.Sid.ToString() },
                                        { "user_id", currentUserId.Value.ToString() }
                                    }).Get();
                                if (contrib.Models.Any()) role = contrib.Models.First().Role ?? "Contributor";
                            }
                        }
                        dtos.Add(ToDto(s, role));
                    }

                    return Ok(dtos);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching startups: {ex.Message}");
            }
        }

        // ─────────────────────────────────────────────────────────────
        // GET api/Startups/{id}
        // ─────────────────────────────────────────────────────────────
        [HttpGet("{id}")]
        public async Task<IActionResult> GetStartupById(string id)
        {
            if (!Guid.TryParse(id, out Guid sId))
                return BadRequest("Invalid ID format");

            try
            {
                var result  = await _supabase.From<Startup>().Where(s => s.Sid == sId).Get();
                var startup = result.Models.FirstOrDefault();

                if (startup == null) return NotFound("Startup not found");

                string? role = null;
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                {
                    var token = authHeader.Substring("Bearer ".Length).Trim();
                    try
                    {
                        var user = await _supabase.Auth.GetUser(token);
                        if (user != null && Guid.TryParse(user.Id, out Guid currentUserId))
                        {
                            if (startup.FounderId == currentUserId)
                            {
                                role = "Founder";
                            }
                            else
                            {
                                var contrib = await _supabase.From<StartupContributor>()
                                    .Match(new Dictionary<string, string> {
                                        { "startup_id", sId.ToString() },
                                        { "user_id", currentUserId.ToString() }
                                    }).Get();
                                if (contrib.Models.Any()) role = contrib.Models.First().Role ?? "Contributor";
                            }
                        }
                    }
                    catch { /* expired / invalid token */ }
                }

                return Ok(ToDto(startup, role));
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // ─────────────────────────────────────────────────────────────
        // PUT api/Startups/{id}/recommendation
        // Overwrites json_response and increments current_iteration.
        // Called by the Recommendation Agent after each new report.
        // current_iteration is tracked in the DB but NOT shown in the UI
        // (each generate replaces the report — no visible versioning).
        // ─────────────────────────────────────────────────────────────
        [HttpPut("{id}/recommendation")]
        public async Task<IActionResult> UpdateRecommendationData(
            string id,
            [FromBody] StartupRecommendationUpdateDto input)
        {
            if (!Guid.TryParse(id, out Guid sId))
                return BadRequest("Invalid startup ID format.");

            try
            {
                var existing = await _supabase.From<Startup>()
                    .Where(s => s.Sid == sId)
                    .Get();

                if (!existing.Models.Any())
                    return NotFound($"Startup {id} not found.");

                await _supabase.From<Startup>()
                    .Where(s => s.Sid == sId)
                    .Set(s => s.JsonResponse, input.JsonResponse)
                    .Set(s => s.CurrentIteration, input.CurrentIteration)
                    .Update();

                return Ok(new
                {
                    message           = "Recommendation saved to startup.",
                    startup_id        = sId,
                    current_iteration = input.CurrentIteration
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating recommendation: {ex.Message}");
            }
        }

        // ─────────────────────────────────────────────────────────────
        // PUT api/Startups/update-idea/{id}
        // ─────────────────────────────────────────────────────────────
        [HttpPut("update-idea/{id}")]
        public async Task<IActionResult> UpdateIdea(string id, [FromBody] IdeaUpdateDto input)
        {
            if (!Guid.TryParse(id, out Guid sId))
                return BadRequest("Invalid ID format");

            if (string.IsNullOrWhiteSpace(input.IdeaDescription))
                return BadRequest("Idea description cannot be empty");

            try
            {
                var token = Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");

                if (string.IsNullOrEmpty(token))
                    return Unauthorized("Missing authorization token.");

                if (!await _access.IsFounderOrOwner(token, sId))
                    return StatusCode(403, "Only the Founder can update the idea.");

                var parameters = new Dictionary<string, object>
                {
                    { "p_startup_id", sId },
                    { "p_new_idea",   input.IdeaDescription }
                };

                await _supabase.Rpc("update_idea_and_reset", parameters);

                return Ok(new
                {
                    message = "Idea updated, history archived, and workflow reset successfully.",
                    idea    = input.IdeaDescription
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating idea: {ex.Message}");
            }
        }
    }
}
