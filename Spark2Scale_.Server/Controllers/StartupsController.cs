using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StartupsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public StartupsController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // POST: api/startups/add
        [HttpPost("add")]
        public async Task<IActionResult> AddStartup([FromBody] StartupInsertDto input)
        {
            if (input == null || string.IsNullOrEmpty(input.startupname))
                return BadRequest("Startup Name is required.");

            var newStartup = new Startup
            {
                StartupName = input.startupname,
                Field = input.field,
                IdeaDescription = input.idea_description,

                Region = input.region,
                StartupStage = input.startup_stage,

                FounderId = input.founder_id,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _supabase.From<Startup>().Insert(newStartup);
            var inserted = result.Models.FirstOrDefault();

            if (inserted == null) return StatusCode(500, "Failed to insert startup");

            // Create empty workflow
            try
            {
                var workflow = new StartupWorkflow { StartupId = inserted.Sid, UpdatedAt = DateTime.UtcNow };
                await _supabase.From<StartupWorkflow>().Insert(workflow);
            }
            catch { }

            return Ok(new StartupResponseDto
            {
                sid = inserted.Sid,
                startupname = inserted.StartupName,
                field = inserted.Field,
                idea_description = inserted.IdeaDescription,
                region = inserted.Region,
                startup_stage = inserted.StartupStage,
                founder_id = inserted.FounderId,
                created_at = inserted.CreatedAt
            });
        }

        // GET: api/startups/dashboard
        // RENAMED: This is the complex function for the Dashboard (with likes & progress)
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard([FromQuery] Guid? founderId)
        {
            // 1. Get Startups
            Supabase.Postgrest.Responses.ModeledResponse<Startup> startupResult;

            if (founderId.HasValue)
            {
                startupResult = await _supabase.From<Startup>()
                    .Filter("founder_id", Supabase.Postgrest.Constants.Operator.Equals, founderId.Value.ToString())
                    .Get();
            }
            else
            {
                startupResult = await _supabase.From<Startup>().Get();
            }

            var startups = startupResult.Models;
            if (!startups.Any()) return Ok(new List<StartupDashboardDto>());

            // 2. Collect IDs
            var startupIds = startups.Select(s => s.Sid.ToString()).ToList();

            // 3. Fetch Details
            var deckTask = _supabase.From<PitchDeck>()
                                    .Filter("startup_id", Supabase.Postgrest.Constants.Operator.In, startupIds)
                                    .Get();

            var workflowTask = _supabase.From<StartupWorkflow>()
                                        .Filter("startup_id", Supabase.Postgrest.Constants.Operator.In, startupIds)
                                        .Get();

            await Task.WhenAll(deckTask, workflowTask);

            var allDecks = deckTask.Result.Models;
            var allWorkflows = workflowTask.Result.Models;

            var responseList = new List<StartupDashboardDto>();

            // 4. Join Data
            foreach (var startup in startups)
            {
                var myDecks = allDecks.Where(d => d.startup_id == startup.Sid);
                int totalLikes = myDecks.Sum(d => d.countlikes);

                var wf = allWorkflows.FirstOrDefault(w => w.StartupId == startup.Sid);
                int progressCount = 0;
                bool hasGap = false;

                if (wf != null)
                {
                    bool[] steps = { wf.IdeaCheck, wf.MarketResearch, wf.Evaluation, wf.Recommendation, wf.Documents, wf.PitchDeck };
                    bool hitFalse = false;
                    foreach (var step in steps)
                    {
                        if (step) { progressCount++; if (hitFalse) hasGap = true; }
                        else { hitFalse = true; }
                    }
                }

                responseList.Add(new StartupDashboardDto
                {
                    sid = startup.Sid,
                    startupname = startup.StartupName,
                    field = startup.Field,
                    idea_description = startup.IdeaDescription,
                    founder_id = startup.FounderId,
                    created_at = startup.CreatedAt,
                    total_likes = totalLikes,
                    progress_count = progressCount,
                    progress_has_gap = hasGap
                });
            }

            return Ok(responseList);
        }

        // GET: api/startups
        // SIMPLE: This returns just the basic list (good for dropdowns or admin)
        [HttpGet]
        public async Task<IActionResult> GetStartups()
        {
            var result = await _supabase.From<Startup>().Get();

            var dtos = result.Models.Select(s => new StartupResponseDto
            {
                sid = s.Sid,
                startupname = s.StartupName,
                field = s.Field,
                idea_description = s.IdeaDescription,
                founder_id = s.FounderId,
                created_at = s.CreatedAt
            }).ToList();

            return Ok(dtos);
        }

        // GET: api/startups/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetStartup(Guid id)
        {
            var result = await _supabase.From<Startup>()
                .Where(x => x.Sid == id)
                .Get();

            var startup = result.Models.FirstOrDefault();

            if (startup == null) return NotFound();

            return Ok(new StartupResponseDto
            {
                sid = startup.Sid,
                startupname = startup.StartupName,
                field = startup.Field,
                idea_description = startup.IdeaDescription,
                founder_id = startup.FounderId,
                created_at = startup.CreatedAt,
            });


        }
        [HttpPut("update-idea/{id}")]
        public async Task<IActionResult> UpdateIdea(string id, [FromBody] IdeaUpdateDto input)
        {
            if (!Guid.TryParse(id, out Guid sId))
                return BadRequest("Invalid ID format");

            if (string.IsNullOrWhiteSpace(input.IdeaDescription))
                return BadRequest("Idea description cannot be empty");

            try
            {

                var parameters = new Dictionary<string, object>
         {
             { "p_startup_id", sId },
             { "p_new_idea", input.IdeaDescription }
         };

                await _supabase.Rpc("update_idea_and_reset", parameters);

                return Ok(new
                {
                    message = "Idea updated, history archived, and workflow reset successfully.",
                    idea = input.IdeaDescription
                });
            }
            catch (Exception ex)
            {
                // Log the error here if you have a logger
                return StatusCode(500, $"Error updating idea: {ex.Message}");
            }
        }
    }



    public class StartupDashboardDto : StartupResponseDto
    {
        public int total_likes { get; set; }
        public int progress_count { get; set; }
        public bool progress_has_gap { get; set; }
    }
}