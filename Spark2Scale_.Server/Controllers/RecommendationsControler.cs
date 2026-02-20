using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text.Json;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationsController : ControllerBase
    {
        private readonly Client _supabase;
        private readonly IHttpClientFactory _httpClientFactory;

        public RecommendationsController(Client supabase, IHttpClientFactory httpClientFactory)
        {
            _supabase = supabase;
            _httpClientFactory = httpClientFactory;
        }

        // GET: api/Recommendations/{startupId}/{type}
        // Uses raw HTTP to bypass Supabase C# model deserialization which strips unknown JSONB fields
        [HttpGet("{startupId}/{type}")]
        public async Task<IActionResult> GetRecommendations(string startupId, string type)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            try
            {
                var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
                var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY");

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", supabaseKey);
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                // Query Supabase REST API directly - returns raw JSON preserving all fields
                var url = $"{supabaseUrl}/rest/v1/recommendations?startup_id=eq.{sId}&type=eq.{type}&order=version.desc&select=*";
                var response = await client.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, "Failed to fetch from Supabase");
                }

                var json = await response.Content.ReadAsStringAsync();
                return new ContentResult
                {
                    Content = json,
                    ContentType = "application/json",
                    StatusCode = 200
                };
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching recommendations: {ex.Message}");
            }
        }

        // POST: api/Recommendations/save
        // Each call deletes the previous report and inserts a fresh one.
        // No versioning or iteration tracking — always a single current report per startup+type.
        [HttpPost("save")]
        public async Task<IActionResult> SaveRecommendation([FromBody] RecommendationInsertDto input)
        {
            try
            {
                // 1. Delete the previous report for this startup + type (replace, don't archive)
                await _supabase.From<Recommendation>()
                    .Where(x => x.StartupId == input.StartupId && x.Type == input.Type)
                    .Delete();

                // 2. Insert the new recommendation (always version 1, always current)
                var rec = new Recommendation
                {
                    StartupId = input.StartupId,
                    Type      = input.Type,
                    Content   = input.Content,
                    Version   = 1,
                    CreatedAt = DateTime.UtcNow,
                    IsCurrent = true
                };

                await _supabase.From<Recommendation>().Insert(rec);

                // 3. Sync json_response + current_iteration on the startups row so the
                //    frontend can read the latest output directly from the startup record.
                //    current_iteration is tracked in the DB (incremented on each save)
                //    but is not displayed as a visible version number in the UI.
                try
                {
                    // Read the current iteration value so we can increment it
                    var startupRow = await _supabase.From<Spark2Scale_.Server.Models.Startup>()
                        .Where(s => s.Sid == input.StartupId)
                        .Get();

                    int nextIteration = (startupRow.Models.FirstOrDefault()?.CurrentIteration ?? 0) + 1;

                    await _supabase.From<Spark2Scale_.Server.Models.Startup>()
                        .Where(s => s.Sid == input.StartupId)
                        .Set(s => s.JsonResponse,     input.Content)
                        .Set(s => s.CurrentIteration, nextIteration)
                        .Update();
                }
                catch (Exception syncEx)
                {
                    // Non-fatal: log but don't fail the whole request
                    Console.WriteLine($"[Recommendations/save] Warning – could not sync startup row: {syncEx.Message}");
                }

                return Ok(new { message = "Saved" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error saving recommendation: {ex.Message}");
            }
        }

        [HttpPost("archive/{startupId}")]
        public async Task<IActionResult> ArchiveRecommendations(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            try
            {
                // Sets is_current = false for all recommendations for this startup
                await _supabase.From<Recommendation>()
                    .Where(x => x.StartupId == sId)
                    .Set(x => x.IsCurrent, false)
                    .Update();

                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}
