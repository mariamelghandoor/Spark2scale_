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
        // Uses raw HTTP (same as GET) so that the JsonElement content is serialised
        // directly by System.Text.Json — this is the key fix: the Postgrest C# library
        // does NOT reliably store JsonElement as JSONB (it can come back as null).
        [HttpPost("save")]
        public async Task<IActionResult> SaveRecommendation([FromBody] RecommendationInsertDto input)
        {
            try
            {
                var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
                var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY");

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", supabaseKey);
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                // 1. Delete the previous report for this startup + type via raw HTTP
                var deleteUrl = $"{supabaseUrl}/rest/v1/recommendations" +
                                $"?startup_id=eq.{input.StartupId}" +
                                $"&type=eq.{Uri.EscapeDataString(input.Type)}";
                await client.DeleteAsync(deleteUrl);

                // 2. Insert the new recommendation via raw HTTP.
                //    System.Text.Json serialises JsonElement as its raw JSON value,
                //    so the 'content' column receives a proper JSONB object — not null.
                var insertPayload = new
                {
                    startup_id = input.StartupId,
                    type       = input.Type,
                    content    = input.Content,   // JsonElement → serialised as raw JSON inline
                    version    = 1,
                    created_at = DateTime.UtcNow.ToString("o"),
                    is_current = true
                };

                var bodyJson    = JsonSerializer.Serialize(insertPayload);
                var httpContent = new System.Net.Http.StringContent(
                                        bodyJson,
                                        System.Text.Encoding.UTF8,
                                        "application/json");

                client.DefaultRequestHeaders.TryAddWithoutValidation("Prefer", "return=minimal");

                var insertUrl      = $"{supabaseUrl}/rest/v1/recommendations";
                var insertResponse = await client.PostAsync(insertUrl, httpContent);

                if (!insertResponse.IsSuccessStatusCode)
                {
                    var errBody = await insertResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)insertResponse.StatusCode,
                                     $"Failed to insert recommendation: {errBody}");
                }

                // 3. Sync json_response + current_iteration on the startups row.
                //    Non-fatal — log a warning but never fail the whole request.
                try
                {
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
