using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using Supabase;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly Client _supabase;
        private readonly Spark2Scale_.Server.Services.AccessControlService _access;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<DocumentsController> _logger;

        private const string SAFE_COLS = "did,startup_id,document_name,type,current_path,current_version,canaccess,updated_at,created_at,is_current";

        public DocumentsController(
            Client supabase,
            Spark2Scale_.Server.Services.AccessControlService access,
            IHttpClientFactory httpClientFactory,
            ILogger<DocumentsController> logger)
        {
            _supabase = supabase;
            _access = access;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        private string GetToken()
        {
            var header = Request.Headers["Authorization"].FirstOrDefault();
            return header?.StartsWith("Bearer ") == true ? header.Substring(7) : "";
        }

        [HttpGet]
        public async Task<IActionResult> GetDocuments([FromQuery] string startupId, [FromQuery] string? investorId = null)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            try
            {
                var query = _supabase.From<Document>()
                    .Where(x => x.StartupId == sId)
                    .Order("updated_at", Supabase.Postgrest.Constants.Ordering.Descending);

                if (!string.IsNullOrEmpty(investorId))
                {
                    query = query.Filter("canaccess", Supabase.Postgrest.Constants.Operator.NotEqual, "0");
                }

                var docsResult = await query.Get();
                var allDocs = docsResult.Models;

                List<InvestorDocumentAccess> accessRecords = new List<InvestorDocumentAccess>();
                if (!string.IsNullOrEmpty(investorId) && Guid.TryParse(investorId, out Guid invId))
                {
                    var accessResult = await _supabase.From<InvestorDocumentAccess>()
                        .Where(x => x.InvestorId == invId)
                        .Get();
                    accessRecords = accessResult.Models;
                }

                var dtos = allDocs.Select(d =>
                {
                    bool isRestricted = d.CanAccess == 2;
                    string accessStatus = "public";
                    string? path = d.CurrentPath;

                    if (isRestricted)
                    {
                        var record = accessRecords.FirstOrDefault(r => r.DocumentId == d.Did);
                        if (record != null && record.Granted == true) { accessStatus = "granted"; }
                        else if (record != null && record.Granted == false) { accessStatus = "pending"; path = null; }
                        else { accessStatus = "locked"; path = null; }
                    }

                    object? parsedJson = null;
                    if (d.JsonResponse != null)
                    {
                        // Always go through Newtonsoft first to handle JObject/JToken correctly
                        string rawJson = d.JsonResponse is string s
                            ? s
                            : Newtonsoft.Json.JsonConvert.SerializeObject(d.JsonResponse);

                        try
                        {
                            parsedJson = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(rawJson);
                        }
                        catch
                        {
                            parsedJson = new { raw_output = rawJson };
                        }
                    }

                    return new
                    {
                        did = d.Did,
                        startup_id = d.StartupId,
                        document_name = d.DocumentName,
                        type = d.Type,
                        current_path = path,
                        current_version = d.CurrentVersion,
                        canaccess = d.CanAccess,
                        updated_at = d.UpdatedAt,
                        access_status = accessStatus,
                        json_response = parsedJson
                    };
                });

                return Ok(dtos);
            }
            catch (Exception ex) { return StatusCode(500, $"Error: {ex.Message}"); }
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadDocument([FromForm] DocumentUploadDto form)
        {
            if (form.File == null || form.File.Length == 0) return BadRequest("No file.");
            if (!Guid.TryParse(form.StartupId, out Guid sId)) return BadRequest("Invalid Startup ID.");

            if (!await _access.IsFounderOrOwner(GetToken(), sId))
                return Unauthorized(new { message = "Unauthorized upload." });

            // Implementation note: this endpoint deliberately uses raw HTTP against the
            // PostgREST API (mirroring SaveAIResponse below) instead of the supabase-csharp
            // SDK. The SDK applies [PrimaryKey("did", false)] on the Document model, which
            // strips `did` from the request body — leading to silent duplicate inserts and
            // FK violations on document_versions. Raw HTTP gives us a controlled payload
            // and a deterministic response.
            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
            var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");
            if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            {
                return StatusCode(500, new { message = "Supabase URL/key not configured." });
            }

            try
            {
                // 1. Upload the binary to Supabase Storage.
                var fileName = $"{sId}/{DateTime.Now.Ticks}_{form.File.FileName}";
                byte[] fileBytes;
                using (var ms = new MemoryStream()) { await form.File.CopyToAsync(ms); fileBytes = ms.ToArray(); }
                await _supabase.Storage.From("startup-docs").Upload(fileBytes, fileName);
                var publicUrl = _supabase.Storage.From("startup-docs").GetPublicUrl(fileName);
                var now = DateTime.UtcNow;

                using var http = _httpClientFactory.CreateClient();
                http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                http.DefaultRequestHeaders.Add("Prefer", "return=representation");

                // 2. Resolve whether this is a new doc or a new version of an existing one.
                //    Priority: explicit DocumentId > current doc of same (startup_id, type).
                Guid? targetDid = null;
                int targetCurrentVersion = 0;
                if (!string.IsNullOrEmpty(form.DocumentId) && Guid.TryParse(form.DocumentId, out Guid dIdParsed))
                {
                    var lookup = await http.GetAsync($"{supabaseUrl}/rest/v1/documents?did=eq.{dIdParsed}&select=did,current_version");
                    if (lookup.IsSuccessStatusCode)
                    {
                        var rows = JArray.Parse(await lookup.Content.ReadAsStringAsync());
                        if (rows.Count > 0)
                        {
                            targetDid = (Guid)rows[0]["did"]!;
                            targetCurrentVersion = (int)rows[0]["current_version"]!;
                        }
                    }
                }
                if (targetDid == null)
                {
                    var lookup = await http.GetAsync(
                        $"{supabaseUrl}/rest/v1/documents?startup_id=eq.{sId}&type=eq.{Uri.EscapeDataString(form.Type)}&is_current=eq.true&select=did,current_version&limit=1");
                    if (lookup.IsSuccessStatusCode)
                    {
                        var rows = JArray.Parse(await lookup.Content.ReadAsStringAsync());
                        if (rows.Count > 0)
                        {
                            targetDid = (Guid)rows[0]["did"]!;
                            targetCurrentVersion = (int)rows[0]["current_version"]!;
                        }
                    }
                }

                Guid persistedDid;
                int persistedVersion;

                if (targetDid != null)
                {
                    // 3a. Version update: PATCH the existing row.
                    persistedVersion = targetCurrentVersion + 1;
                    var patchPayload = new
                    {
                        current_path = publicUrl,
                        current_version = persistedVersion,
                        updated_at = now,
                        is_current = true
                    };
                    var patchReq = new HttpRequestMessage(new HttpMethod("PATCH"),
                        $"{supabaseUrl}/rest/v1/documents?did=eq.{targetDid}")
                    {
                        Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(patchPayload),
                            System.Text.Encoding.UTF8, "application/json")
                    };
                    var patchResp = await http.SendAsync(patchReq);
                    if (!patchResp.IsSuccessStatusCode)
                    {
                        var err = await patchResp.Content.ReadAsStringAsync();
                        _logger.LogError("[Upload] PATCH failed {Status}: {Body}", patchResp.StatusCode, err);
                        return StatusCode((int)patchResp.StatusCode, new { message = "Failed to update document.", detail = err });
                    }
                    var patched = JArray.Parse(await patchResp.Content.ReadAsStringAsync());
                    if (patched.Count == 0)
                    {
                        _logger.LogError("[Upload] PATCH returned 0 rows for did {Did}", targetDid);
                        return StatusCode(500, new { message = "Document update affected 0 rows." });
                    }
                    persistedDid = targetDid.Value;
                }
                else
                {
                    // 3b. New doc: POST a fresh row with an explicit did.
                    var newDid = Guid.NewGuid();
                    var insertPayload = new
                    {
                        did = newDid,
                        startup_id = sId,
                        document_name = form.DocName,
                        type = form.Type,
                        current_path = publicUrl,
                        current_version = 1,
                        canaccess = 1,
                        updated_at = now,
                        created_at = now,
                        is_current = true
                    };
                    var insertReq = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/documents")
                    {
                        Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(insertPayload),
                            System.Text.Encoding.UTF8, "application/json")
                    };
                    var insertResp = await http.SendAsync(insertReq);
                    if (!insertResp.IsSuccessStatusCode)
                    {
                        var err = await insertResp.Content.ReadAsStringAsync();
                        _logger.LogError("[Upload] POST documents failed {Status}: {Body}", insertResp.StatusCode, err);
                        return StatusCode((int)insertResp.StatusCode, new { message = "Failed to persist document.", detail = err });
                    }
                    var inserted = JArray.Parse(await insertResp.Content.ReadAsStringAsync());
                    if (inserted.Count == 0)
                    {
                        _logger.LogError("[Upload] POST documents returned 0 rows");
                        return StatusCode(500, new { message = "Document insert returned 0 rows." });
                    }
                    persistedDid = (Guid)inserted[0]["did"]!;
                    persistedVersion = 1;
                }

                // 4. Append a row to document_versions for the version history.
                var versionPayload = new
                {
                    document_id = persistedDid,
                    startup_id = sId,
                    version_number = persistedVersion,
                    path = publicUrl,
                    created_at = now,
                    generated_by = "manual"
                };
                var versionReq = new HttpRequestMessage(HttpMethod.Post,
                    $"{supabaseUrl}/rest/v1/document_versions")
                {
                    Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(versionPayload),
                        System.Text.Encoding.UTF8, "application/json")
                };
                var versionResp = await http.SendAsync(versionReq);
                if (!versionResp.IsSuccessStatusCode)
                {
                    var err = await versionResp.Content.ReadAsStringAsync();
                    _logger.LogError("[Upload] POST document_versions failed {Status}: {Body}", versionResp.StatusCode, err);
                    return StatusCode((int)versionResp.StatusCode, new { message = "Failed to record version.", detail = err });
                }

                return Ok(new
                {
                    message = targetDid != null ? "Version updated" : "File created",
                    did = persistedDid,
                    version = persistedVersion
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Upload] Unhandled exception");
                return StatusCode(500, new { message = "Upload failed.", detail = ex.Message });
            }
        }

        [HttpDelete("{documentId}")]
        public async Task<IActionResult> DeleteDocument(string documentId)
        {
            if (!Guid.TryParse(documentId, out Guid dId)) return BadRequest("Invalid ID");
            try
            {
                var docRes = await _supabase.From<Document>().Select("did,startup_id").Where(x => x.Did == dId).Get();
                var doc = docRes.Models.FirstOrDefault();
                if (doc == null) return NotFound();

                if (!await _access.IsFounderOrOwner(GetToken(), doc.StartupId)) return Forbid();

                await _supabase.From<DocumentVersion>().Where(x => x.DocumentId == dId).Delete();
                await _supabase.From<Document>().Where(x => x.Did == dId).Delete();

                return Ok(new { message = "Deleted successfully" });
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpPost("save-ai-response")]
        public async Task<IActionResult> SaveAIResponse([FromBody] SaveAIResponseDto input)
        {
            if (input.StartupId == Guid.Empty) return BadRequest("Invalid Startup ID.");
            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
            var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");

            try
            {
                var http = _httpClientFactory.CreateClient();
                http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                http.DefaultRequestHeaders.Add("Prefer", "return=representation");

                var patchUrl = $"{supabaseUrl}/rest/v1/documents?startup_id=eq.{input.StartupId}&type=eq.{input.Type}&is_current=eq.true";
                var patchRequest = new HttpRequestMessage(new HttpMethod("PATCH"), patchUrl) { Content = new StringContent("{\"is_current\": false}", System.Text.Encoding.UTF8, "application/json") };
                await http.SendAsync(patchRequest);

                Guid newDid = Guid.NewGuid();
                var insertPayload = new
                {
                    did = newDid,
                    startup_id = input.StartupId,
                    document_name = $"{input.Type} (AI Analysis)",
                    type = input.Type,
                    current_path = "",
                    current_version = 1,
                    canaccess = 1,
                    updated_at = DateTime.UtcNow,
                    created_at = DateTime.UtcNow,
                    is_current = true,
                    json_response = input.Content
                };

                var insertRequest = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/documents") { Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(insertPayload), System.Text.Encoding.UTF8, "application/json") };
                var response = await http.SendAsync(insertRequest);

                if (!response.IsSuccessStatusCode)
                {
                    var err = await response.Content.ReadAsStringAsync();
                    return StatusCode((int)response.StatusCode, $"Failed to save document to DB: {err}");
                }

                var versionDoc = new DocumentVersion
                {
                    DocumentId = newDid,
                    StartupId = input.StartupId,
                    VersionNumber = 1,
                    Path = "",
                    CreatedAt = DateTime.UtcNow,
                    GeneratedBy = "AI"
                };
                await _supabase.From<DocumentVersion>().Insert(versionDoc);

                return Ok(new { message = "AI Response Saved" });
            }
            catch (Exception ex) { return StatusCode(500, $"Save failed: {ex.Message}"); }
        }

        [HttpPost("save-ai-evaluations")]
        public async Task<IActionResult> SaveAiEvaluations([FromForm] SaveAiEvaluationsFormDto input)
        {
            if (!Guid.TryParse(input.StartupId, out Guid sId)) return BadRequest("Invalid ID.");
            if (input.FounderFile == null || input.InvestorFile == null) return BadRequest("Missing PDF files.");

            try
            {
                string founderUrl = await UploadHelper(input.FounderFile, "Founder_Report", sId);
                string investorUrl = await UploadHelper(input.InvestorFile, "Investor_Memo", sId);

                // 1. Safely Parse the JSON String using Newtonsoft
                object finalJsonObject = null;

                if (!string.IsNullOrWhiteSpace(input.JsonResponse))
                {
                    try
                    {
                        // JObject strictly forces it into Newtonsoft's format, completely avoiding System.Text.Json
                        finalJsonObject = Newtonsoft.Json.Linq.JObject.Parse(input.JsonResponse);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to parse AI JSON. Falling back to wrapper. Error: {ex.Message}");
                        finalJsonObject = new { raw_output = input.JsonResponse };
                    }
                }

                // 2. Pass the strongly parsed object down to the helper
                await CreateDocHelper("Founder Evaluation", founderUrl, 0, sId, finalJsonObject);
                await CreateDocHelper("Investor Evaluation", investorUrl, 1, sId, finalJsonObject);

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving evaluations: {ex.Message}");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("{id}/generate-swot")]
        public async Task<IActionResult> GenerateSwot(string id, [FromBody] GenerateDocumentDto input = null)
        {
            Console.WriteLine($"\n========== START GENERATE SWOT ==========");
            Console.WriteLine($"[GenerateSwot] Invoked with ID: {id}");

            if (!Guid.TryParse(id, out Guid sId))
            {
                Console.WriteLine($"[GenerateSwot] Invalid ID format.");
                return BadRequest("Invalid ID format");
            }

            try
            {
                Console.WriteLine($"[GenerateSwot] STEP 1: Fetching Startup...");
                var startup = (await _supabase.From<Startup>().Where(s => s.Sid == sId).Get()).Models.FirstOrDefault();
                if (startup == null)
                {
                    Console.WriteLine($"[GenerateSwot] Startup not found for ID: {sId}");
                    return NotFound("Startup not found");
                }

                Console.WriteLine($"[GenerateSwot] STEP 2: Fetching Market Research Document...");
                var existingDocs = await _supabase.From<Document>()
                    .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                    .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Market Research")
                    .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                    .Get();

                var marketResearchDoc = existingDocs.Models.FirstOrDefault();
                if (marketResearchDoc == null || marketResearchDoc.JsonResponse == null)
                {
                    Console.WriteLine($"[GenerateSwot] Market Research doc missing or empty.");
                    return BadRequest("Market Research document is required to generate SWOT analysis.");
                }

                Console.WriteLine($"[GenerateSwot] STEP 3: Calling External AI Service...");
                string jsonContent = "";
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromMinutes(3);

                    // FIX: JsonResponse is typed as `object` and the Supabase C# client deserializes
                    // JSONB columns into Newtonsoft JObject. System.Text.Json cannot serialize JObject
                    // correctly — it produces nested empty arrays instead of the real data.
                    // Solution: always serialize with Newtonsoft first (which handles its own JObject/JToken
                    // types correctly), then deserialize into a System.Text.Json.JsonElement for a clean,
                    // framework-agnostic value that PostAsJsonAsync will serialize perfectly.
                    string mrRawJson = marketResearchDoc.JsonResponse is string alreadyString
                        ? alreadyString
                        : Newtonsoft.Json.JsonConvert.SerializeObject(marketResearchDoc.JsonResponse);

                    JsonElement marketResearchPayload;
                    try
                    {
                        marketResearchPayload = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(mrRawJson);
                    }
                    catch
                    {
                        Console.WriteLine("[GenerateSwot] WARNING: Failed to deserialize market research JSON. Sending empty object.");
                        marketResearchPayload = System.Text.Json.JsonSerializer.Deserialize<JsonElement>("{}");
                    }

                    var externalPayload = new
                    {
                        idea_name = startup.StartupName ?? "No name",
                        idea_description = startup.IdeaDescription ?? "No description",
                        region = startup.Region ?? "Global",
                        market_research = marketResearchPayload,
                        user_comment = input?.Comment
                    };

                    Console.WriteLine($"[GenerateSwot] External Payload: idea_name='{externalPayload.idea_name}' region='{externalPayload.region}'");

                    string payloadStr = JsonConvert.SerializeObject(externalPayload, Formatting.Indented);
                    Console.WriteLine($"[GenerateSwot] --- FULL PAYLOAD SENT TO AI ---");
                    Console.WriteLine(payloadStr);
                    Console.WriteLine($"------------------------------------------");

                    var response = await client.PostAsJsonAsync("https://spark2scale-ai-api-server.azurewebsites.net/api/v1/swot/generate", externalPayload);
                    Console.WriteLine($"[GenerateSwot] External Response Status: {response.StatusCode}");

                    if (!response.IsSuccessStatusCode)
                    {
                        var error = await response.Content.ReadAsStringAsync();
                        Console.WriteLine($"[GenerateSwot] AI Service Failed. Error: {error}");
                        return StatusCode((int)response.StatusCode, $"AI Service Failed: {error}");
                    }

                    jsonContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[GenerateSwot] AI Output received (length: {jsonContent?.Length}).");
                }

                Console.WriteLine($"[GenerateSwot] STEP 4: Parsing JSON...");
                object jsonObjectToSave;
                try { jsonObjectToSave = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(jsonContent ?? "{}"); }
                catch { jsonObjectToSave = new { raw_output = jsonContent }; }

                Console.WriteLine($"[GenerateSwot] STEP 5: Updating Database...");
                try
                {
                    var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
                    var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");

                    using var http = _httpClientFactory.CreateClient();
                    http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    http.DefaultRequestHeaders.Add("Prefer", "return=representation");

                    var swotDocs = await _supabase.From<Document>()
                        .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                        .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "SWOT Analysis")
                        .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                        .Get();

                    var currentDoc = swotDocs.Models.FirstOrDefault();
                    int nextVersion = 1;

                    if (currentDoc != null)
                    {
                        Console.WriteLine($"[GenerateSwot] Archiving older version: v{currentDoc.CurrentVersion}");
                        var patchUrl = $"{supabaseUrl}/rest/v1/documents?did=eq.{currentDoc.Did}";
                        var patchRequest = new HttpRequestMessage(new HttpMethod("PATCH"), patchUrl) { Content = new StringContent("{\"is_current\": false}", System.Text.Encoding.UTF8, "application/json") };
                        await http.SendAsync(patchRequest);
                        nextVersion = currentDoc.CurrentVersion + 1;
                    }

                    var newDocId = Guid.NewGuid();
                    Console.WriteLine($"[GenerateSwot] Creating new SWOT document v{nextVersion} with ID {newDocId}");

                    var insertPayload = new
                    {
                        did = newDocId,
                        startup_id = sId,
                        document_name = $"SWOT Analysis v{nextVersion}",
                        type = "SWOT Analysis",
                        current_path = "",
                        current_version = nextVersion,
                        canaccess = 1,
                        updated_at = DateTime.UtcNow,
                        created_at = DateTime.UtcNow,
                        is_current = true,
                        json_response = jsonObjectToSave
                    };

                    try
                    {
                        var insertRequest = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/documents") { Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(insertPayload), System.Text.Encoding.UTF8, "application/json") };
                        var docRes = await http.SendAsync(insertRequest);
                        if (!docRes.IsSuccessStatusCode)
                        {
                            var err = await docRes.Content.ReadAsStringAsync();
                            Console.WriteLine($"[GenerateSwot] Document inserted failed: {err}");
                        }
                        else
                        {
                            Console.WriteLine($"[GenerateSwot] Document inserted successfully.");
                        }
                    }
                    catch (Exception docEx)
                    {
                        Console.WriteLine($"[Ignored] Document response parsing error: {docEx.Message}");
                    }

                    try
                    {
                        var versionDoc = new DocumentVersion
                        {
                            DocumentId = newDocId,
                            StartupId = sId,
                            VersionNumber = nextVersion,
                            Path = "",
                            CreatedAt = DateTime.UtcNow,
                            GeneratedBy = "AI"
                        };
                        await _supabase.From<DocumentVersion>().Insert(versionDoc);
                        Console.WriteLine($"[GenerateSwot] DocumentVersion inserted successfully.");
                    }
                    catch (Exception verEx)
                    {
                        Console.WriteLine($"[Ignored] DocumentVersion save failed: {verEx.Message}");
                    }
                }
                catch (Exception dbEx)
                {
                    Console.WriteLine($"[GenerateSwot] Database setup error: {dbEx.Message}");
                }

                Console.WriteLine($"[GenerateSwot] STEP 6: Returning Success...");
                Console.WriteLine($"[GenerateSwot] Returning content length: {jsonContent?.Length}");
                Console.WriteLine($"========== END GENERATE SWOT ==========\n");
                return Content(jsonContent ?? "{}", "application/json", System.Text.Encoding.UTF8);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GenerateSwot] CRITICAL EXCEPTION CAUGHT: {ex.Message}");
                Console.WriteLine($"[GenerateSwot] StackTrace: {ex.StackTrace}");
                Console.WriteLine($"========== END GENERATE SWOT (ERROR) ==========\n");
                return StatusCode(500, new { error = "Internal Server Error", message = ex.Message });
            }
        }

        [HttpPost("{id}/generate-competitor-matrix")]
        public async Task<IActionResult> GenerateCompetitorMatrix(string id, [FromBody] GenerateDocumentDto input = null)
        {
            Console.WriteLine($"\n========== START GENERATE COMPETITOR MATRIX ==========");
            Console.WriteLine($"[GenerateCompetitorMatrix] Invoked with ID: {id}");

            if (!Guid.TryParse(id, out Guid sId))
            {
                Console.WriteLine($"[GenerateCompetitorMatrix] Invalid ID format.");
                return BadRequest("Invalid ID format");
            }

            try
            {
                Console.WriteLine($"[GenerateCompetitorMatrix] STEP 1: Fetching Startup...");
                var startup = (await _supabase.From<Startup>().Where(s => s.Sid == sId).Get()).Models.FirstOrDefault();
                if (startup == null)
                {
                    Console.WriteLine($"[GenerateCompetitorMatrix] Startup not found for ID: {sId}");
                    return NotFound("Startup not found");
                }

                Console.WriteLine($"[GenerateCompetitorMatrix] STEP 2: Fetching Market Research Document...");
                var existingDocs = await _supabase.From<Document>()
                    .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                    .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Market Research")
                    .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                    .Get();

                var marketResearchDoc = existingDocs.Models.FirstOrDefault();
                if (marketResearchDoc == null || marketResearchDoc.JsonResponse == null)
                {
                    Console.WriteLine($"[GenerateCompetitorMatrix] Market Research doc missing or empty.");
                    return BadRequest("Market Research document is required to generate Competitor Matrix analysis.");
                }

                Console.WriteLine($"[GenerateCompetitorMatrix] STEP 3: Calling External AI Service...");
                string jsonContent = "";
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromMinutes(3);

                    string mrRawJson = marketResearchDoc.JsonResponse is string alreadyString
                        ? alreadyString
                        : Newtonsoft.Json.JsonConvert.SerializeObject(marketResearchDoc.JsonResponse);

                    JsonElement marketResearchPayload;
                    try
                    {
                        marketResearchPayload = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(mrRawJson);
                    }
                    catch
                    {
                        Console.WriteLine("[GenerateCompetitorMatrix] WARNING: Failed to deserialize market research JSON. Sending empty object.");
                        marketResearchPayload = System.Text.Json.JsonSerializer.Deserialize<JsonElement>("{}");
                    }

                    var externalPayload = new
                    {
                        idea_name = startup.StartupName ?? "No name",
                        idea_description = startup.IdeaDescription ?? "No description",
                        region = startup.Region ?? "Global",
                        market_research = marketResearchPayload,
                        user_comment = input?.Comment
                    };

                    Console.WriteLine($"[GenerateCompetitorMatrix] External Payload: idea_name='{externalPayload.idea_name}' region='{externalPayload.region}'");

                    var response = await client.PostAsJsonAsync("https://spark2scale-ai-api-server.azurewebsites.net/api/v1/competitor-matrix/generate", externalPayload);
                    Console.WriteLine($"[GenerateCompetitorMatrix] External Response Status: {response.StatusCode}");

                    if (!response.IsSuccessStatusCode)
                    {
                        var error = await response.Content.ReadAsStringAsync();
                        Console.WriteLine($"[GenerateCompetitorMatrix] AI Service Failed. Error: {error}");
                        return StatusCode((int)response.StatusCode, $"AI Service Failed: {error}");
                    }

                    jsonContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[GenerateCompetitorMatrix] AI Output received (length: {jsonContent?.Length}).");
                }

                Console.WriteLine($"[GenerateCompetitorMatrix] STEP 4: Parsing JSON...");
                object jsonObjectToSave;
                try { jsonObjectToSave = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(jsonContent ?? "{}"); }
                catch { jsonObjectToSave = new { raw_output = jsonContent }; }

                Console.WriteLine($"[GenerateCompetitorMatrix] STEP 5: Updating Database...");
                try
                {
                    var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
                    var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");

                    using var http = _httpClientFactory.CreateClient();
                    http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    http.DefaultRequestHeaders.Add("Prefer", "return=representation");

                    var compDocs = await _supabase.From<Document>()
                        .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                        .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Competitor Matrix")
                        .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                        .Get();

                    var currentDoc = compDocs.Models.FirstOrDefault();
                    int nextVersion = 1;

                    if (currentDoc != null)
                    {
                        Console.WriteLine($"[GenerateCompetitorMatrix] Archiving older version: v{currentDoc.CurrentVersion}");
                        var patchUrl = $"{supabaseUrl}/rest/v1/documents?did=eq.{currentDoc.Did}";
                        var patchRequest = new HttpRequestMessage(new HttpMethod("PATCH"), patchUrl) { Content = new StringContent("{\"is_current\": false}", System.Text.Encoding.UTF8, "application/json") };
                        await http.SendAsync(patchRequest);
                        nextVersion = currentDoc.CurrentVersion + 1;
                    }

                    var newDocId = Guid.NewGuid();
                    Console.WriteLine($"[GenerateCompetitorMatrix] Creating new Competitor Matrix document v{nextVersion} with ID {newDocId}");

                    var insertPayload = new
                    {
                        did = newDocId,
                        startup_id = sId,
                        document_name = $"Competitor Matrix Analysis v{nextVersion}",
                        type = "Competitor Matrix",
                        current_path = "",
                        current_version = nextVersion,
                        canaccess = 1,
                        updated_at = DateTime.UtcNow,
                        created_at = DateTime.UtcNow,
                        is_current = true,
                        json_response = jsonObjectToSave
                    };

                    try
                    {
                        var insertRequest = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/documents") { Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(insertPayload), System.Text.Encoding.UTF8, "application/json") };
                        var docRes = await http.SendAsync(insertRequest);
                        if (!docRes.IsSuccessStatusCode)
                        {
                            var err = await docRes.Content.ReadAsStringAsync();
                            Console.WriteLine($"[GenerateCompetitorMatrix] Document inserted failed: {err}");
                        }
                        else
                        {
                            Console.WriteLine($"[GenerateCompetitorMatrix] Document inserted successfully.");
                        }
                    }
                    catch (Exception docEx)
                    {
                        Console.WriteLine($"[Ignored] Document response parsing error: {docEx.Message}");
                    }

                    try
                    {
                        var versionDoc = new DocumentVersion
                        {
                            DocumentId = newDocId,
                            StartupId = sId,
                            VersionNumber = nextVersion,
                            Path = "",
                            CreatedAt = DateTime.UtcNow,
                            GeneratedBy = "AI"
                        };
                        await _supabase.From<DocumentVersion>().Insert(versionDoc);
                        Console.WriteLine($"[GenerateCompetitorMatrix] DocumentVersion inserted successfully.");
                    }
                    catch (Exception verEx)
                    {
                        Console.WriteLine($"[Ignored] DocumentVersion save failed: {verEx.Message}");
                    }
                }
                catch (Exception dbEx)
                {
                    Console.WriteLine($"[GenerateCompetitorMatrix] Database setup error: {dbEx.Message}");
                }

                Console.WriteLine($"[GenerateCompetitorMatrix] STEP 6: Returning Success...");
                Console.WriteLine($"[GenerateCompetitorMatrix] Returning content length: {jsonContent?.Length}");
                Console.WriteLine($"========== END GENERATE COMPETITOR MATRIX ==========\n");
                return Content(jsonContent ?? "{}", "application/json", System.Text.Encoding.UTF8);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GenerateCompetitorMatrix] CRITICAL EXCEPTION CAUGHT: {ex.Message}");
                Console.WriteLine($"[GenerateCompetitorMatrix] StackTrace: {ex.StackTrace}");
                Console.WriteLine($"========== END GENERATE COMPETITOR MATRIX (ERROR) ==========\n");
                return StatusCode(500, new { error = "Internal Server Error", message = ex.Message });
            }
        }

        [HttpPost("{id}/generate-bmc")]
        public async Task<IActionResult> GenerateBmc(string id)
        {
            Console.WriteLine($"\n========== START GENERATE BMC ==========");
            Console.WriteLine($"[GenerateBmc] Invoked with ID: {id}");

            if (!Guid.TryParse(id, out Guid sId))
            {
                return BadRequest("Invalid ID format");
            }

            try
            {
                var startup = (await _supabase.From<Startup>().Where(s => s.Sid == sId).Get()).Models.FirstOrDefault();
                if (startup == null) return NotFound("Startup not found");

                var mrDocs = await _supabase.From<Document>()
                    .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                    .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Market Research")
                    .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                    .Get();

                var marketResearchDoc = mrDocs.Models.FirstOrDefault();
                if (marketResearchDoc == null || marketResearchDoc.JsonResponse == null)
                {
                    return BadRequest("Market Research document is required to generate BMC.");
                }

                JsonElement ToJsonElement(object? raw)
                {
                    if (raw == null) return System.Text.Json.JsonSerializer.Deserialize<JsonElement>("{}");
                    string s = raw is string str ? str : Newtonsoft.Json.JsonConvert.SerializeObject(raw);
                    try { return System.Text.Json.JsonSerializer.Deserialize<JsonElement>(s); }
                    catch { return System.Text.Json.JsonSerializer.Deserialize<JsonElement>("{}"); }
                }

                var marketResearchPayload = ToJsonElement(marketResearchDoc.JsonResponse);

                // Optional: Evaluation (prefer "Founder Evaluation", fall back to "Investor Evaluation")
                JsonElement? evaluationPayload = null;
                var evalDocs = await _supabase.From<Document>()
                    .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                    .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Founder Evaluation")
                    .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                    .Get();
                var evalDoc = evalDocs.Models.FirstOrDefault();
                if (evalDoc == null)
                {
                    var investorEvalDocs = await _supabase.From<Document>()
                        .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                        .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Investor Evaluation")
                        .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                        .Get();
                    evalDoc = investorEvalDocs.Models.FirstOrDefault();
                }
                if (evalDoc?.JsonResponse != null) evaluationPayload = ToJsonElement(evalDoc.JsonResponse);

                // Recommendation — from documents table (type = "Recommendation", is_current = true).
                JsonElement? recommendationPayload = null;
                var recDocs = await _supabase.From<Document>()
                    .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                    .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Recommendation")
                    .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                    .Get();
                var recDoc = recDocs.Models.FirstOrDefault();
                if (recDoc?.JsonResponse != null) recommendationPayload = ToJsonElement(recDoc.JsonResponse);

                string jsonContent = "";
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromMinutes(3);

                    var externalPayload = new
                    {
                        idea_name = startup.StartupName ?? "No name",
                        idea_description = startup.IdeaDescription ?? "No description",
                        region = startup.Region ?? "Global",
                        market_research = marketResearchPayload,
                        evaluation = evaluationPayload,
                        recommendation = recommendationPayload
                    };

                    var response = await client.PostAsJsonAsync(
                        "https://spark2scale-ai-api-server.azurewebsites.net/api/v1/bmc/generate",
                        externalPayload);

                    Console.WriteLine($"[GenerateBmc] External Response Status: {response.StatusCode}");

                    if (!response.IsSuccessStatusCode)
                    {
                        var error = await response.Content.ReadAsStringAsync();
                        return StatusCode((int)response.StatusCode, $"AI Service Failed: {error}");
                    }

                    jsonContent = await response.Content.ReadAsStringAsync();
                }

                object jsonObjectToSave;
                try { jsonObjectToSave = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(jsonContent ?? "{}"); }
                catch { jsonObjectToSave = new { raw_output = jsonContent }; }

                try
                {
                    var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
                    var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");

                    using var http = _httpClientFactory.CreateClient();
                    http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    http.DefaultRequestHeaders.Add("Prefer", "return=representation");

                    var bmcDocs = await _supabase.From<Document>()
                        .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                        .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Business Model Canvas")
                        .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                        .Get();

                    var currentDoc = bmcDocs.Models.FirstOrDefault();
                    int nextVersion = 1;

                    if (currentDoc != null)
                    {
                        var patchUrl = $"{supabaseUrl}/rest/v1/documents?did=eq.{currentDoc.Did}";
                        var patchRequest = new HttpRequestMessage(new HttpMethod("PATCH"), patchUrl) { Content = new StringContent("{\"is_current\": false}", System.Text.Encoding.UTF8, "application/json") };
                        await http.SendAsync(patchRequest);
                        nextVersion = currentDoc.CurrentVersion + 1;
                    }

                    var newDocId = Guid.NewGuid();

                    var insertPayload = new
                    {
                        did = newDocId,
                        startup_id = sId,
                        document_name = $"Business Model Canvas v{nextVersion}",
                        type = "Business Model Canvas",
                        current_path = "",
                        current_version = nextVersion,
                        canaccess = 1,
                        updated_at = DateTime.UtcNow,
                        created_at = DateTime.UtcNow,
                        is_current = true,
                        json_response = jsonObjectToSave
                    };

                    try
                    {
                        var insertRequest = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/documents") { Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(insertPayload), System.Text.Encoding.UTF8, "application/json") };
                        var docRes = await http.SendAsync(insertRequest);
                        if (!docRes.IsSuccessStatusCode)
                        {
                            var err = await docRes.Content.ReadAsStringAsync();
                            Console.WriteLine($"[GenerateBmc] Document insert failed: {err}");
                        }
                    }
                    catch (Exception docEx)
                    {
                        Console.WriteLine($"[Ignored] BMC document insert error: {docEx.Message}");
                    }

                    try
                    {
                        var versionDoc = new DocumentVersion
                        {
                            DocumentId = newDocId,
                            StartupId = sId,
                            VersionNumber = nextVersion,
                            Path = "",
                            CreatedAt = DateTime.UtcNow,
                            GeneratedBy = "AI"
                        };
                        await _supabase.From<DocumentVersion>().Insert(versionDoc);
                    }
                    catch (Exception verEx)
                    {
                        Console.WriteLine($"[Ignored] BMC DocumentVersion insert error: {verEx.Message}");
                    }
                }
                catch (Exception dbEx)
                {
                    Console.WriteLine($"[GenerateBmc] Database setup error: {dbEx.Message}");
                }

                Console.WriteLine($"========== END GENERATE BMC ==========\n");
                return Content(jsonContent ?? "{}", "application/json", System.Text.Encoding.UTF8);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GenerateBmc] CRITICAL EXCEPTION: {ex.Message}");
                return StatusCode(500, new { error = "Internal Server Error", message = ex.Message });
            }
        }

        public class EnhanceBmcDto
        {
            public Guid SessionId { get; set; }
        }

        [HttpPost("{startupId}/enhance-bmc")]
        public async Task<IActionResult> EnhanceBmc(string startupId, [FromBody] EnhanceBmcDto input)
        {
            Console.WriteLine($"\n========== START ENHANCE BMC ==========");
            Console.WriteLine($"[EnhanceBmc] startupId: {startupId}, sessionId: {input?.SessionId}");

            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid startup ID.");
            if (input == null || input.SessionId == Guid.Empty) return BadRequest("sessionId is required.");

            try
            {
                // 1. Startup (for idea_name / idea_description / region)
                var startup = (await _supabase.From<Startup>().Where(s => s.Sid == sId).Get()).Models.FirstOrDefault();
                if (startup == null) return NotFound("Startup not found");

                // 2. Chat session with summarized_chat
                var sessResult = await _supabase.From<ChatSession>()
                    .Where(x => x.SessionId == input.SessionId)
                    .Get();
                var session = sessResult.Models.FirstOrDefault();
                if (session == null) return NotFound("Chat session not found");
                if (string.IsNullOrWhiteSpace(session.SummarizedChat))
                    return BadRequest("No summarized_chat on this session. Click Enhance first.");

                // 3. Parse document_changes out of summarized_chat JSON
                List<string> documentChanges;
                try
                {
                    using var sumDoc = JsonDocument.Parse(session.SummarizedChat);
                    if (!sumDoc.RootElement.TryGetProperty("document_changes", out var changesEl)
                        || changesEl.ValueKind != JsonValueKind.Array)
                    {
                        return BadRequest("summarized_chat has no document_changes array.");
                    }
                    documentChanges = changesEl.EnumerateArray()
                        .Select(e => e.GetString() ?? string.Empty)
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .ToList();
                }
                catch (Exception parseEx)
                {
                    return BadRequest($"Could not parse summarized_chat: {parseEx.Message}");
                }

                if (!documentChanges.Any())
                    return BadRequest("No actionable changes in summarized_chat.");

                // 4. Current BMC document
                var bmcDocs = await _supabase.From<Document>()
                    .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, sId.ToString())
                    .Filter("type", Supabase.Postgrest.Constants.Operator.Equals, "Business Model Canvas")
                    .Filter("is_current", Supabase.Postgrest.Constants.Operator.Equals, "true")
                    .Get();
                var currentBmcDoc = bmcDocs.Models.FirstOrDefault();
                if (currentBmcDoc?.JsonResponse == null)
                    return BadRequest("No current BMC found. Generate BMC first.");

                JsonElement currentBmcPayload;
                try
                {
                    string bmcRawJson = currentBmcDoc.JsonResponse is string s
                        ? s
                        : Newtonsoft.Json.JsonConvert.SerializeObject(currentBmcDoc.JsonResponse);
                    currentBmcPayload = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(bmcRawJson);
                }
                catch (Exception convEx)
                {
                    return StatusCode(500, $"Could not serialize current BMC: {convEx.Message}");
                }

                // 5. Call AI /api/v1/bmc/enhance
                string jsonContent;
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromMinutes(3);

                    var externalPayload = new
                    {
                        idea_name = startup.StartupName ?? "No name",
                        idea_description = startup.IdeaDescription ?? "No description",
                        region = startup.Region ?? "Global",
                        current_bmc = currentBmcPayload,
                        document_changes = documentChanges
                    };

                    var response = await client.PostAsJsonAsync(
                        "https://spark2scale-ai-api-server.azurewebsites.net/api/v1/bmc/enhance",
                        externalPayload);

                    Console.WriteLine($"[EnhanceBmc] AI status: {response.StatusCode}");

                    if (!response.IsSuccessStatusCode)
                    {
                        var err = await response.Content.ReadAsStringAsync();
                        return StatusCode((int)response.StatusCode, $"AI enhance failed: {err}");
                    }

                    jsonContent = await response.Content.ReadAsStringAsync();
                }

                // 6. Parse AI response (for change_log + validation)
                object jsonObjectToSave;
                try { jsonObjectToSave = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(jsonContent ?? "{}"); }
                catch { jsonObjectToSave = new { raw_output = jsonContent }; }

                // 7. Save as new BMC version (archive old, insert new) — same pattern as GenerateBmc
                try
                {
                    var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? Environment.GetEnvironmentVariable("URL");
                    var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? Environment.GetEnvironmentVariable("KEY");

                    using var http = _httpClientFactory.CreateClient();
                    http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    http.DefaultRequestHeaders.Add("Prefer", "return=representation");

                    int nextVersion = (currentBmcDoc.CurrentVersion) + 1;

                    // Archive old current doc
                    var patchUrl = $"{supabaseUrl}/rest/v1/documents?did=eq.{currentBmcDoc.Did}";
                    var patchRequest = new HttpRequestMessage(new HttpMethod("PATCH"), patchUrl)
                    {
                        Content = new StringContent("{\"is_current\": false}", System.Text.Encoding.UTF8, "application/json")
                    };
                    await http.SendAsync(patchRequest);

                    var newDocId = Guid.NewGuid();
                    var insertPayload = new
                    {
                        did = newDocId,
                        startup_id = sId,
                        document_name = $"Business Model Canvas v{nextVersion}",
                        type = "Business Model Canvas",
                        current_path = "",
                        current_version = nextVersion,
                        canaccess = 1,
                        updated_at = DateTime.UtcNow,
                        created_at = DateTime.UtcNow,
                        is_current = true,
                        json_response = jsonObjectToSave
                    };

                    try
                    {
                        var insertRequest = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/documents")
                        {
                            Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(insertPayload),
                                System.Text.Encoding.UTF8, "application/json")
                        };
                        var docRes = await http.SendAsync(insertRequest);
                        if (!docRes.IsSuccessStatusCode)
                        {
                            var err = await docRes.Content.ReadAsStringAsync();
                            Console.WriteLine($"[EnhanceBmc] Document insert failed: {err}");
                        }
                    }
                    catch (Exception docEx)
                    {
                        Console.WriteLine($"[Ignored] BMC enhance insert error: {docEx.Message}");
                    }

                    try
                    {
                        var versionDoc = new DocumentVersion
                        {
                            DocumentId = newDocId,
                            StartupId = sId,
                            VersionNumber = nextVersion,
                            Path = "",
                            CreatedAt = DateTime.UtcNow,
                            GeneratedBy = "AI"
                        };
                        await _supabase.From<DocumentVersion>().Insert(versionDoc);
                    }
                    catch (Exception verEx)
                    {
                        Console.WriteLine($"[Ignored] BMC enhance DocumentVersion insert error: {verEx.Message}");
                    }
                }
                catch (Exception dbEx)
                {
                    Console.WriteLine($"[EnhanceBmc] Database error: {dbEx.Message}");
                }

                Console.WriteLine($"========== END ENHANCE BMC ==========\n");
                return Content(jsonContent ?? "{}", "application/json", System.Text.Encoding.UTF8);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EnhanceBmc] CRITICAL EXCEPTION: {ex.Message}");
                return StatusCode(500, new { error = "Internal Server Error", message = ex.Message });
            }
        }

        // --- RESTORED UPLOAD HELPER ---
        private async Task<string> UploadHelper(IFormFile file, string prefix, Guid sId)
        {
            var fileName = $"{sId}/{DateTime.Now.Ticks}_{prefix}.pdf";
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            await _supabase.Storage.From("startup-docs").Upload(ms.ToArray(), fileName);
            return _supabase.Storage.From("startup-docs").GetPublicUrl(fileName);
        }

        // --- UPDATED CREATE DOC HELPER ---
        // Parameter changed to `object parsedJson` to accept Newtonsoft objects
        private async Task CreateDocHelper(string type, string url, int access, Guid sId, object parsedJson)
        {
            var docId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            // Archive existing docs of this type
            var existingDocs = await _supabase.From<Document>()
            .Where(x => x.StartupId == sId)
            .Where(x => x.Type == type)
            .Where(x => x.IsCurrent == true)
            .Get();

            var currentDoc = existingDocs.Models.FirstOrDefault();
            int nextVersion = 1;

            if (currentDoc != null)
            {
                currentDoc.IsCurrent = false;
                await _supabase.From<Document>().Update(currentDoc);
                nextVersion = currentDoc.CurrentVersion + 1;
            }

            // Insert the Document (using the parsedJson object)
            var doc = new Document
            {
                Did = docId,
                StartupId = sId,
                DocumentName = type + $" v{nextVersion}.pdf",
                Type = type,
                CurrentPath = url,
                CurrentVersion = nextVersion,
                CanAccess = access,
                UpdatedAt = now,
                CreatedAt = now,
                IsCurrent = true,
                JsonResponse = parsedJson // Clean object
            };

            // FIX: Upsert forces Supabase to respect your exact local docId!
            await _supabase.From<Document>().Upsert(doc);

            // Insert the Version
            var versionDoc = new DocumentVersion
            {
                DocumentId = docId, // Now perfectly matches the parent!
                StartupId = sId,
                VersionNumber = nextVersion,
                Path = url,
                CreatedAt = now,
                GeneratedBy = "AI"
            };
            await _supabase.From<DocumentVersion>().Insert(versionDoc);
        }

        [HttpGet("grouped")]
        public async Task<IActionResult> GetGroupedDocuments([FromQuery] string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            try
            {
                // 1. Fetch all current documents for this startup
                var docsResult = await _supabase.From<Document>()
                    .Where(x => x.StartupId == sId)
                    .Where(x => x.IsCurrent == true)
                    .Order("updated_at", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();

                var currentDocs = docsResult.Models;

                // 2. Fetch all versions history
                var versionsResult = await _supabase.From<DocumentVersion>()
                    .Where(x => x.StartupId == sId)
                    .Order("version_number", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();

                var allVersions = versionsResult.Models;

                // 3. Map them together exactly how React wants them
                var dtos = currentDocs.Select(d =>
                {
                    // Safely convert whatever JSON format Supabase returned into a string
                    string? jsonString = null;
                    if (d.JsonResponse != null)
                    {
                        if (d.JsonResponse is Newtonsoft.Json.Linq.JToken jToken)
                            jsonString = jToken.ToString(Newtonsoft.Json.Formatting.None);
                        else if (d.JsonResponse is System.Text.Json.JsonElement je)
                            jsonString = je.GetRawText();
                        else if (d.JsonResponse is string str)
                            jsonString = str;
                        else
                            jsonString = JsonConvert.SerializeObject(d.JsonResponse);
                    }

                    return new
                    {
                        did = d.Did,
                        startup_id = d.StartupId,
                        document_name = d.DocumentName,
                        type = d.Type,
                        current_path = d.CurrentPath,
                        current_version = d.CurrentVersion,
                        updated_at = d.UpdatedAt,
                        json_response = jsonString, // <--- This allows React to see it's an AI document!

                        // Attach the nested versions array
                        versions = allVersions
                            .Where(v => v.DocumentId == d.Did)
                            .Select(v => new
                            {
                                vid = v.Vid,
                                version_number = v.VersionNumber,
                                path = v.Path,
                                created_at = v.CreatedAt,
                                is_public = v.IsPublic
                            }).ToList()
                    };
                });

                return Ok(dtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error grouping docs: {ex.Message}");
            }
        }
    }

    public class SaveAIResponseDto
    {
        public Guid StartupId { get; set; }
        public string? Type { get; set; }
        public object Content { get; set; }
    }

    public class GenerateDocumentDto
    {
        public string? Comment { get; set; }
    }
}