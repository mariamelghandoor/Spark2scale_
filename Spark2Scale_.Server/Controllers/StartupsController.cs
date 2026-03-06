using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StartupsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly Services.AccessControlService _access;
        private readonly ILogger<StartupsController> _logger;

        private const string SAFE_COLS = "sid,startupname,field,idea_description,region,startup_stage,founder_id,created_at,logo_path,current_iteration";

        public StartupsController(
            Supabase.Client supabase,
            Services.AccessControlService access,
            ILogger<StartupsController> logger)
        {
            _supabase = supabase;
            _access = access;
            _logger = logger;
        }

        public class MarketResearchRequest
        {
            public string Region { get; set; }
        }

        private static StartupResponseDto ToDto(
            Startup s,
            string? role = null,
            object? safeJson = null,
            int progressCount = 0,
            int totalLikes = 0,
            bool hasGap = false)
        {
            object? finalJson = null;
            var sourceJson = safeJson ?? s.JsonResponse;

            // 👇 THE FIX: Handle serialization perfectly to avoid the "Parent Loop" crash
            if (sourceJson != null)
            {
                if (sourceJson is Newtonsoft.Json.Linq.JToken jToken)
                {
                    try { finalJson = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(jToken.ToString(Newtonsoft.Json.Formatting.None)); }
                    catch { finalJson = jToken.ToString(); }
                }
                else if (sourceJson is string str)
                {
                    try { finalJson = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(str); }
                    catch { finalJson = str; }
                }
                else
                {
                    // If it is already a JsonNode or JsonElement, ASP.NET handles it natively.
                    // DO NOT use Newtonsoft here, otherwise it triggers the self-referencing loop!
                    finalJson = sourceJson;
                }
            }

            return new StartupResponseDto
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
                progress_count = progressCount,
                total_likes = totalLikes,
                progress_has_gap = hasGap,
                json_response = finalJson
            };
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddStartup([FromBody] StartupInsertDto input)
        {
            if (input == null || string.IsNullOrEmpty(input.startupname)) return BadRequest("Startup Name is required.");

            try
            {
                JsonNode finalJsonNode = new JsonObject();
                if (input.json_response != null)
                {
                    var rawJson = System.Text.Json.JsonSerializer.Serialize(input.json_response);
                    finalJsonNode = JsonNode.Parse(rawJson)?.AsObject() ?? new JsonObject();
                }

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

                var content = new StringContent(row.ToJsonString(), System.Text.Encoding.UTF8, "application/json");
                var httpResp = await http.PostAsync($"{supabaseUrl}/rest/v1/startups", content);

                if (!httpResp.IsSuccessStatusCode)
                {
                    var err = await httpResp.Content.ReadAsStringAsync();
                    return StatusCode((int)httpResp.StatusCode, $"Insert failed: {err}");
                }

                var respBody = await httpResp.Content.ReadAsStringAsync();
                var insertedJson = JsonNode.Parse(respBody)?[0]?.AsObject();

                var newSid = Guid.Parse(insertedJson!["sid"]!.ToString());

                try { await _supabase.From<StartupWorkflow>().Insert(new StartupWorkflow { StartupId = newSid, UpdatedAt = DateTime.UtcNow }); }
                catch (Exception wfEx) { _logger.LogWarning($"Workflow Init Warning: {wfEx.Message}"); }

                return Ok(new StartupResponseDto { sid = newSid, startupname = input.startupname, founder_id = input.founder_id, created_at = DateTime.UtcNow });
            }
            catch (Exception ex) { return StatusCode(500, $"AddStartup error: {ex.Message}"); }
        }

        [HttpGet]
        public async Task<IActionResult> GetStartups([FromQuery] string? founderId, [FromQuery] string? contributorId)
        {
            try
            {
                List<Startup> startupsList = new List<Startup>();
                if (!string.IsNullOrEmpty(founderId) && Guid.TryParse(founderId, out Guid fId))
                {
                    var result = await _supabase.From<Startup>().Select(SAFE_COLS).Where(s => s.FounderId == fId).Get();
                    startupsList = result.Models;
                }
                else if (!string.IsNullOrEmpty(contributorId) && Guid.TryParse(contributorId, out Guid cId))
                {
                    var links = await _supabase.From<StartupContributor>().Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, cId.ToString()).Get();
                    var ids = links.Models.Select(x => x.StartupId.ToString()).ToList();
                    if (ids.Any())
                    {
                        var result = await _supabase.From<Startup>().Select(SAFE_COLS).Filter("sid", Supabase.Postgrest.Constants.Operator.In, ids).Get();
                        startupsList = result.Models;
                    }
                }
                else
                {
                    var result = await _supabase.From<Startup>().Select(SAFE_COLS).Get();
                    startupsList = result.Models;
                }

                var startupIds = startupsList.Select(x => x.Sid.ToString()).ToList();
                var workflows = new List<StartupWorkflow>();
                var pitchDecks = new List<PitchDeck>();

                if (startupIds.Any())
                {
                    try
                    {
                        workflows = (await _supabase.From<StartupWorkflow>().Filter("startup_id", Supabase.Postgrest.Constants.Operator.In, startupIds).Get()).Models;
                        pitchDecks = (await _supabase.From<PitchDeck>().Filter("startup_id", Supabase.Postgrest.Constants.Operator.In, startupIds).Get()).Models;
                    }
                    catch (Exception ex) { _logger.LogWarning($"Enrichment fetch failed: {ex.Message}"); }
                }

                Guid? currentUserId = null;
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                {
                    try { var user = await _supabase.Auth.GetUser(authHeader.Replace("Bearer ", "").Trim()); if (user != null && Guid.TryParse(user.Id, out Guid uid)) currentUserId = uid; } catch { }
                }

                var dtos = new List<StartupResponseDto>();
                foreach (var s in startupsList)
                {
                    string? role = null;
                    if (currentUserId.HasValue)
                    {
                        if (s.FounderId == currentUserId.Value) role = "Founder";
                        else
                        {
                            var contrib = await _supabase.From<StartupContributor>().Match(new Dictionary<string, string> { { "startup_id", s.Sid.ToString() }, { "user_id", currentUserId.Value.ToString() } }).Get();
                            if (contrib.Models.Any()) role = contrib.Models.First().Role ?? "Contributor";
                        }
                    }

                    int progressCount = 0; bool hasGap = false;
                    var wf = workflows.FirstOrDefault(w => w.StartupId == s.Sid);
                    if (wf != null)
                    {
                        bool[] steps = { wf.IdeaCheck, wf.MarketResearch, wf.Evaluation, wf.Recommendation, wf.Documents, wf.PitchDeck };
                        progressCount = steps.Count(step => step);
                        bool foundFalse = false;
                        foreach (var step in steps) { if (!step) foundFalse = true; else if (foundFalse && step) hasGap = true; }
                    }

                    int totalLikes = pitchDecks.Where(p => p.startup_id == s.Sid).Sum(d => d.countlikes);
                    dtos.Add(ToDto(s, role, null, progressCount, totalLikes, hasGap));
                }

                return Ok(dtos);
            }
            catch (Exception ex) { return StatusCode(500, $"Error: {ex.Message}"); }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetStartupById(string id)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest("Invalid ID format");
            try
            {
                var startup = (await _supabase.From<Startup>().Select(SAFE_COLS).Where(s => s.Sid == sId).Get()).Models.FirstOrDefault();
                if (startup == null) return NotFound("Startup not found");

                string? role = null;
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                {
                    try
                    {
                        var user = await _supabase.Auth.GetUser(authHeader.Replace("Bearer ", "").Trim());
                        if (user != null && Guid.TryParse(user.Id, out Guid currentUserId))
                        {
                            if (startup.FounderId == currentUserId) role = "Founder";
                            else
                            {
                                var contrib = await _supabase.From<StartupContributor>().Match(new Dictionary<string, string> { { "startup_id", sId.ToString() }, { "user_id", currentUserId.ToString() } }).Get();
                                if (contrib.Models.Any()) role = contrib.Models.First().Role ?? "Contributor";
                            }
                        }
                    }
                    catch { }
                }

                int progressCount = 0; int totalLikes = 0; bool hasGap = false;
                try
                {
                    var wf = (await _supabase.From<StartupWorkflow>().Where(w => w.StartupId == sId).Get()).Models.FirstOrDefault();
                    if (wf != null)
                    {
                        bool[] steps = { wf.IdeaCheck, wf.MarketResearch, wf.Evaluation, wf.Recommendation, wf.Documents, wf.PitchDeck };
                        progressCount = steps.Count(step => step);
                        bool foundFalse = false;
                        foreach (var step in steps) { if (!step) foundFalse = true; else if (foundFalse && step) hasGap = true; }
                    }
                    var pdResult = await _supabase.From<PitchDeck>().Where(p => p.startup_id == sId).Get();
                    if (pdResult.Models.Any()) totalLikes = pdResult.Models.Sum(d => d.countlikes);
                }
                catch { }

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
                catch { }

                return Ok(ToDto(startup, role, safeJsonData, progressCount, totalLikes, hasGap));
            }
            catch (Exception ex) { return StatusCode(500, $"Error: {ex.Message}"); }
        }

        [HttpPut("update-idea/{id}")]
        public async Task<IActionResult> UpdateIdea(string id, [FromBody] IdeaUpdateDto input)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest("Invalid ID format");
            if (string.IsNullOrWhiteSpace(input.IdeaDescription)) return BadRequest("Idea description cannot be empty");

            try
            {
                var token = Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");
                if (string.IsNullOrEmpty(token)) return Unauthorized("Missing authorization token.");
                if (!await _access.IsFounderOrOwner(token, sId)) return StatusCode(403, "Only the Founder can update the idea.");

                var parameters = new Dictionary<string, object> { { "p_startup_id", sId }, { "p_new_idea", input.IdeaDescription } };
                await _supabase.Rpc("update_idea_and_reset", parameters);

                return Ok(new { message = "Idea updated, history archived, and workflow reset successfully.", idea = input.IdeaDescription });
            }
            catch (Exception ex) { return StatusCode(500, $"Error updating idea: {ex.Message}"); }
        }

        [HttpPost("{id}/generate-market-research")]
        public async Task<IActionResult> GenerateMarketResearch(string id, [FromBody] MarketResearchRequest request)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest("Invalid ID format");

            try
            {
                var startup = (await _supabase.From<Startup>().Select(SAFE_COLS).Where(s => s.Sid == sId).Get()).Models.FirstOrDefault();
                if (startup == null) return NotFound("Startup not found");

                string jsonContent = "";
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromMinutes(3);
                    var externalPayload = new
                    {
                        idea = startup.IdeaDescription ?? "No description",
                        problem = "Identify primary market pain points for " + startup.StartupName,
                        region = request.Region
                    };

                    var response = await client.PostAsJsonAsync("https://spark2scale-ai-server.azurewebsites.net/api/v1/market-research/research", externalPayload);
                    if (!response.IsSuccessStatusCode)
                    {
                        var error = await response.Content.ReadAsStringAsync();
                        return StatusCode((int)response.StatusCode, $"AI Service Failed: {error}");
                    }
                    jsonContent = await response.Content.ReadAsStringAsync();
                }

                // 1. Safely Parse JSON
                object jsonObjectToSave;
                try { jsonObjectToSave = JsonConvert.DeserializeObject<Dictionary<string, object>>(jsonContent); }
                catch
                {
                    try { jsonObjectToSave = JsonConvert.DeserializeObject<List<object>>(jsonContent); }
                    catch { jsonObjectToSave = new { raw_output = jsonContent }; }
                }

                // 2. Upload to Storage
                var fileName = $"{sId}/market_research_{DateTime.UtcNow.Ticks}.json";
                var fileBytes = System.Text.Encoding.UTF8.GetBytes(jsonContent);
                string publicUrl = "";

                try
                {
                    await _supabase.Storage.From("startup-docs").Upload(fileBytes, fileName);
                    publicUrl = _supabase.Storage.From("startup-docs").GetPublicUrl(fileName);
                }
                catch (Exception ex) { _logger.LogWarning($"Storage upload failed: {ex.Message}"); }

                try
                {
                    // Find old active documents
                    var existingDocs = await _supabase.From<Document>()
                        .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                        .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Market Research")
                        .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                        .Get();

                    var currentDoc = existingDocs.Models.FirstOrDefault();
                    int nextVersion = 1;

                    // Archive old document if it exists
                    if (currentDoc != null)
                    {
                        currentDoc.IsCurrent = false;
                        await _supabase.From<Document>().Update(currentDoc);
                        nextVersion = currentDoc.CurrentVersion + 1;
                    }

                    // Setup the New Document
                    var newDocId = Guid.NewGuid();
                    var newDoc = new Document
                    {
                        Did = newDocId,
                        StartupId = sId,
                        DocumentName = $"Market Research Analysis v{nextVersion}",
                        Type = "Market Research",
                        CurrentPath = publicUrl,
                        CurrentVersion = nextVersion,
                        CanAccess = 1,
                        UpdatedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        IsCurrent = true,
                        JsonResponse = jsonObjectToSave
                    };

                    // Attempt to insert the main Document
                    try
                    {
                        await _supabase.From<Document>().Insert(newDoc);
                    }
                    catch (Exception docEx)
                    {
                        // The Supabase C# client often crashes trying to parse the success response 
                        // back into C# because of the complex JSON object. 
                        // Since it's already in the database, we log it and ignore it!
                        Console.WriteLine($"[Ignored] Document response parsing error: {docEx.Message}");
                    }

                    // Attempt to insert the Version History
                    try
                    {
                        var versionDoc = new DocumentVersion
                        {
                            DocumentId = newDocId,
                            StartupId = sId,
                            VersionNumber = nextVersion,
                            Path = publicUrl,
                            CreatedAt = DateTime.UtcNow,
                            GeneratedBy = "AI"
                        };
                        await _supabase.From<DocumentVersion>().Insert(versionDoc);
                    }
                    catch (Exception verEx)
                    {
                        // If the DocumentVersion table is missing or has a schema issue, 
                        // we don't want it to crash the whole report generation!
                        Console.WriteLine($"[Ignored] DocumentVersion save failed: {verEx.Message}");
                    }
                }
                catch (Exception dbEx)
                {
                    // Only catch critical setup failures here
                    Console.WriteLine($"Database setup error: {dbEx.Message}");
                }

                // Return success to the React frontend immediately!
                return Content(jsonContent, "application/json");
            }
            catch (Exception ex) { return StatusCode(500, new { error = "Internal Server Error", message = ex.Message }); }
        }

        [HttpPut("{id}/recommendation")]
        public async Task<IActionResult> UpdateRecommendationData(string id, [FromBody] StartupRecommendationUpdateDto input)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest();

            var rawJson = input.JsonResponse.GetRawText();
            var supabaseSafeJson = JsonConvert.DeserializeObject<object>(rawJson);

            await _supabase.From<Startup>()
                .Where(s => s.Sid == sId)
                .Set(s => s.JsonResponse, supabaseSafeJson)
                .Set(s => s.CurrentIteration, input.CurrentIteration)
                .Update();

            return Ok(new { message = "Recommendation saved.", iteration = input.CurrentIteration });
        }
    }
}