using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PptGenerationController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly Services.AccessControlService _access;
        private readonly IHttpClientFactory _httpClientFactory;

        // Configuration for the Python AI Service
        private const string AiServiceUrl = "https://spark2scale-ai-server.azurewebsites.net/docs#/Presentation%20Generation/generate_ppt_from_files_api_v1_ppt_generate_upload_post";

        public PptGenerationController(Supabase.Client supabase, Services.AccessControlService access, IHttpClientFactory httpClientFactory)
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
        public async Task<IActionResult> GeneratePpt(Guid startupId)
        {
            // 1. Auth Check
            if (!await _access.IsFounderOrOwner(GetToken(), startupId))
                return Unauthorized(new { message = "Unauthorized generation request." });

            try
            {
                // 2. Fetch Startup Info (JSON Response) & Logo Path
                var startupResponse = await _supabase.From<Startup>()
                    .Where(x => x.Sid == startupId)
                    .Get();
                var startup = startupResponse.Models.FirstOrDefault();

                if (startup == null) return NotFound("Startup not found.");
                if (startup.json_response == null) return BadRequest("Startup Info (JSON) is missing. Please complete the Idea Check/Workflow first.");

                // 3. Fetch Market Research Document (JSON Response)
                var docResponse = await _supabase.From<Document>()
                    .Where(x => x.StartupId == startupId && x.Type == "Market Research" && x.IsCurrent == true)
                    .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();
                var marketDoc = docResponse.Models.FirstOrDefault();

                if (marketDoc == null || marketDoc.json_response == null)
                    return BadRequest("Market Research data is missing. Please complete the Market Research phase.");

                // 4. Prepare HTTP Client for Python Service
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromMinutes(5); // Generation might take time

                using var content = new MultipartFormDataContent();

                // A. Add Startup Info (as file)
                string startupJsonString = JsonConvert.SerializeObject(startup.json_response);
                var startupContent = new ByteArrayContent(Encoding.UTF8.GetBytes(startupJsonString));
                startupContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
                content.Add(startupContent, "startup_info", "startup_info.json");

                // B. Add Market Research (as file)
                string marketJsonString = JsonConvert.SerializeObject(marketDoc.json_response);
                var marketContent = new ByteArrayContent(Encoding.UTF8.GetBytes(marketJsonString));
                marketContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
                content.Add(marketContent, "market_research", "market_research.json");

                // C. Add Logo (Optional)
                if (!string.IsNullOrEmpty(startup.LogoPath))
                {
                    try
                    {
                        // FIX: Explicitly cast null to EventHandler<float> to resolve CS0121 ambiguity
                        // The compiler was confused between Download(string, EventHandler) and Download(string, TransformOptions)
                        byte[] logoBytes = await _supabase.Storage
                            .From("logos")
                            .Download(startup.LogoPath, (EventHandler<float>)null);

                        var logoContent = new ByteArrayContent(logoBytes);

                        // Determine extension (png/jpg)
                        string extension = Path.GetExtension(startup.LogoPath).ToLower();
                        if (string.IsNullOrEmpty(extension)) extension = ".png";
                        string mimeType = extension == ".png" ? "image/png" : "image/jpeg";

                        logoContent.Headers.ContentType = MediaTypeHeaderValue.Parse(mimeType);
                        content.Add(logoContent, "logo", $"logo{extension}");

                        // Tell Python to use logo colors
                        content.Add(new StringContent("false"), "use_default_colors");
                    }
                    catch (Exception ex)
                    {
                        // If logo download fails, log it but proceed without logo
                        Console.WriteLine($"Logo download failed: {ex.Message}");
                        content.Add(new StringContent("true"), "use_default_colors");
                    }
                }
                else
                {
                    content.Add(new StringContent("true"), "use_default_colors");
                }

                // 5. Call Python AI Service
                var aiResponse = await client.PostAsync(AiServiceUrl, content);

                if (!aiResponse.IsSuccessStatusCode)
                {
                    var errorDetails = await aiResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)aiResponse.StatusCode, $"AI Service Error: {errorDetails}");
                }

                // 6. Handle AI Response (Expecting File Stream)
                var pptBytes = await aiResponse.Content.ReadAsByteArrayAsync();

                // 7. Upload Result to Supabase Storage
                string timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
                string fileName = $"{startupId}/Generated_Pitch_{timestamp}.pptx";

                // Upload to 'startup-docs' bucket
                await _supabase.Storage.From("startup-docs").Upload(pptBytes, fileName);
                string publicUrl = _supabase.Storage.From("startup-docs").GetPublicUrl(fileName);

                // 8. Create Document Record in DB
                var newDoc = new Document
                {
                    StartupId = startupId,
                    DocumentName = "AI Generated Pitch Deck",
                    Type = "Pitch Deck",
                    CurrentPath = publicUrl,
                    CurrentVersion = 1,
                    CanAccess = 1, // 1 = Public/Visible
                    UpdatedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    IsCurrent = true
                };

                await _supabase.From<Document>().Insert(newDoc);

                return Ok(new
                {
                    message = "Pitch Deck generated and saved successfully.",
                    url = publicUrl,
                    document = newDoc
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal Server Error: {ex.Message}");
            }
        }
    }
}