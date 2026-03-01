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

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly Client _supabase;
        private readonly Spark2Scale_.Server.Services.AccessControlService _access;
        private readonly IHttpClientFactory _httpClientFactory;

        private const string SAFE_COLS = "did,startup_id,document_name,type,current_path,current_version,canaccess,updated_at,created_at,is_current";

        public DocumentsController(
            Client supabase,
            Spark2Scale_.Server.Services.AccessControlService access,
            IHttpClientFactory httpClientFactory)
        {
            _supabase = supabase;
            _access = access;
            _httpClientFactory = httpClientFactory;
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
                        current_path = path,
                        current_version = d.CurrentVersion,
                        canaccess = d.CanAccess,
                        updated_at = d.UpdatedAt,
                        access_status = accessStatus,
                        json_response = jsonString
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

                // 1. Safely Parse the JSON String into a strong JSON element
                System.Text.Json.JsonElement? finalJsonElement = null;

                if (!string.IsNullOrWhiteSpace(input.JsonResponse))
                {
                    try
                    {
                        // Use System.Text.Json to strictly parse the string into a valid JSON Document
                        using (System.Text.Json.JsonDocument document = System.Text.Json.JsonDocument.Parse(input.JsonResponse))
                        {
                            finalJsonElement = document.RootElement.Clone();
                        }
                    }
                    catch (System.Text.Json.JsonException jsonEx)
                    {
                        Console.WriteLine($"Failed to parse AI JSON. Falling back to wrapper. Error: {jsonEx.Message}");
                        // Fallback wrapper if the string is completely mangled
                        finalJsonElement = System.Text.Json.JsonDocument.Parse($"{{\"raw_output\": {System.Text.Json.JsonSerializer.Serialize(input.JsonResponse)}}}").RootElement.Clone();
                    }
                }

                // 2. Pass the strongly parsed JsonElement down to the helper
                await CreateDocHelper("Founder Evaluation", founderUrl, 0, sId, finalJsonElement);
                await CreateDocHelper("Investor Evaluation", investorUrl, 1, sId, finalJsonElement);

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving evaluations: {ex.Message}");
                return StatusCode(500, new { success = false, message = ex.Message });
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
        private async Task CreateDocHelper(string type, string url, int access, Guid sId, System.Text.Json.JsonElement? parsedJson)
        {
            var docId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            // Archive existing docs of this type
            var existingDocs = await _supabase.From<Document>()
                .Where(x => x.StartupId == sId && x.Type == type && x.IsCurrent == true)
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
                JsonResponse = parsedJson // This is now a clean JsonElement!
            };
            await _supabase.From<Document>().Insert(doc);

            // Insert the Version
            var versionDoc = new DocumentVersion
            {
                DocumentId = docId,
                StartupId = sId,
                VersionNumber = nextVersion,
                Path = url,
                CreatedAt = now,
                GeneratedBy = "AI"
            };
            await _supabase.From<DocumentVersion>().Insert(versionDoc);
        }
    }

    public class SaveAIResponseDto
    {
        public Guid StartupId { get; set; }
        public string? Type { get; set; }
        public object Content { get; set; }
    }
}