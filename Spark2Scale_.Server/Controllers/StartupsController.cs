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
                founder_id = inserted.FounderId,
                created_at = inserted.CreatedAt
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetStartups([FromQuery] Guid? founderId)
        {
            // STEP 1: Get the Startups
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

            // STEP 2: Collect all Startup IDs
            var startupIds = startups.Select(s => s.Sid.ToString()).ToList();

            // STEP 3: Fetch ALL related PitchDecks and Workflows in PARALLEL (Batching)
            // Note: We use Filter with "in" operator to get all matching rows in one go
            var deckTask = _supabase.From<PitchDeck>()
                                    .Filter("startup_id", Supabase.Postgrest.Constants.Operator.In, startupIds)
                                    .Get();

            var workflowTask = _supabase.From<StartupWorkflow>()
                                        .Filter("startup_id", Supabase.Postgrest.Constants.Operator.In, startupIds)
                                        .Get();

            // Wait for both to finish simultaneously
            await Task.WhenAll(deckTask, workflowTask);

            var allDecks = deckTask.Result.Models;
            var allWorkflows = workflowTask.Result.Models;

            var responseList = new List<StartupDashboardDto>();

            // STEP 4: Join data in memory (Very Fast)
            foreach (var startup in startups)
            {
                // Find matching decks
                var myDecks = allDecks.Where(d => d.startup_id == startup.Sid);
                int totalLikes = myDecks.Sum(d => d.countlikes);

                // Find matching workflow
                var wf = allWorkflows.FirstOrDefault(w => w.StartupId == startup.Sid);

                int progressCount = 0;
                bool hasGap = false;

                if (wf != null)
                {
                    bool[] steps = { wf.IdeaCheck, wf.MarketResearch, wf.Evaluation, wf.Recommendation, wf.Documents, wf.PitchDeck };
                    bool hitFalse = false;
                    foreach (var step in steps)
                    {
                        if (step)
                        {
                            progressCount++;
                            if (hitFalse) hasGap = true;
                        }
                        else
                        {
                            hitFalse = true;
                        }
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
    }

    public class StartupDashboardDto : StartupResponseDto
    {
        public int total_likes { get; set; }
        public int progress_count { get; set; }
        public bool progress_has_gap { get; set; }
    }
}