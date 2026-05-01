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

            try
            {
                var fileName = $"{sId}/{DateTime.Now.Ticks}_{form.File.FileName}";
                byte[] fileBytes;
                using (var ms = new MemoryStream()) { await form.File.CopyToAsync(ms); fileBytes = ms.ToArray(); }

                await _supabase.Storage.From("startup-docs").Upload(fileBytes, fileName);
                var publicUrl = _supabase.Storage.From("startup-docs").GetPublicUrl(fileName);
                var now = DateTime.UtcNow;

                if (!string.IsNullOrEmpty(form.DocumentId) && Guid.TryParse(form.DocumentId, out Guid dId))
                {
                    var existingRes = await _supabase.From<Document>().Where(x => x.Did == dId).Get();
                    var currentDoc = existingRes.Models.FirstOrDefault();
                    if (currentDoc != null)
                    {
                        currentDoc.CurrentPath = publicUrl;
                        currentDoc.CurrentVersion++;
                        currentDoc.UpdatedAt = now;
                        await _supabase.From<Document>().Upsert(currentDoc);

                        await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                        {
                            DocumentId = dId,
                            StartupId = sId,
                            VersionNumber = currentDoc.CurrentVersion,
                            Path = publicUrl,
                            CreatedAt = now,
                            GeneratedBy = "manual"
                        });

                        return Ok(new { message = "Version updated" });
                    }
                }

                var newDid = Guid.NewGuid();
                var newDoc = new Document { Did = newDid, StartupId = sId, DocumentName = form.DocName, Type = form.Type, CurrentPath = publicUrl, CurrentVersion = 1, CanAccess = 1, UpdatedAt = now, CreatedAt = now, IsCurrent = true };
                await _supabase.From<Document>().Insert(newDoc);

                await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                {
                    DocumentId = newDid,
                    StartupId = sId,
                    VersionNumber = 1,
                    Path = publicUrl,
                    CreatedAt = now,
                    GeneratedBy = "manual"
                });

                return Ok(new { message = "File created" });
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
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