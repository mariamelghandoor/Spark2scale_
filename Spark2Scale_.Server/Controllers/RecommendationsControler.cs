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
    public class RecommendationsController : ControllerBase
    {
        private readonly Client _supabase;

        public RecommendationsController(Client supabase)
        {
            _supabase = supabase;
        }

        // GET: api/Recommendations/{startupId}/{type}
        [HttpGet("{startupId}/{type}")]
        public async Task<IActionResult> GetRecommendations(string startupId, string type)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            var result = await _supabase.From<Recommendation>()
                .Where(x => x.StartupId == sId && x.Type == type && x.IsCurrent == true) // <--- ADD THIS FILTER
                .Order("version", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            // --- FIX IS HERE: Map to anonymous object ---
            var dtos = result.Models.Select(r => new
            {
                rid = r.Rid,
                startup_id = r.StartupId,
                type = r.Type,
                content = r.Content, // This class serializes perfectly fine
                version = r.Version,
                created_at = r.CreatedAt
            });

            return Ok(dtos);
        }

        // POST: api/Recommendations/save
        [HttpPost("save")]
        public async Task<IActionResult> SaveRecommendation([FromBody] RecommendationInsertDto input)
        {
            try
            {
                // 1. Calculate Version
                var existing = await _supabase.From<Recommendation>()
                    .Where(x => x.StartupId == input.StartupId && x.Type == input.Type)
                    .Order("version", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Limit(1)
                    .Get();

                int nextVersion = 1;
                if (existing.Models.Any())
                {
                    nextVersion = existing.Models.First().Version + 1;
                }

                // 2. Create Recommendation
                var rec = new Recommendation
                {
                    StartupId = input.StartupId,
                    Type = input.Type,
                    Content = input.Content,
                    Version = nextVersion,
                    CreatedAt = DateTime.UtcNow
                };

                await _supabase.From<Recommendation>().Insert(rec);

                return Ok(new { message = "Saved", version = nextVersion });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error saving recommendation: {ex.Message}");
            }
        }
    }
}