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

        public StartupWorkflowController(Client supabase)
        {
            _supabase = supabase;
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
        [HttpPost("update")]
        public async Task<IActionResult> UpdateWorkflow([FromBody] WorkflowUpdateDto request)
        {
            // 1. Validate Input
            if (request == null) return BadRequest("Request body is required.");

            if (!Guid.TryParse(request.StartupId, out Guid sId))
                return BadRequest($"Invalid Startup ID format: {request.StartupId}");

            // 2. Check if Startup actually exists (Foreign Key Check)
            // This prevents adding a workflow for a non-existent startup
            var startupCheck = await _supabase.From<Startup>()
                .Where(s => s.Sid == sId)
                .Get();

            if (!startupCheck.Models.Any())
                return BadRequest($"Startup with ID {sId} does not exist.");

            // 3. Prepare Model
            var model = new StartupWorkflow
            {
                StartupId = sId,
                IdeaCheck = request.IdeaCheck,
                MarketResearch = request.MarketResearch,
                Evaluation = request.Evaluation,
                Recommendation = request.Recommendation,
                Documents = request.Documents,
                PitchDeck = request.PitchDeck,
                UpdatedAt = DateTime.UtcNow
            };

            try
            {
                // 4. Perform Upsert
                // Upsert() will Insert if the ID is new, or Update if the ID exists.
                var result = await _supabase.From<StartupWorkflow>().Upsert(model);
                var inserted = result.Models.FirstOrDefault();

                // FIX: Map to DTO instead of returning the 'model' directly.
                // Returning 'model' (BaseModel) causes serialization errors because of its internal attributes.
                var responseDto = new WorkflowResponseDto
                {
                    StartupId = sId,
                    IdeaCheck = request.IdeaCheck,
                    MarketResearch = request.MarketResearch,
                    Evaluation = request.Evaluation,
                    Recommendation = request.Recommendation,
                    Documents = request.Documents,
                    PitchDeck = request.PitchDeck,
                    UpdatedAt = inserted?.UpdatedAt ?? DateTime.UtcNow
                };

                return Ok(new
                {
                    message = "Workflow updated successfully",
                    data = responseDto
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database Error: {ex.Message}");
            }
        }

        // POST: api/StartupWorkflow/reset/{startupId}
        [HttpPost("reset/{startupId}")]
        public async Task<IActionResult> ResetProgress(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

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