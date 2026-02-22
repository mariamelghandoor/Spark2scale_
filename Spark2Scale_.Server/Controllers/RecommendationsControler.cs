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
        // Keeps ALL historical recommendations for this startup (no delete).
        // Finds the current max version and inserts with version + 1.
        // Uses raw HTTP so that JsonElement is serialised correctly into JSONB.
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

                // 1. Find the current max version so we can insert version + 1
                int nextVersion = 1;
                try
                {
                    var versionUrl = $"{supabaseUrl}/rest/v1/recommendations" +
                                     $"?startup_id=eq.{input.StartupId}" +
                                     $"&type=eq.{Uri.EscapeDataString(input.Type)}" +
                                     $"&select=version&order=version.desc&limit=1";
                    var versionResp = await client.GetAsync(versionUrl);
                    if (versionResp.IsSuccessStatusCode)
                    {
                        var versionJson = await versionResp.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(versionJson);
                        var arr = doc.RootElement;
                        if (arr.ValueKind == JsonValueKind.Array && arr.GetArrayLength() > 0)
                            nextVersion = arr[0].GetProperty("version").GetInt32() + 1;
                    }
                }
                catch { /* non-fatal — defaults to version 1 */ }

                // 2. Insert the new recommendation (history preserved).
                var insertPayload = new
                {
                    startup_id = input.StartupId,
                    type       = input.Type,
                    content    = input.Content,   // JsonElement → raw JSONB
                    version    = nextVersion,
                    created_at = DateTime.UtcNow.ToString("o"),
                    is_current = true
                };

                var bodyJson    = JsonSerializer.Serialize(insertPayload);
                var httpContent = new System.Net.Http.StringContent(
                                        bodyJson,
                                        System.Text.Encoding.UTF8,
                                        "application/json");

                client.DefaultRequestHeaders.TryAddWithoutValidation("Prefer", "return=representation");

                var insertUrl      = $"{supabaseUrl}/rest/v1/recommendations";
                var insertResponse = await client.PostAsync(insertUrl, httpContent);

                if (!insertResponse.IsSuccessStatusCode)
                {
                    var errBody = await insertResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)insertResponse.StatusCode,
                                     $"Failed to insert recommendation: {errBody}");
                }

                // 3. Sync json_response + current_iteration on the startups row (non-fatal).
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

                // Return the inserted row's rid so the frontend can show a delete button
                var insertedJson = await insertResponse.Content.ReadAsStringAsync();
                return new ContentResult { Content = insertedJson, ContentType = "application/json", StatusCode = 200 };
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error saving recommendation: {ex.Message}");
            }
        }

        // DELETE: api/Recommendations/delete/{rid}
        // Removes a single recommendation record by its primary key.
        [HttpDelete("delete/{rid}")]
        public async Task<IActionResult> DeleteRecommendation(string rid)
        {
            if (!Guid.TryParse(rid, out _)) return BadRequest("Invalid recommendation ID");

            try
            {
                var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
                var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY");

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", supabaseKey);
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                var url    = $"{supabaseUrl}/rest/v1/recommendations?rid=eq.{rid}";
                var result = await client.DeleteAsync(url);

                if (!result.IsSuccessStatusCode)
                {
                    var err = await result.Content.ReadAsStringAsync();
                    return StatusCode((int)result.StatusCode, $"Delete failed: {err}");
                }

                return Ok(new { message = "Deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error deleting recommendation: {ex.Message}");
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
