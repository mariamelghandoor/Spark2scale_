using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Spark2Scale_.Server.Services;
using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    // Server-side proxy to the external AI server's PDF extraction endpoint.
    // Calling the AI server directly from the browser is blocked by CORS;
    // routing through the .NET backend (server-to-server) avoids that.
    [ApiController]
    [Route("api/[controller]")]
    public class PdfController : ControllerBase
    {
        private const string AI_SERVER_BASE = "https://spark2scale-ai-api-server.azurewebsites.net";

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AccessControlService _access;
        private readonly ILogger<PdfController> _logger;

        public PdfController(
            IHttpClientFactory httpClientFactory,
            AccessControlService access,
            ILogger<PdfController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _access = access;
            _logger = logger;
        }

        private string GetToken()
        {
            var header = Request.Headers["Authorization"].FirstOrDefault();
            return header?.StartsWith("Bearer ") == true ? header.Substring(7) : "";
        }

        [HttpPost("extract")]
        public async Task<IActionResult> ExtractFromPdf(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "No file." });

            // Any authenticated user can use this — they're typically about to create a startup,
            // so there's no startup_id to authorise against yet. Just require a valid token.
            var token = GetToken();
            var userId = await _access.GetUserId(token);
            if (string.IsNullOrEmpty(userId)) return Unauthorized(new { message = "Authentication required." });

            try
            {
                using var http = _httpClientFactory.CreateClient();
                http.Timeout = TimeSpan.FromMinutes(2);

                // The AI server's /extract-from-pdf now requires authentication —
                // forward the caller's Supabase Bearer token to it.
                http.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);

                using var content = new MultipartFormDataContent();
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var fileContent = new ByteArrayContent(ms.ToArray());
                fileContent.Headers.ContentType =
                    new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType ?? "application/pdf");
                content.Add(fileContent, "file", file.FileName);

                var aiResp = await http.PostAsync($"{AI_SERVER_BASE}/api/v1/pdf/extract-from-pdf", content);
                var body = await aiResp.Content.ReadAsStringAsync();

                if (!aiResp.IsSuccessStatusCode)
                {
                    _logger.LogError("[Pdf.Extract] AI server {Status}: {Body}", aiResp.StatusCode, body);
                    return StatusCode((int)aiResp.StatusCode, new { message = "AI extraction failed.", detail = body });
                }

                return Content(body, aiResp.Content.Headers.ContentType?.ToString() ?? "application/json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Pdf.Extract] Unhandled exception");
                return StatusCode(500, new { message = "PDF extraction failed.", detail = ex.Message });
            }
        }

        // Proxies the evaluation report generator. The AI server returns a ZIP
        // containing the founder/investor PDFs; we stream the bytes straight back.
        [HttpPost("generate-report")]
        public async Task<IActionResult> GenerateReport()
        {
            var token = GetToken();
            var userId = await _access.GetUserId(token);
            if (string.IsNullOrEmpty(userId)) return Unauthorized(new { message = "Authentication required." });

            string jsonBody;
            using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
            {
                jsonBody = await reader.ReadToEndAsync();
            }
            if (string.IsNullOrWhiteSpace(jsonBody))
                return BadRequest(new { message = "Empty request body." });

            try
            {
                using var http = _httpClientFactory.CreateClient();
                http.Timeout = TimeSpan.FromMinutes(2);

                // Forward the caller's Supabase Bearer token so the call still
                // succeeds if/when the AI server protects this route too.
                http.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);

                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                var aiResp = await http.PostAsync($"{AI_SERVER_BASE}/api/v1/evaluation/generate-report", content);

                if (!aiResp.IsSuccessStatusCode)
                {
                    var errBody = await aiResp.Content.ReadAsStringAsync();
                    _logger.LogError("[Pdf.GenerateReport] AI server {Status}: {Body}", aiResp.StatusCode, errBody);
                    return StatusCode((int)aiResp.StatusCode, new { message = "AI report generation failed.", detail = errBody });
                }

                var bytes = await aiResp.Content.ReadAsByteArrayAsync();
                var contentType = aiResp.Content.Headers.ContentType?.ToString() ?? "application/zip";
                return File(bytes, contentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Pdf.GenerateReport] Unhandled exception");
                return StatusCode(500, new { message = "Report generation failed.", detail = ex.Message });
            }
        }
    }
}
