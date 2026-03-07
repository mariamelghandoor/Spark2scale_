using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using Spark2Scale_.Server.Services;
using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.Json;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PptGenerationController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly AccessControlService _access;
        private readonly IHttpClientFactory _httpClientFactory;
        private const string AI_SERVER_BASE = "https://spark2scale-ai-server.azurewebsites.net";

        public PptGenerationController(
            Supabase.Client supabase,
            AccessControlService access,
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

        [HttpPost("generate/{startupId}")]
        public async Task<IActionResult> GeneratePpt(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId))
                return BadRequest(new { message = "Invalid Startup ID." });

            if (!await _access.IsFounderOrOwner(GetToken(), sId))
                return Unauthorized(new { message = "Only the startup founder can generate presentations." });

            try
            {
                var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")
                               ?? Environment.GetEnvironmentVariable("URL");
                var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY")
                               ?? Environment.GetEnvironmentVariable("KEY");

                if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
                    return StatusCode(500, new { message = "Server configuration error." });

                // ----------------------------------------------------------------
                // 1. Fetch startup json_response & logo_path
                // ----------------------------------------------------------------
                using var rawClient = new HttpClient();
                rawClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
                rawClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                var startupRes = await rawClient.GetAsync(
                    $"{supabaseUrl}/rest/v1/startups?select=json_response,logo_path&sid=eq.{sId}");

                if (!startupRes.IsSuccessStatusCode)
                    return StatusCode(500, new { message = "Failed to fetch startup data." });

                var startupBody = await startupRes.Content.ReadAsStringAsync();
                var startupArray = JsonNode.Parse(startupBody)?.AsArray();

                if (startupArray == null || startupArray.Count == 0)
                    return NotFound(new { message = "Startup not found." });

                var startupObj = startupArray[0]?.AsObject();
                var startupInfoNode = startupObj?["json_response"];
                var logoPath = startupObj?["logo_path"]?.ToString();

                if (startupInfoNode == null)
                    return BadRequest(new
                    {
                        message = "Startup has no evaluation data yet. Please complete the Idea Check stage first."
                    });

                // ----------------------------------------------------------------
                // 2. Fetch Market Research document json_response
                // ----------------------------------------------------------------
                var docsRes = await rawClient.GetAsync(
                    $"{supabaseUrl}/rest/v1/documents" +
                    $"?select=json_response" +
                    $"&startup_id=eq.{sId}" +
                    $"&type=eq.Market Research" +
                    $"&is_current=eq.true" +
                    $"&limit=1");

                if (!docsRes.IsSuccessStatusCode)
                    return StatusCode(500, new { message = "Failed to fetch market research data." });

                var docsBody = await docsRes.Content.ReadAsStringAsync();
                var docsArray = JsonNode.Parse(docsBody)?.AsArray();

                if (docsArray == null || docsArray.Count == 0)
                    return BadRequest(new
                    {
                        message = "No Market Research document found. Please complete the Market Research stage first."
                    });

                var marketResearchNode = docsArray[0]?["json_response"];
                if (marketResearchNode == null)
                    return BadRequest(new { message = "Market Research document contains no structured data." });

                // ----------------------------------------------------------------
                // 3. Build multipart/form-data for the AI PPT endpoint
                // ----------------------------------------------------------------
                using var multipartContent = new MultipartFormDataContent();

                multipartContent.Add(new StringContent(sId.ToString()), "startup_id");

                var startupInfoBytes = Encoding.UTF8.GetBytes(startupInfoNode.ToJsonString());
                var startupInfoPart = new ByteArrayContent(startupInfoBytes);
                startupInfoPart.Headers.ContentType =
                    new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
                multipartContent.Add(startupInfoPart, "startup_info_file", "startup_info.json");

                var marketBytes = Encoding.UTF8.GetBytes(marketResearchNode.ToJsonString());
                var marketPart = new ByteArrayContent(marketBytes);
                marketPart.Headers.ContentType =
                    new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
                multipartContent.Add(marketPart, "market_research_file", "market_research.json");

                bool hasLogo = !string.IsNullOrWhiteSpace(logoPath);
                if (hasLogo)
                {
                    try
                    {
                        var logoBytes = await rawClient.GetByteArrayAsync(logoPath);
                        var extension = Path.GetExtension(logoPath!).ToLowerInvariant();
                        var mimeType = extension switch
                        {
                            ".jpg" or ".jpeg" => "image/jpeg",
                            ".gif" => "image/gif",
                            ".webp" => "image/webp",
                            _ => "image/png"
                        };
                        var logoPart = new ByteArrayContent(logoBytes);
                        logoPart.Headers.ContentType =
                            new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
                        multipartContent.Add(logoPart, "logo", $"logo{extension}");
                        multipartContent.Add(new StringContent("false"), "use_default_colors");
                        Console.WriteLine($"[PptGeneration] Logo attached from: {logoPath}");
                    }
                    catch (Exception logoEx)
                    {
                        Console.WriteLine($"[PptGeneration] Could not download logo, proceeding without it: {logoEx.Message}");
                        hasLogo = false;
                    }
                }

                if (!hasLogo)
                    multipartContent.Add(new StringContent("true"), "use_default_colors");

                // ----------------------------------------------------------------
                // 4. Call AI server
                // ----------------------------------------------------------------
                var aiClient = _httpClientFactory.CreateClient("AiServer");
                aiClient.Timeout = TimeSpan.FromMinutes(10);

                Console.WriteLine("[PptGeneration] Calling AI server...");
                var aiResponse = await aiClient.PostAsync(
                    $"{AI_SERVER_BASE}/api/v1/ppt/generate/upload",
                    multipartContent);

                var aiBody = await aiResponse.Content.ReadAsStringAsync();
                Console.WriteLine($"[PptGeneration] AI response ({(int)aiResponse.StatusCode}): {aiBody[..Math.Min(300, aiBody.Length)]}");

                if (!aiResponse.IsSuccessStatusCode)
                {
                    if ((int)aiResponse.StatusCode == 429)
                        return StatusCode(429, new { message = "AI quota exceeded. Please wait a minute and try again." });
                    return StatusCode(500, new { message = $"AI server error: {aiBody}" });
                }

                var aiResult = JsonNode.Parse(aiBody)?.AsObject();
                var aiStatus = aiResult?["status"]?.ToString();

                if (aiStatus != "success")
                    return StatusCode(500, new { message = "PPT generation did not complete successfully." });

                var pptPath = aiResult?["ppt_path"]?.ToString();
                var pptTitle = aiResult?["title"]?.ToString() ?? "AI Pitch Deck";

                if (string.IsNullOrEmpty(pptPath))
                    return StatusCode(500, new { message = "AI server did not return a file path." });

                // ----------------------------------------------------------------
                // 5. AI already uploaded to Supabase and returned the public URL
                // ----------------------------------------------------------------
                var publicUrl = pptPath;
                Console.WriteLine($"[PptGeneration] PPT already in Supabase at: {publicUrl}");

                // ----------------------------------------------------------------
                // 6. Upsert document record (archive previous PPT first)
                // ----------------------------------------------------------------
                var now = DateTime.UtcNow;

                await _supabase.From<Document>()
                    .Where(d => d.StartupId == sId && d.Type == "Pitch Deck (PPT)")
                    .Set(d => d.IsCurrent, false)
                    .Update();

                var insertOptions = new Supabase.Postgrest.QueryOptions
                {
                    Returning = Supabase.Postgrest.QueryOptions.ReturnType.Representation
                };

                var newDoc = new Document
                {
                    StartupId = sId,
                    DocumentName = $"{pptTitle}.pptx",
                    Type = "Pitch Deck (PPT)",
                    CurrentPath = publicUrl,
                    CurrentVersion = 1,
                    CanAccess = 1,
                    UpdatedAt = now,
                    CreatedAt = now,
                    IsCurrent = true
                };

                var inserted = await _supabase.From<Document>().Insert(newDoc, insertOptions);
                var createdDoc = inserted.Models.FirstOrDefault();

                if (createdDoc != null)
                {
                    await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                    {
                        DocumentId = createdDoc.Did,
                        StartupId = sId,
                        VersionNumber = 1,
                        Path = publicUrl,
                        CreatedAt = now,
                        GeneratedBy = "AI-PPT"
                    });
                }

                Console.WriteLine($"[PptGeneration] Done. Stored at: {publicUrl}");
                return Ok(new
                {
                    message = "Pitch deck presentation generated successfully.",
                    ppt_url = publicUrl,
                    title = pptTitle,
                    document_id = createdDoc?.Did.ToString()
                });
            }
            catch (TaskCanceledException)
            {
                return StatusCode(504, new { message = "PPT generation timed out. Please try again." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PptGeneration] ERROR: {ex.Message}");
                return StatusCode(500, new { message = $"Unexpected error: {ex.Message}" });
            }
        }

        [HttpGet("status/{startupId}")]
        public async Task<IActionResult> GetPptStatus(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId))
                return BadRequest(new { message = "Invalid Startup ID." });

            try
            {
                var result = await _supabase.From<Document>()
                    .Select("did,document_name,current_path,updated_at")
                    .Where(d => d.StartupId == sId && d.Type == "Pitch Deck (PPT)" && d.IsCurrent == true)
                    .Get();

                var doc = result.Models.FirstOrDefault();
                return Ok(new
                {
                    has_ppt = doc != null,
                    ppt_url = doc?.CurrentPath,
                    document_name = doc?.DocumentName,
                    updated_at = doc?.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("edit/{startupId}")]
        public async Task<IActionResult> EditPpt(string startupId, IFormFile pptFile)
        {
            if (!Guid.TryParse(startupId, out Guid sId))
                return BadRequest(new { message = "Invalid Startup ID." });

            if (!await _access.IsFounderOrOwner(GetToken(), sId))
                return Unauthorized(new { message = "Only the startup founder can edit presentations." });

            if (pptFile == null || pptFile.Length == 0)
                return BadRequest(new { message = "No PPT file provided." });

            try
            {
                // ----------------------------------------------------------------
                // 1. Read uploaded PPT bytes
                // ----------------------------------------------------------------
                byte[] pptBytes;
                using (var ms = new MemoryStream())
                {
                    await pptFile.CopyToAsync(ms);
                    pptBytes = ms.ToArray();
                }

                // ----------------------------------------------------------------
                // 2. Fetch logo_path for branding
                // ----------------------------------------------------------------
                var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")
                               ?? Environment.GetEnvironmentVariable("URL");
                var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY")
                               ?? Environment.GetEnvironmentVariable("KEY");

                if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
                    return StatusCode(500, new { message = "Server configuration error." });

                using var rawClient = new HttpClient();
                rawClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
                rawClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                var startupRes = await rawClient.GetAsync(
                    $"{supabaseUrl}/rest/v1/startups?select=logo_path&sid=eq.{sId}");

                string? logoPath = null;
                if (startupRes.IsSuccessStatusCode)
                {
                    var body = await startupRes.Content.ReadAsStringAsync();
                    var arr = JsonNode.Parse(body)?.AsArray();
                    logoPath = arr?[0]?["logo_path"]?.ToString();
                }

                // ----------------------------------------------------------------
                // 3. Build multipart for AI edit endpoint
                // ----------------------------------------------------------------
                using var multipartContent = new MultipartFormDataContent();

                multipartContent.Add(new StringContent(sId.ToString()), "startup_id");

                var pptPart = new ByteArrayContent(pptBytes);
                pptPart.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation");
                multipartContent.Add(pptPart, "ppt_file", pptFile.FileName);

                bool hasLogo = !string.IsNullOrWhiteSpace(logoPath);
                if (hasLogo)
                {
                    try
                    {
                        var logoBytes = await rawClient.GetByteArrayAsync(logoPath);
                        var extension = Path.GetExtension(logoPath!).ToLowerInvariant();
                        var mimeType = extension switch
                        {
                            ".jpg" or ".jpeg" => "image/jpeg",
                            ".gif" => "image/gif",
                            ".webp" => "image/webp",
                            _ => "image/png"
                        };
                        var logoPart = new ByteArrayContent(logoBytes);
                        logoPart.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
                        multipartContent.Add(logoPart, "logo", $"logo{extension}");
                        multipartContent.Add(new StringContent("false"), "use_default_colors");
                    }
                    catch
                    {
                        hasLogo = false;
                    }
                }

                if (!hasLogo)
                    multipartContent.Add(new StringContent("true"), "use_default_colors");

                // ----------------------------------------------------------------
                // 4. Call AI edit endpoint
                // ----------------------------------------------------------------
                var aiClient = _httpClientFactory.CreateClient("AiServer");
                aiClient.Timeout = TimeSpan.FromMinutes(10);

                Console.WriteLine("[PptEdit] Calling AI edit endpoint...");
                var aiResponse = await aiClient.PostAsync(
                    $"{AI_SERVER_BASE}/api/v1/ppt/edit",
                    multipartContent);

                var aiBody = await aiResponse.Content.ReadAsStringAsync();
                Console.WriteLine($"[PptEdit] AI response ({(int)aiResponse.StatusCode}): {aiBody[..Math.Min(300, aiBody.Length)]}");

                if (!aiResponse.IsSuccessStatusCode)
                {
                    if ((int)aiResponse.StatusCode == 429)
                        return StatusCode(429, new { message = "AI quota exceeded. Please wait a minute and try again." });
                    return StatusCode(500, new { message = $"AI server error: {aiBody}" });
                }

                var aiResult = JsonNode.Parse(aiBody)?.AsObject();
                var aiStatus = aiResult?["status"]?.ToString();

                if (aiStatus != "success")
                    return StatusCode(500, new { message = "PPT edit did not complete successfully." });

                var pptPath = aiResult?["ppt_path"]?.ToString();
                var pptTitle = aiResult?["title"]?.ToString() ?? "AI Enhanced Pitch Deck";

                if (string.IsNullOrEmpty(pptPath))
                    return StatusCode(500, new { message = "AI server did not return a file path." });

                // ----------------------------------------------------------------
                // 5. Archive previous & upsert document record
                // ----------------------------------------------------------------
                var now = DateTime.UtcNow;

                await _supabase.From<Document>()
                    .Where(d => d.StartupId == sId && d.Type == "Pitch Deck (PPT)")
                    .Set(d => d.IsCurrent, false)
                    .Update();

                var insertOptions = new Supabase.Postgrest.QueryOptions
                {
                    Returning = Supabase.Postgrest.QueryOptions.ReturnType.Representation
                };

                var newDoc = new Document
                {
                    StartupId = sId,
                    DocumentName = $"{pptTitle}.pptx",
                    Type = "Pitch Deck (PPT)",
                    CurrentPath = pptPath,
                    CurrentVersion = 1,
                    CanAccess = 1,
                    UpdatedAt = now,
                    CreatedAt = now,
                    IsCurrent = true
                };

                var inserted = await _supabase.From<Document>().Insert(newDoc, insertOptions);
                var createdDoc = inserted.Models.FirstOrDefault();

                if (createdDoc != null)
                {
                    await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                    {
                        DocumentId = createdDoc.Did,
                        StartupId = sId,
                        VersionNumber = 1,
                        Path = pptPath,
                        CreatedAt = now,
                        GeneratedBy = "AI-PPT-Edit"
                    });
                }

                Console.WriteLine($"[PptEdit] Done. Stored at: {pptPath}");
                return Ok(new
                {
                    message = "Pitch deck enhanced successfully.",
                    ppt_url = pptPath,
                    title = pptTitle,
                    document_id = createdDoc?.Did.ToString()
                });
            }
            catch (TaskCanceledException)
            {
                return StatusCode(504, new { message = "PPT edit timed out. Please try again." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PptEdit] ERROR: {ex.Message}");
                return StatusCode(500, new { message = $"Unexpected error: {ex.Message}" });
            }
        }
    }
}