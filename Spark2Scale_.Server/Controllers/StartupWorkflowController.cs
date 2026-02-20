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
    public class StartupWorkflowController : ControllerBase
    {
        private readonly Client _supabase;
        private readonly Spark2Scale_.Server.Services.AccessControlService _access;

        public StartupWorkflowController(Client supabase, Spark2Scale_.Server.Services.AccessControlService access)
        {
            _supabase = supabase;
            _access = access;
        }

        private string GetToken()
        {
            var header = Request.Headers["Authorization"].FirstOrDefault();
            return header?.StartsWith("Bearer ") == true ? header.Substring(7) : "";
        }

        // GET: api/StartupWorkflow/{startupId}
        [HttpGet("{startupId}")]
        public async Task<IActionResult> GetWorkflow(string startupId)
        {
            // 1. Validate ID Format
            if (!Guid.TryParse(startupId, out Guid sId))
                return BadRequest($"Invalid Startup ID format: {startupId}");

            try
            {
                // 2. Fetch Workflow
                var result = await _supabase.From<StartupWorkflow>()
                    .Where(w => w.StartupId == sId)
                    .Get();

                var workflow = result.Models.FirstOrDefault();

                // 3. Handle "Not Found" vs "Return Default"
                // If no workflow exists yet, we can return a default "empty" workflow 
                // or a 404. Returning default is often friendlier for UI.
                if (workflow == null)
                {
                    return Ok(new WorkflowResponseDto
                    {
                        StartupId = sId,
                        IdeaCheck = false,
                        MarketResearch = false,
                        Evaluation = false,
                        Recommendation = false,
                        Documents = false,
                        PitchDeck = false,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                // 4. Return existing workflow
                return Ok(new WorkflowResponseDto
                {
                    StartupId = workflow.StartupId,
                    IdeaCheck = workflow.IdeaCheck,
                    MarketResearch = workflow.MarketResearch,
                    Evaluation = workflow.Evaluation,
                    Recommendation = workflow.Recommendation,
                    Documents = workflow.Documents,
                    PitchDeck = workflow.PitchDeck,
                    UpdatedAt = workflow.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching workflow: {ex.Message}");
            }
        }

        // POST: api/StartupWorkflow/update
        // We use POST to handle both Creation and Updates (Upsert)
        [HttpPost("update")] // (Change to HttpPut if your original used Put)
        public async Task<IActionResult> UpdateWorkflow([FromBody] StartupWorkflow input)
        {
            try
            {
                // 1. Foolproof Token Extraction (Case-Insensitive)
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    return Unauthorized(new { message = "Missing or invalid token format." });

                var token = authHeader.Substring(7).Trim();

                // 2. Verify user is authenticated
                var user = await _supabase.Auth.GetUser(token);
                if (user == null || string.IsNullOrEmpty(user.Id))
                    return Unauthorized(new { message = "Invalid or expired session." });

                // 3. Verify the user actually owns this startup
                var startupRes = await _supabase.From<Startup>()
                    .Select("sid,founder_id")
                    .Where(s => s.Sid == input.StartupId)
                    .Get();

                var startup = startupRes.Models.FirstOrDefault();
                if (startup == null || startup.FounderId.ToString() != user.Id)
                    return StatusCode(403, new { message = "Only the founder can update the workflow." });

                // 4. Perform the Update
                input.UpdatedAt = DateTime.UtcNow;

                // Using Upsert ensures it updates the existing row perfectly
                await _supabase.From<StartupWorkflow>().Upsert(input);

                return Ok(new { success = true, message = "Workflow stage marked as complete." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating workflow: {ex.Message}");
            }
        }

        // POST: api/StartupWorkflow/reset/{startupId}
        [HttpPost("reset/{startupId}")]
        public async Task<IActionResult> ResetProgress(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            // AUTH CHECK
            if (!await _access.IsFounderOrOwner(GetToken(), sId))
                return Unauthorized(new { message = "Only the startup founder can reset progress." });

            try
            {
                // 1. Archive Documents
                await _supabase.From<Document>()
                    .Where(x => x.StartupId == sId && x.IsCurrent == true)
                    .Set(x => x.IsCurrent, false)
                    .Update();

                // 2. Archive Recommendations
                await _supabase.From<Recommendation>()
                    .Where(x => x.StartupId == sId && x.IsCurrent == true)
                    .Set(x => x.IsCurrent, false)
                    .Update();

                // 3. NEW: Archive Pitch Decks (This is the modular fix)
                // We reset ALL pitches for this startup to is_current = false
                await _supabase.From<PitchDeck>()
                    .Where(x => x.startup_id == sId) // Note: ensure casing matches your model (startup_id vs StartupId)
                    .Set(x => x.is_current, false)
                    .Update();

                // 4. Reset Workflow Flags
                var workflowReset = new StartupWorkflow
                {
                    StartupId = sId,
                    IdeaCheck = false,
                    MarketResearch = false,
                    Evaluation = false,
                    Recommendation = false,
                    Documents = false,
                    PitchDeck = false,
                    UpdatedAt = DateTime.UtcNow
                };

                await _supabase.From<StartupWorkflow>().Upsert(workflowReset);

                return Ok(new { message = "Reset successful. Workflow, Docs, and Pitches archived." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Reset failed: {ex.Message}");
            }
        }

        [HttpPost("complete-pitch/{startupId}")]
        public async Task<IActionResult> CompletePitchDeckStage(Guid startupId)
        {
            // AUTH CHECK
            if (!await _access.IsFounderOrOwner(GetToken(), startupId))
                return Unauthorized(new { message = "Unauthorized." });
            try
            {
                var update = await _supabase.From<StartupWorkflow>()
                                          .Where(x => x.StartupId == startupId)
                                          .Set(x => x.PitchDeck, true)
                                          .Set(x => x.UpdatedAt, DateTime.UtcNow)
                                          .Update();

                var result = update.Models.FirstOrDefault();

                if (result == null) return NotFound("Workflow not found for this startup.");

                var workflowDto = new WorkflowResponseDto
                {
                    StartupId = result.StartupId,
                    IdeaCheck = result.IdeaCheck,
                    MarketResearch = result.MarketResearch,
                    Evaluation = result.Evaluation,
                    Recommendation = result.Recommendation,
                    Documents = result.Documents,
                    PitchDeck = result.PitchDeck,
                    UpdatedAt = result.UpdatedAt
                };

                return Ok(new { message = "Pitch Deck stage marked as complete.", workflow = workflowDto });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating workflow: {ex.Message}");
            }
        }
    }
}