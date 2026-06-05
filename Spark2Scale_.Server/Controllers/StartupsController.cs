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
        private readonly IHttpClientFactory _httpClientFactory;

        private const string SAFE_COLS = "sid,startupname,field,idea_description,region,startup_stage,founder_id,created_at,logo_path,current_iteration";

        public StartupsController(
            Supabase.Client supabase,
            Services.AccessControlService access,
            ILogger<StartupsController> logger,
            IHttpClientFactory httpClientFactory)
        {
            _supabase = supabase;
            _access = access;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        private string GetToken()
        {
            var header = Request.Headers["Authorization"].FirstOrDefault();
            return header?.StartsWith("Bearer ") == true ? header.Substring(7) : "";
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

                var http = _httpClientFactory.CreateClient();
                using var postReq = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/startups")
                {
                    Content = new StringContent(row.ToJsonString(), System.Text.Encoding.UTF8, "application/json")
                };
                postReq.Headers.Add("apikey", supabaseKey);
                postReq.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                postReq.Headers.Add("Prefer", "return=representation");

                var httpResp = await http.SendAsync(postReq);

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

        [HttpPost("{id}/upload-logo")]
        public async Task<IActionResult> UploadLogo(string id, IFormFile file)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest("Invalid ID format");
            if (file == null || file.Length == 0) return BadRequest("No file provided.");

            var token = GetToken();
            if (string.IsNullOrEmpty(token)) return Unauthorized("Missing authorization token.");
            if (!await _access.IsFounderOrOwner(token, sId)) return StatusCode(403, "Only the Founder can upload a logo.");

            try
            {
                var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
                var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");

                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var fileBytes = ms.ToArray();
                var ext = Path.GetExtension(file.FileName).ToLower(); // e.g. .jpg
                var objectPath = $"{sId}{ext}";
                var publicUrl = $"{supabaseUrl}/storage/v1/object/public/logos/{objectPath}";

                var http = _httpClientFactory.CreateClient();

                // Upsert so re-uploading works
                var uploadContent = new ByteArrayContent(fileBytes);
                uploadContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType);
                using var uploadReq = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/storage/v1/object/logos/{objectPath}")
                {
                    Content = uploadContent
                };
                uploadReq.Headers.Add("apikey", supabaseKey);
                uploadReq.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                uploadReq.Headers.Add("x-upsert", "true");
                var uploadResp = await http.SendAsync(uploadReq);

                if (!uploadResp.IsSuccessStatusCode)
                {
                    var err = await uploadResp.Content.ReadAsStringAsync();
                    return StatusCode((int)uploadResp.StatusCode, $"Storage upload failed: {err}");
                }

                // Update logo_path in DB
                await _supabase.From<Startup>()
                    .Where(s => s.Sid == sId)
                    .Set(s => s.LogoPath, publicUrl)
                    .Update();

                return Ok(new { logo_path = publicUrl });
            }
            catch (Exception ex) { return StatusCode(500, $"UploadLogo error: {ex.Message}"); }
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

            var token = GetToken();
            if (string.IsNullOrEmpty(token)) return Unauthorized("Missing authorization token.");

            try
            {
                // Fire every read that depends only on sId (or the token) in parallel.
                // Previously these ran in series, so the page paid ~5x the network
                // round-trip latency before it could respond. Each task swallows
                // its own failure so a single transient error (e.g. a stale token
                // from Supabase Auth) doesn't fail the whole page.
                var startupTask = SafeAsync(() => _supabase.From<Startup>().Select(SAFE_COLS).Where(s => s.Sid == sId).Get(), default(Supabase.Postgrest.Responses.ModeledResponse<Startup>));
                var workflowTask = SafeAsync(() => _supabase.From<StartupWorkflow>().Where(w => w.StartupId == sId).Get(), default(Supabase.Postgrest.Responses.ModeledResponse<StartupWorkflow>));
                var pitchTask = SafeAsync(() => _supabase.From<PitchDeck>().Where(p => p.startup_id == sId).Get(), default(Supabase.Postgrest.Responses.ModeledResponse<PitchDeck>));
                var jsonRawTask = FetchStartupJsonResponseAsync(sId);
                var userTask = SafeGetUserAsync(token);

                await Task.WhenAll(startupTask, workflowTask, pitchTask, jsonRawTask, userTask);

                // Auth must succeed — without a resolved user we can't authorize anything.
                var user = userTask.Result;
                if (user == null || !Guid.TryParse(user.Id, out Guid currentUserId))
                {
                    return Unauthorized("Invalid or expired session token.");
                }

                var startup = startupTask.Result?.Models.FirstOrDefault();
                if (startup == null) return NotFound("Startup not found");

                string? role = null;
                bool isAuthorized = false;

                if (startup.FounderId == currentUserId)
                {
                    isAuthorized = true;
                    role = "Founder";
                }
                else
                {
                    try
                    {
                        var contrib = await _supabase.From<StartupContributor>()
                            .Match(new Dictionary<string, string> {
                                { "startup_id", sId.ToString() },
                                { "user_id", currentUserId.ToString() }
                            })
                            .Get();
                        if (contrib.Models.Any())
                        {
                            isAuthorized = true;
                            role = contrib.Models.First().Role ?? "Contributor";
                        }
                        else
                        {
                            var investorCheck = await _supabase.From<Investor>().Where(i => i.user_id == currentUserId).Get();
                            if (investorCheck.Models.Any())
                            {
                                isAuthorized = true;
                                role = "Investor";
                            }
                        }
                    }
                    catch { }
                }

                if (!isAuthorized)
                {
                    return StatusCode(403, new { message = "You don't have permission to view this startup." });
                }

                int progressCount = 0;
                int totalLikes = 0;
                bool hasGap = false;
                var wf = workflowTask.Result?.Models.FirstOrDefault();
                if (wf != null)
                {
                    bool[] steps = { wf.IdeaCheck, wf.MarketResearch, wf.Evaluation, wf.Recommendation, wf.Documents, wf.PitchDeck };
                    progressCount = steps.Count(step => step);
                    bool foundFalse = false;
                    foreach (var step in steps)
                    {
                        if (!step) foundFalse = true;
                        else if (foundFalse && step) hasGap = true;
                    }
                }
                if (pitchTask.Result?.Models.Any() == true) totalLikes = pitchTask.Result.Models.Sum(d => d.countlikes);

                return Ok(ToDto(startup, role, jsonRawTask.Result, progressCount, totalLikes, hasGap));
            }
            catch (Exception ex) { return StatusCode(500, $"Error: {ex.Message}"); }
        }

        // Run an async task and swallow exceptions so one transient failure
        // doesn't cause Task.WhenAll to fail the whole composite read.
        private async Task<T?> SafeAsync<T>(Func<Task<T>> work, T? fallback)
        {
            try { return await work(); }
            catch (Exception ex)
            {
                _logger.LogWarning("SafeAsync swallowed exception: {Message}", ex.Message);
                return fallback;
            }
        }

        private async Task<Supabase.Gotrue.User?> SafeGetUserAsync(string? bearer)
        {
            if (string.IsNullOrEmpty(bearer)) return null;
            try { return await _supabase.Auth.GetUser(bearer); }
            catch (Exception ex)
            {
                _logger.LogWarning("Auth.GetUser failed: {Message}", ex.Message);
                return null;
            }
        }

        // Mapping from the recommendation agent's flat refinement keys to the
        // JSON Pointer (RFC 6901) paths inside startup_evaluation. Anything not
        // listed here is ignored — we never accept caller-supplied paths.
        private static readonly Dictionary<string, string> RefinementPathMap = new(StringComparer.OrdinalIgnoreCase)
        {
            { "problem_statement",     "/startup_evaluation/problem_definition/problem_statement" },
            { "gap_analysis",          "/startup_evaluation/problem_definition/gap_analysis" },
            { "current_solution",      "/startup_evaluation/problem_definition/current_solution" },
            { "differentiation",       "/startup_evaluation/product_and_solution/differentiation" },
            { "core_stickiness",       "/startup_evaluation/product_and_solution/core_stickiness" },
            { "defensibility_moat",    "/startup_evaluation/product_and_solution/defensibility_moat" },
            { "beachhead_market",      "/startup_evaluation/market_and_scope/beachhead_market" },
            { "market_size",           "/startup_evaluation/market_and_scope/market_size_estimate" },
            { "expansion_strategy",    "/startup_evaluation/market_and_scope/expansion_strategy" },
            { "five_year_vision",      "/startup_evaluation/vision_and_strategy/five_year_vision" },
            { "category_definition",   "/startup_evaluation/vision_and_strategy/category_definition" },
            { "primary_risk",          "/startup_evaluation/vision_and_strategy/primary_risk" },
            // Founder-level refinements apply to the first founder by convention.
            { "founder_market_fit",    "/startup_evaluation/founder_and_team/founders/0/founder_market_fit_statement" },
            { "founder_experience",    "/startup_evaluation/founder_and_team/founders/0/prior_experience" },
        };

        public class ApplyRefinementsDto
        {
            public Dictionary<string, string> Refinements { get; set; } = new();
        }

        // PATCH the startup's json_response with the user-approved refinements.
        // Each refinement key is resolved against RefinementPathMap so callers
        // can't write to arbitrary JSON paths.
        [HttpPost("{id}/apply-refinements")]
        public async Task<IActionResult> ApplyRefinements(string id, [FromBody] ApplyRefinementsDto input)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest("Invalid ID format");
            if (input?.Refinements == null || input.Refinements.Count == 0)
                return BadRequest(new { message = "No refinements provided." });

            var token = Request.Headers["Authorization"].FirstOrDefault()
                ?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase)
                ?.Trim();
            if (string.IsNullOrEmpty(token) || !await _access.IsFounderOrContributor(token, sId))
                return Unauthorized(new { message = "Unauthorized." });

            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
            var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");
            if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
                return StatusCode(500, new { message = "Supabase not configured." });

            try
            {
                var http = _httpClientFactory.CreateClient();
                using var getReq = new HttpRequestMessage(HttpMethod.Get,
                    $"{supabaseUrl}/rest/v1/startups?select=json_response&sid=eq.{sId}");
                getReq.Headers.Add("apikey", supabaseKey);
                getReq.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                using var getRes = await http.SendAsync(getReq);
                if (!getRes.IsSuccessStatusCode)
                    return StatusCode((int)getRes.StatusCode, new { message = "Failed to read startup." });

                var rows = JsonNode.Parse(await getRes.Content.ReadAsStringAsync())?.AsArray();
                if (rows == null || rows.Count == 0)
                    return NotFound(new { message = "Startup not found." });

                var existing = rows[0]?["json_response"]?.DeepClone() ?? new JsonObject();
                if (existing is not JsonObject jsonObj)
                {
                    // json_response was a string or null — start from a clean object.
                    jsonObj = new JsonObject();
                }

                var applied = new List<string>();
                var skipped = new List<string>();
                foreach (var kvp in input.Refinements)
                {
                    if (string.IsNullOrWhiteSpace(kvp.Value)) { skipped.Add(kvp.Key); continue; }
                    if (!RefinementPathMap.TryGetValue(kvp.Key, out var pointer)) { skipped.Add(kvp.Key); continue; }
                    if (SetByJsonPointer(jsonObj, pointer, kvp.Value)) applied.Add(kvp.Key);
                    else skipped.Add(kvp.Key);
                }

                if (applied.Count == 0)
                    return BadRequest(new { message = "No supported refinement keys were provided.", skipped });

                var patchPayload = new JsonObject { ["json_response"] = jsonObj };
                using var patchReq = new HttpRequestMessage(new HttpMethod("PATCH"),
                    $"{supabaseUrl}/rest/v1/startups?sid=eq.{sId}")
                {
                    Content = new StringContent(patchPayload.ToJsonString(),
                        System.Text.Encoding.UTF8, "application/json")
                };
                patchReq.Headers.Add("apikey", supabaseKey);
                patchReq.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                patchReq.Headers.Add("Prefer", "return=minimal");
                using var patchRes = await http.SendAsync(patchReq);
                if (!patchRes.IsSuccessStatusCode)
                {
                    var err = await patchRes.Content.ReadAsStringAsync();
                    return StatusCode((int)patchRes.StatusCode, new { message = "Patch failed.", detail = err });
                }

                return Ok(new { applied, skipped });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error applying refinements: {ex.Message}" });
            }
        }

        // Walk a JSON Pointer-style path (/a/b/0/c), creating intermediate
        // objects when missing, then set the leaf to the provided string. Only
        // existing array indices are written through; we never auto-grow arrays.
        private static bool SetByJsonPointer(JsonObject root, string pointer, string value)
        {
            if (string.IsNullOrEmpty(pointer) || pointer[0] != '/') return false;
            var parts = pointer.Substring(1).Split('/');
            if (parts.Length == 0) return false;

            JsonNode? cursor = root;
            for (int i = 0; i < parts.Length - 1; i++)
            {
                var seg = parts[i];
                if (cursor is JsonObject obj)
                {
                    if (obj[seg] is not JsonObject && obj[seg] is not JsonArray)
                    {
                        obj[seg] = new JsonObject();
                    }
                    cursor = obj[seg];
                }
                else if (cursor is JsonArray arr && int.TryParse(seg, out var idx))
                {
                    if (idx < 0 || idx >= arr.Count) return false;
                    cursor = arr[idx];
                }
                else
                {
                    return false;
                }
            }

            var leaf = parts[^1];
            if (cursor is JsonObject leafObj)
            {
                leafObj[leaf] = value;
                return true;
            }
            if (cursor is JsonArray leafArr && int.TryParse(leaf, out var leafIdx))
            {
                if (leafIdx < 0 || leafIdx >= leafArr.Count) return false;
                leafArr[leafIdx] = value;
                return true;
            }
            return false;
        }

        private async Task<object?> FetchStartupJsonResponseAsync(Guid sId)
        {
            try
            {
                var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
                var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");
                if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey)) return null;

                var http = _httpClientFactory.CreateClient();
                using var req = new HttpRequestMessage(HttpMethod.Get,
                    $"{supabaseUrl}/rest/v1/startups?select=json_response&sid=eq.{sId}");
                req.Headers.Add("apikey", supabaseKey);
                req.Headers.Add("Authorization", $"Bearer {supabaseKey}");

                using var rawRes = await http.SendAsync(req);
                if (!rawRes.IsSuccessStatusCode) return null;

                var body = await rawRes.Content.ReadAsStringAsync();
                var array = JsonNode.Parse(body)?.AsArray();
                if (array != null && array.Count > 0) return array[0]?["json_response"];
                return null;
            }
            catch { return null; }
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

            var token = GetToken();
            if (string.IsNullOrEmpty(token)) return Unauthorized("Missing authorization token.");
            if (!await _access.IsFounderOrOwner(token, sId)) return StatusCode(403, "Only the Founder can generate market research.");

            try
            {
                var startup = (await _supabase.From<Startup>().Select(SAFE_COLS).Where(s => s.Sid == sId).Get()).Models.FirstOrDefault();
                if (startup == null) return NotFound("Startup not found");

                // 1. Fetch the enriched JSON response you added from the Founder Client dashboard!
                JsonElement startupDataPayload = System.Text.Json.JsonSerializer.Deserialize<JsonElement>("{}");
                try
                {
                    var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
                    var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");
                    var h = _httpClientFactory.CreateClient();
                    using var rawReq = new HttpRequestMessage(HttpMethod.Get,
                        $"{supabaseUrl}/rest/v1/startups?select=json_response&sid=eq.{sId}");
                    rawReq.Headers.Add("apikey", supabaseKey);
                    rawReq.Headers.Add("Authorization", $"Bearer {supabaseKey}");
                    using var rawRes = await h.SendAsync(rawReq);
                    if (rawRes.IsSuccessStatusCode)
                    {
                        var body = await rawRes.Content.ReadAsStringAsync();
                        var array = JsonNode.Parse(body)?.AsArray();
                        if (array != null && array.Count > 0)
                        {
                            var tokens = array[0]["json_response"]?.ToString();
                            if (!string.IsNullOrWhiteSpace(tokens))
                            {
                                startupDataPayload = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(tokens);
                            }
                        }
                    }
                }
                catch { }

                string fullIdea = startup.IdeaDescription ?? "No description";
                string shortIdeaName = fullIdea.Length > 50 ? fullIdea.Substring(0, 47) + "..." : fullIdea;

                // 2. We concatenate all the rich data into the "problem" field because the AI server only takes idea, problem, and region.
                string richProblemText = $"Task: Identify primary market pain points for {startup.StartupName}\n\n";
                richProblemText += $"Core Idea: {fullIdea}\n";
                try
                {
                    if (startupDataPayload.TryGetProperty("startup_evaluation", out var eval))
                    {
                        string problemDef = eval.TryGetProperty("problem_definition", out var pd) ? pd.ToString() : "";
                        string productSol = eval.TryGetProperty("product_and_solution", out var ps) ? ps.ToString() : "";
                        string market = eval.TryGetProperty("market_and_scope", out var ms) ? ms.ToString() : "";
                        string bizModel = eval.TryGetProperty("business_model", out var bm) ? bm.ToString() : "";
                        
                        richProblemText += $"Problem Details: {problemDef}\n" +
                                           $"Solution Details: {productSol}\n" +
                                           $"Market Scope: {market}\n" +
                                           $"Business Model: {bizModel}";
                    }
                }
                catch (Exception flattenEx)
                {
                    Console.WriteLine($"[GenerateMarketResearch] Flattening JSON to text failed: {flattenEx.Message}");
                }

                string jsonContent = "";
                {
                    // Async polling pattern (mirrors Evaluation's job-id flow).
                    // The sync /market-research/research endpoint blew past
                    // Azure App Service's 230s front-door limit and returned
                    // 504 on every cold workflow run. We now kick off the
                    // workflow with /research/start (returns a job id in <1s),
                    // then poll /research/status/{id} every few seconds.
                    var client = _httpClientFactory.CreateClient();
                    client.Timeout = TimeSpan.FromSeconds(30);
                    // Forward the caller's Supabase Bearer token — the AI route is auth-protected.
                    client.DefaultRequestHeaders.Add("Authorization", $"Bearer {GetToken()}");
                    const string AI_BASE = "https://spark2scale-ai-api-server.azurewebsites.net/api/v1/market-research";

                    var externalPayload = new
                    {
                        idea = shortIdeaName,
                        problem = richProblemText,
                        region = request.Region
                    };

                    string? jobId = null;
                    try
                    {
                        var startResp = await client.PostAsJsonAsync($"{AI_BASE}/research/start", externalPayload);
                        if (!startResp.IsSuccessStatusCode)
                        {
                            var err = await startResp.Content.ReadAsStringAsync();
                            return StatusCode((int)startResp.StatusCode, $"AI Service failed to start job: {err}");
                        }
                        var startJson = JsonNode.Parse(await startResp.Content.ReadAsStringAsync());
                        jobId = startJson?["job_id"]?.GetValue<string>();
                    }
                    catch (Exception ex)
                    {
                        return StatusCode(502, $"AI Service unreachable: {ex.Message}");
                    }
                    if (string.IsNullOrEmpty(jobId))
                        return StatusCode(502, "AI Service did not return a job id.");

                    var deadline = DateTime.UtcNow.AddMinutes(8);
                    var pollDelay = TimeSpan.FromSeconds(5);
                    JsonNode? finalResult = null;
                    string? failureMessage = null;
                    while (DateTime.UtcNow < deadline)
                    {
                        await Task.Delay(pollDelay);
                        try
                        {
                            var statusResp = await client.GetAsync($"{AI_BASE}/research/status/{jobId}");
                            if (!statusResp.IsSuccessStatusCode)
                            {
                                if (pollDelay < TimeSpan.FromSeconds(20)) pollDelay = pollDelay.Add(TimeSpan.FromSeconds(2));
                                continue;
                            }
                            var statusJson = JsonNode.Parse(await statusResp.Content.ReadAsStringAsync());
                            var status = statusJson?["status"]?.GetValue<string>();
                            if (status == "completed")
                            {
                                finalResult = statusJson?["result"];
                                break;
                            }
                            if (status == "failed")
                            {
                                failureMessage = statusJson?["error"]?.GetValue<string>() ?? "Unknown AI failure";
                                break;
                            }
                            // Mild backoff while running (5s -> 10s -> 15s max).
                            if (pollDelay < TimeSpan.FromSeconds(15)) pollDelay = pollDelay.Add(TimeSpan.FromSeconds(2));
                        }
                        catch (Exception)
                        {
                            // Transient poll failure — keep trying until deadline.
                        }
                    }

                    if (failureMessage != null)
                        return StatusCode(502, $"AI Service Failed: {failureMessage}");
                    if (finalResult == null)
                        return StatusCode(504, "AI Service did not complete in time. Please try again.");

                    jsonContent = finalResult.ToJsonString();
                }

                // 1. Safely Parse JSON
                object jsonObjectToSave;
                try { jsonObjectToSave = JsonConvert.DeserializeObject<Dictionary<string, object>>(jsonContent); }
                catch
                {
                    try { jsonObjectToSave = JsonConvert.DeserializeObject<List<object>>(jsonContent); }
                    catch { jsonObjectToSave = new { raw_output = jsonContent }; }
                }

                // 2. We no longer upload to Supabase Storage, pure JSON response!
                string publicUrl = "";

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

            var token = GetToken();
            if (string.IsNullOrEmpty(token)) return Unauthorized("Missing authorization token.");
            if (!await _access.IsFounderOrOwner(token, sId)) return StatusCode(403, "Only the Founder can update recommendation data.");

            try
            {
                var rawJson = input.JsonResponse.GetRawText();
                var supabaseSafeJson = JsonConvert.DeserializeObject<object>(rawJson);

                await _supabase.From<Startup>()
                    .Where(s => s.Sid == sId)
                    .Set(s => s.JsonResponse, supabaseSafeJson)
                    .Set(s => s.CurrentIteration, input.CurrentIteration)
                    .Update();

                return Ok(new { message = "Recommendation saved.", iteration = input.CurrentIteration });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating recommendation data: {ex.Message}");
            }
        }

        [HttpPut("update-json/{id}")]
        public async Task<IActionResult> UpdateStartupJson(string id, [FromBody] UpdateJsonDto input)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest("Invalid ID format");

            try
            {
                var token = GetToken();
                if (string.IsNullOrEmpty(token)) return Unauthorized("Missing authorization token.");
                if (!await _access.IsFounderOrOwner(token, sId)) return StatusCode(403, "Only the Founder can update data.");

                // 2. Parse the JSON safely for the Supabase C# Client
                var rawJson = input.jsonResponse.GetRawText();
                var supabaseSafeJson = JsonConvert.DeserializeObject<object>(rawJson);

                // 3. Update the json_response column in the database
                await _supabase.From<Startup>()
                    .Where(s => s.Sid == sId)
                    .Set(s => s.JsonResponse, supabaseSafeJson)
                    .Update();

                return Ok(new { message = "Startup data updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating JSON data: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStartup(string id)
        {
            if (!Guid.TryParse(id, out Guid sId)) return BadRequest("Invalid ID format");
            try
            {
                var token = GetToken();
                if (string.IsNullOrEmpty(token)) return Unauthorized("Missing authorization token.");
                if (!await _access.IsFounderOrOwner(token, sId)) return StatusCode(403, "Only the Founder can delete this startup.");

                // Manually cascade delete dependent records to avoid foreign key constraints
                try { await _supabase.From<ChatSession>().Where(x => x.StartupId == sId).Delete(); } catch { }
                try { await _supabase.From<StartupWorkflow>().Where(x => x.StartupId == sId).Delete(); } catch { }
                try { await _supabase.From<DocumentVersion>().Where(x => x.StartupId == sId).Delete(); } catch { }
                try { await _supabase.From<Document>().Where(x => x.StartupId == sId).Delete(); } catch { }
                try { await _supabase.From<StartupContributor>().Where(x => x.StartupId == sId).Delete(); } catch { }
                try { await _supabase.From<Invitation>().Where(x => x.StartupId == sId).Delete(); } catch { }
                try { await _supabase.From<Recommendation>().Where(x => x.StartupId == sId).Delete(); } catch { }
                
                try {
                    var decks = await _supabase.From<PitchDeck>().Where(x => x.startup_id == sId).Get();
                    if (decks != null && decks.Models != null) {
                        foreach (var d in decks.Models) {
                            try { await _supabase.From<PitchDeckLike>().Where(x => x.PitchDeckId == d.pitchdeckid).Delete(); } catch { }
                            try { await _supabase.From<PitchDeck>().Where(x => x.pitchdeckid == d.pitchdeckid).Delete(); } catch { }
                        }
                    }
                } catch { }

                await _supabase.From<Startup>().Where(s => s.Sid == sId).Delete();

                return Ok(new { message = "Startup deleted successfully." });
            }
            catch (Exception ex) { return StatusCode(500, $"Error deleting startup: {ex.Message}"); }
        }
    }
}