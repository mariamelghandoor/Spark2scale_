using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
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
        private const string SAFE_COLS = "sid,startupname,field,idea_description,region,startup_stage,founder_id,created_at";
        public StartupsController(Supabase.Client supabase, Services.AccessControlService access)
        {
            _supabase = supabase;
            _access   = access;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddStartup([FromBody] StartupInsertDto input)
        {
            if (input == null || string.IsNullOrEmpty(input.startupname))
                return BadRequest("Startup Name is required.");

            try
            {
                // 1. Fetch founder details
                var userResponse = await _supabase.From<User>()
                    .Where(u => u.uid == input.founder_id)
                    .Get();
                var currentUser = userResponse.Models.FirstOrDefault();

                // 2. Build the JsonNode — stays as JsonNode, never converted to string
                JsonNode finalJsonNode = new JsonObject();

                if (input.json_response != null)
                {
                    var rawJson = JsonSerializer.Serialize(input.json_response);
                    var jsonNode = JsonNode.Parse(rawJson)?.AsObject();

                    if (jsonNode != null)
                    {
                        if (currentUser != null)
                        {
                            var founderData = new JsonObject
                            {
                                ["name"]  = $"{currentUser.fname} {currentUser.lname}".Trim(),
                                ["email"] = currentUser.email,
                                ["role"]  = "Founder"
                            };
                            var eval = jsonNode["startup_evaluation"]?.AsObject();
                            if (eval != null) eval["founder_verified"] = founderData;
                            else jsonNode["founder_verified"] = founderData;
                        }
                        finalJsonNode = jsonNode;
                    }
                }

                // 3. Resolve Supabase URL + key — tries every common config pattern
                // Read directly from .env / environment variables
                var supabaseUrl = Environment.GetEnvironmentVariable("URL")
                               ?? Environment.GetEnvironmentVariable("SUPABASE_URL");

                var supabaseKey = Environment.GetEnvironmentVariable("KEY")
                               ?? Environment.GetEnvironmentVariable("SUPABASE_KEY");

                if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
                    return StatusCode(500,
                        "Server configuration error: Supabase URL or Key not found. " +
                        "Add 'Supabase:Url' and 'Supabase:Key' to appsettings.json.");

                // 4. POST directly to PostgREST so json_response is sent as a JSON
                //    object — not a quoted string. The Supabase C# ORM always wraps
                //    string properties in quotes before sending, which causes jsonb
                //    columns to store an escaped string instead of a native object.
                var row = new JsonObject
                {
                    ["startupname"]      = input.startupname,
                    ["field"]            = input.field,
                    ["idea_description"] = input.idea_description,
                    ["region"]           = input.region,
                    ["startup_stage"]    = input.startup_stage,
                    ["founder_id"]       = input.founder_id.ToString(),
                    ["json_response"]    = finalJsonNode   // JsonNode → proper JSON object
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
                    return StatusCode((int)httpResp.StatusCode, $"PostgREST insert failed: {err}");
                }

                var respBody = await httpResp.Content.ReadAsStringAsync();
                var inserted = JsonNode.Parse(respBody)?[0]?.AsObject();
                if (inserted == null)
                    return StatusCode(500, "Insert succeeded but response could not be parsed.");

                return Ok(new StartupResponseDto
                {
                    sid           = Guid.Parse(inserted["sid"]!.ToString()),
                    startupname   = inserted["startupname"]?.ToString() ?? input.startupname,
                    field         = inserted["field"]?.ToString(),
                    region        = inserted["region"]?.ToString(),
                    startup_stage = inserted["startup_stage"]?.ToString(),
                    founder_id    = input.founder_id,
                    created_at    = DateTime.TryParse(inserted["created_at"]?.ToString(), out var dt)
                                        ? dt : DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                // Surface the real error message so you can diagnose quickly
                return StatusCode(500, $"AddStartup error: {ex.Message}\n{ex.InnerException?.Message}");
            }
        }


        // GET: api/startups
        [HttpGet]
        public async Task<IActionResult> GetStartups([FromQuery] string? founderId, [FromQuery] string? contributorId)
        {
            

            try
            {
                if (!string.IsNullOrEmpty(founderId) && Guid.TryParse(founderId, out Guid fId))
                {
                    var result = await _supabase.From<Startup>()
                        .Select(SAFE_COLS)
                        .Where(s => s.FounderId == fId)
                        .Get();

                    var dtos = result.Models.Select(s => new StartupResponseDto
                    {
                        sid = s.Sid,
                        startupname = s.StartupName,
                        field = s.Field,
                        idea_description = s.IdeaDescription,
                        region = s.Region,
                        startup_stage = s.StartupStage,
                        founder_id = s.FounderId,
                        created_at = s.CreatedAt
                    }).ToList();

                    return Ok(dtos);
                }
                else if (!string.IsNullOrEmpty(contributorId) && Guid.TryParse(contributorId, out Guid cId))
                {
                    var links = await _supabase.From<Contributor>()
                       .Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, cId.ToString())
                       .Get();

                    var startupIds = links.Models
                        .Where(x => x.startup_id != null)
                        .Select(x => x.startup_id.Value.ToString())
                        .ToList();

                    if (!startupIds.Any()) return Ok(new List<StartupResponseDto>());

                    var result = await _supabase.From<Startup>()
                       .Select(SAFE_COLS)
                       .Filter("sid", Supabase.Postgrest.Constants.Operator.In, startupIds)
                       .Get();

                    var dtos = result.Models.Select(s => new StartupResponseDto
                    {
                        sid = s.Sid,
                        startupname = s.StartupName,
                        field = s.Field,
                        idea_description = s.IdeaDescription,
                        region = s.Region,
                        startup_stage = s.StartupStage,
                        founder_id = s.FounderId,
                        created_at = s.CreatedAt
                    }).ToList();

                    return Ok(dtos);
                }
                else
                {
                    var result = await _supabase.From<Startup>().Select(SAFE_COLS).Get();
                    var dtos = new List<StartupResponseDto>();

                    Guid? currentUserId = null;
                    var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                    {
                        var token = authHeader.Substring("Bearer ".Length).Trim();
                        try
                        {
                            var user = await _supabase.Auth.GetUser(token);
                            if (user != null && Guid.TryParse(user.Id, out Guid uid)) currentUserId = uid;
                        }
                        catch { }
                    }

                    foreach (var s in result.Models)
                    {
                        string? role = null;
                        if (currentUserId.HasValue)
                        {
                            if (s.FounderId == currentUserId.Value) role = "Founder";
                            else
                            {
                                var contrib = await _supabase.From<StartupContributor>()
                                    .Match(new Dictionary<string, string> {
                                        { "startup_id", s.Sid.ToString() },
                                        { "contributor_id", currentUserId.Value.ToString() }
                                    }).Get();
                                if (contrib.Models.Any()) role = contrib.Models.First().Role ?? "Contributor";
                            }
                        }

                        dtos.Add(new StartupResponseDto
                        {
                            sid = s.Sid,
                            startupname = s.StartupName,
                            field = s.Field,
                            idea_description = s.IdeaDescription,
                            region = s.Region,
                            startup_stage = s.StartupStage,
                            founder_id = s.FounderId,
                            created_at = s.CreatedAt,
                            current_role = role
                        });
                    }

                    return Ok(dtos);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching startups: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetStartupById(string id)
        {
            if (!Guid.TryParse(id, out Guid sId))
                return BadRequest("Invalid ID format");

            try
            {
                var result = await _supabase.From<Startup>()
                    .Select(SAFE_COLS)
                    .Where(s => s.Sid == sId)
                    .Get();

                var startup = result.Models.FirstOrDefault();
                if (startup == null) return NotFound("Startup not found");

                string? role = null;
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                {
                    var token = authHeader.Substring("Bearer ".Length).Trim();
                    try
                    {
                        var user = await _supabase.Auth.GetUser(token);
                        if (user != null && Guid.TryParse(user.Id, out Guid currentUserId))
                        {
                            if (startup.FounderId == currentUserId)
                            {
                                role = "Founder";
                            }
                            else
                            {
                                var contrib = await _supabase.From<StartupContributor>()
                                    .Match(new Dictionary<string, string> {
                                        { "startup_id", sId.ToString() },
                                        { "contributor_id", currentUserId.ToString() }
                                    }).Get();
                                if (contrib.Models.Any()) role = contrib.Models.First().Role ?? "Contributor";
                            }
                        }
                    }
                    catch { }
                }

                var response = new StartupResponseDto
                {
                    sid = startup.Sid,
                    startupname = startup.StartupName,
                    field = startup.Field,
                    idea_description = startup.IdeaDescription,
                    region = startup.Region,
                    startup_stage = startup.StartupStage,
                    founder_id = startup.FounderId,
                    created_at = startup.CreatedAt,
                    current_role = role
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
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
                var token = Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");

                if (string.IsNullOrEmpty(token))
                    return Unauthorized("Missing authorization token.");

                if (!await _access.IsFounderOrOwner(token, sId))
                    return StatusCode(403, "Only the Founder can update the idea.");

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
                return StatusCode(500, $"Error updating idea: {ex.Message}");
            }
        }

        [HttpPut("update-json/{id}")]
        public async Task<IActionResult> UpdateJsonResponse(string id, [FromBody] JsonUpdateDto input)
        {
            if (!Guid.TryParse(id, out Guid sId))
                return BadRequest("Invalid ID format");

            try
            {
                var supabaseUrl = Environment.GetEnvironmentVariable("URL") ?? Environment.GetEnvironmentVariable("SUPABASE_URL");
                var supabaseKey = Environment.GetEnvironmentVariable("KEY") ?? Environment.GetEnvironmentVariable("SUPABASE_KEY");

                var row = new JsonObject
                {
                    ["json_response"] = JsonNode.Parse(JsonSerializer.Serialize(input.JsonResponse))
                };

                using var http = new HttpClient();
                http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                http.DefaultRequestHeaders.Add("Prefer", "return=representation");

                var content = new StringContent(row.ToJsonString(), Encoding.UTF8, "application/json");
                var resp = await http.PatchAsync($"{supabaseUrl}/rest/v1/startups?sid=eq.{sId}", content);

                if (!resp.IsSuccessStatusCode)
                {
                    var err = await resp.Content.ReadAsStringAsync();
                    return StatusCode((int)resp.StatusCode, $"Failed to update: {err}");
                }

                return Ok(new { message = "Startup JSON updated successfully", id = sId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // DTO
        public class JsonUpdateDto
        {
            public object JsonResponse { get; set; }
        }
    }


}
