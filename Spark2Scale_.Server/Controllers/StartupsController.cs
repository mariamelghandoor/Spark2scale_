using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

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
                // If safeJson (from HttpClient) is provided, use it. Otherwise fall back to ORM data.
                json_response = safeJson ?? (s.JsonResponse.HasValue && s.JsonResponse.Value.ValueKind != JsonValueKind.Undefined ? s.JsonResponse.Value : null)
            };

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

                // Logic for contributor search remains consistent
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
        // GET api/Startups/{id} (Safe JSON bypass)
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

                // Safely fetch JSON via HttpClient
                object? safeJsonData = null;
                try
                {
                    var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
                    var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY");
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

                return Ok(ToDto(startup, null, safeJsonData));
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