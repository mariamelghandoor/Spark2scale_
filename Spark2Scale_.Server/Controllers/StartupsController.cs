using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StartupsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly Services.AccessControlService _access;

        // Excludes json_response to keep the Startup List/Dashboard snappy
        private const string SAFE_COLS = "sid,startupname,field,idea_description,region,startup_stage,founder_id,created_at,logo_path,current_iteration";

        public StartupsController(Supabase.Client supabase, Services.AccessControlService access)
        {
            _supabase = supabase;
            _access = access;
        }

        // ─────────────────────────────────────────────────────────────
        // Helper: Consistent Mapping
        // ─────────────────────────────────────────────────────────────
        private static StartupResponseDto ToDto(Startup s, string? role = null, object? safeJson = null) =>
            new StartupResponseDto
            {
                sid = s.Sid,
                startupname = s.StartupName,
                field = s.Field,
                idea_description = s.IdeaDescription,
                founder_id = s.FounderId,
                created_at = s.CreatedAt,
                current_iteration = s.CurrentIteration,
                region = s.Region,
                startup_stage = s.StartupStage,
                logo_path = s.LogoPath,
                current_role = role,
                json_response = safeJson ?? (s.JsonResponse.HasValue && s.JsonResponse.Value.ValueKind != JsonValueKind.Undefined ? s.JsonResponse.Value : null)
            };

        // ─────────────────────────────────────────────────────────────
        // POST api/Startups/add  <-- THIS WAS MISSING!
        // ─────────────────────────────────────────────────────────────
        [HttpPost("add")]
        public async Task<IActionResult> AddStartup([FromBody] StartupInsertDto input)
        {
            if (input == null || string.IsNullOrEmpty(input.startupname))
                return BadRequest("Startup Name is required.");

            try
            {
                // Safely parse the incoming JSON response from the frontend
                JsonNode finalJsonNode = new JsonObject();
                if (input.json_response != null)
                {
                    var rawJson = JsonSerializer.Serialize(input.json_response);
                    finalJsonNode = JsonNode.Parse(rawJson)?.AsObject() ?? new JsonObject();
                }

                // Use HttpClient to bypass ORM limitations for large JSONB inserts
                var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
                var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");

                var row = new JsonObject
                {
                    ["startupname"] = input.startupname,
                    ["field"] = input.field,
                    ["idea_description"] = input.idea_description,
                    ["region"] = input.region,
                    ["startup_stage"] = input.startup_stage,
                    ["founder_id"] = input.founder_id.ToString(),
                    ["logo_path"] = input.logo_path,
                    ["json_response"] = finalJsonNode,
                    ["current_iteration"] = 0
                };

                using var http = new HttpClient();
                http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                http.DefaultRequestHeaders.Add("Prefer", "return=representation");

                var content = new StringContent(row.ToJsonString(), Encoding.UTF8, "application/json");
                var httpResp = await http.PostAsync($"{supabaseUrl}/rest/v1/startups", content);

                if (!httpResp.IsSuccessStatusCode)
                {
                    var err = await httpResp.Content.ReadAsStringAsync();
                    return StatusCode((int)httpResp.StatusCode, $"Insert failed: {err}");
                }

                var respBody = await httpResp.Content.ReadAsStringAsync();
                var insertedJson = JsonNode.Parse(respBody)?[0]?.AsObject();

                if (insertedJson == null) return StatusCode(500, "Failed to parse insertion response.");

                var newSid = Guid.Parse(insertedJson["sid"]!.ToString());

                // Initialize Workflow silently
                try
                {
                    var defaultWorkflow = new StartupWorkflow { StartupId = newSid, UpdatedAt = DateTime.UtcNow };
                    await _supabase.From<StartupWorkflow>().Insert(defaultWorkflow);
                }
                catch (Exception wfEx) { Console.WriteLine($"Workflow Init Warning: {wfEx.Message}"); }

                return Ok(new StartupResponseDto
                {
                    sid = newSid,
                    startupname = input.startupname,
                    founder_id = input.founder_id,
                    created_at = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"AddStartup error: {ex.Message}");
            }
        }

        // ─────────────────────────────────────────────────────────────
        // GET api/Startups
        // ─────────────────────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetStartups([FromQuery] string? founderId, [FromQuery] string? contributorId)
        {
            try
            {
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                Guid? currentUserId = null;
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                {
                    try { var user = await _supabase.Auth.GetUser(authHeader.Replace("Bearer ", "").Trim()); currentUserId = user != null ? Guid.Parse(user.Id) : null; } catch { }
                }

                var query = _supabase.From<Startup>().Select(SAFE_COLS);

                if (!string.IsNullOrEmpty(founderId) && Guid.TryParse(founderId, out Guid fId))
                    query = query.Where(s => s.FounderId == fId);

                var result = await query.Get();

                var dtos = result.Models.Select(s => {
                    string? role = (currentUserId.HasValue && s.FounderId == currentUserId.Value) ? "Founder" : null;
                    return ToDto(s, role);
                }).ToList();

                return Ok(dtos);
            }
            catch (Exception ex) { return StatusCode(500, $"Error fetching startups: {ex.Message}"); }
        }

        // ─────────────────────────────────────────────────────────────
        // GET api/Startups/{id}
        // ─────────────────────────────────────────────────────────────
        [HttpGet("{id}")]
        public async Task<IActionResult> GetStartupById(string id)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest("Invalid ID format");

            try
            {
                var result = await _supabase.From<Startup>().Select(SAFE_COLS).Where(s => s.Sid == sId).Get();
                var startup = result.Models.FirstOrDefault();
                if (startup == null) return NotFound("Startup not found");

                // 👇 RESTORE ROLE CHECKING LOGIC 👇
                string? role = null;
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                {
                    try
                    {
                        var user = await _supabase.Auth.GetUser(authHeader.Replace("Bearer ", "").Trim());
                        if (user != null && Guid.TryParse(user.Id, out Guid currentUserId))
                        {
                            // If the current user matches the founder ID, assign Founder role
                            if (startup.FounderId == currentUserId) role = "Founder";
                            else role = "Contributor"; // Or fetch from StartupContributor table
                        }
                    }
                    catch { /* Ignore expired tokens */ }
                }

                // Safely fetch JSON via HttpClient
                object? safeJsonData = null;
                try
                {
                    var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
                    var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");
                    using var http = new HttpClient();
                    http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    var rawRes = await http.GetAsync($"{supabaseUrl}/rest/v1/startups?select=json_response&sid=eq.{sId}");

                    if (rawRes.IsSuccessStatusCode)
                    {
                        var body = await rawRes.Content.ReadAsStringAsync();
                        var array = JsonNode.Parse(body)?.AsArray();
                        if (array != null && array.Count > 0) safeJsonData = array[0]["json_response"];
                    }
                }
                catch { /* log error but continue */ }

                // 👇 PASS THE ROLE TO THE DTO 👇
                return Ok(ToDto(startup, role, safeJsonData));
            }
            catch (Exception ex) { return StatusCode(500, $"Error: {ex.Message}"); }
        }

        // ─────────────────────────────────────────────────────────────
        // PUT /recommendation
        // ─────────────────────────────────────────────────────────────
        [HttpPut("{id}/recommendation")]
        public async Task<IActionResult> UpdateRecommendationData(string id, [FromBody] StartupRecommendationUpdateDto input)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest();

            await _supabase.From<Startup>()
                .Where(s => s.Sid == sId)
                .Set(s => s.JsonResponse, input.JsonResponse)
                .Set(s => s.CurrentIteration, input.CurrentIteration)
                .Update();

            return Ok(new { message = "Recommendation saved.", iteration = input.CurrentIteration });
        }
    }
}