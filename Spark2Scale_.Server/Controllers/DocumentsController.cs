using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly Client _supabase;

        public DocumentsController(Client supabase)
        {
            _supabase = supabase;
        }

        // GET: api/documents?startupId=...
        [HttpGet]
        public async Task<IActionResult> GetDocuments(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            var result = await _supabase.From<Document>()
                .Where(x => x.StartupId == sId && x.IsCurrent == true) // <--- THIS FILTER IS MANDATORY
                .Order("updated_at", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            var dtos = result.Models.Select(d => new
            {
                did = d.Did,
                startup_id = d.StartupId,
                document_name = d.DocumentName,
                type = d.Type,
                current_path = d.CurrentPath,
                current_version = d.CurrentVersion,
                canaccess = d.CanAccess,
                updated_at = d.UpdatedAt,
                created_at = d.CreatedAt
            });

            return Ok(dtos);
        }

        // GET: api/documents/check-completion/{startupId}
        // --- NEW ENDPOINT: Checks if all 5 required docs exist ---
        [HttpGet("check-completion/{startupId}")]
        public async Task<IActionResult> CheckCompletion(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            // The exact Type strings stored in DB (must match frontend config)
            var requiredTypes = new List<string> { "Pitch Deck", "Financials", "Cap Table", "Legal Docs", "Business Plan" };

            // Fetch all docs for this startup
            var result = await _supabase.From<Document>()
                .Where(x => x.StartupId == sId)
                .Get();

            var uploadedTypes = result.Models.Select(d => d.Type).ToList();

            // Find which required types are missing (Case-insensitive check)
            var missing = requiredTypes
                .Where(req => !uploadedTypes.Any(up => up.Equals(req, StringComparison.OrdinalIgnoreCase)))
                .ToList();

            if (missing.Any())
            {
                return Ok(new { isComplete = false, missingDocs = missing });
            }

            return Ok(new { isComplete = true });
        }

        // GET: api/documents/history/{documentId}
        [HttpGet("history/{documentId}")]
        public async Task<IActionResult> GetHistory(string documentId)
        {
            if (!Guid.TryParse(documentId, out Guid dId)) return BadRequest("Invalid ID");

            var result = await _supabase.From<DocumentVersion>()
                .Where(x => x.DocumentId == dId)
                .Order("version_number", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            var dtos = result.Models.Select(v => new
            {
                vid = v.Vid,
                document_id = v.DocumentId,
                version_number = v.VersionNumber,
                path = v.Path,
                created_at = v.CreatedAt,
                generated_by = v.GeneratedBy
            });

            return Ok(dtos);
        }

        // POST: api/documents/upload
        [HttpPost("upload")]
        public async Task<IActionResult> UploadDocument([FromForm] DocumentUploadDto form)
        {
            if (form.File == null || form.File.Length == 0) return BadRequest("No file.");
            if (!Guid.TryParse(form.StartupId, out Guid sId)) return BadRequest("Invalid Startup ID.");

            try
            {
                var fileName = $"{sId}/{DateTime.Now.Ticks}_{form.File.FileName}";
                byte[] fileBytes;
                using (var ms = new MemoryStream()) { await form.File.CopyToAsync(ms); fileBytes = ms.ToArray(); }

                await _supabase.Storage.From("startup-docs").Upload(fileBytes, fileName);
                var publicUrl = _supabase.Storage.From("startup-docs").GetPublicUrl(fileName);

                if (!string.IsNullOrEmpty(form.DocumentId) && Guid.TryParse(form.DocumentId, out Guid dId))
                {
                    var existingRes = await _supabase.From<Document>().Where(x => x.Did == dId).Get();
                    var currentDoc = existingRes.Models.FirstOrDefault();

                    if (currentDoc != null)
                    {
                        int newVer = currentDoc.CurrentVersion + 1;

                        await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                        {
                            DocumentId = dId,
                            StartupId = sId,
                            VersionNumber = newVer,
                            Path = publicUrl,
                            CreatedAt = DateTime.UtcNow,
                            GeneratedBy = "manual"
                        });

                        currentDoc.CurrentPath = publicUrl;
                        currentDoc.CurrentVersion = newVer;
                        currentDoc.UpdatedAt = DateTime.UtcNow;
                        await _supabase.From<Document>().Upsert(currentDoc);

                        return Ok(new { message = "Version updated", version = newVer, url = publicUrl });
                    }
                }

                var newDoc = new Document
                {
                    Did = Guid.NewGuid(),
                    StartupId = sId,
                    DocumentName = form.DocName,
                    Type = form.Type,
                    CurrentPath = publicUrl,
                    CurrentVersion = 1,
                    CanAccess = 1,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                var inserted = await _supabase.From<Document>().Insert(newDoc);
                var createdDid = inserted.Models.First().Did;

                await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                {
                    DocumentId = createdDid,
                    StartupId = sId,
                    VersionNumber = 1,
                    Path = publicUrl,
                    CreatedAt = DateTime.UtcNow,
                    GeneratedBy = "manual"
                });

                return Ok(new { message = "File created", version = 1, url = publicUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Upload failed: {ex.Message}");
            }
        }

        // POST: api/documents/generate-mock
        [HttpPost("generate-mock")]
        public async Task<IActionResult> GenerateMock([FromBody] GenerateMockDto input)
        {
            if (input.StartupId == Guid.Empty) return BadRequest("Invalid Startup ID");

            try
            {
                string mockUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
                string docName = $"{input.Type} (AI Generated)";

                var existingRes = await _supabase.From<Document>()
                    .Where(x => x.StartupId == input.StartupId && x.Type == input.Type)
                    .Get();

                var currentDoc = existingRes.Models.FirstOrDefault();

                if (currentDoc != null)
                {
                    int newVer = currentDoc.CurrentVersion + 1;
                    await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                    {
                        DocumentId = currentDoc.Did,
                        StartupId = input.StartupId,
                        VersionNumber = newVer,
                        Path = mockUrl,
                        CreatedAt = DateTime.UtcNow,
                        GeneratedBy = "AI"
                    });

                    currentDoc.CurrentPath = mockUrl;
                    currentDoc.CurrentVersion = newVer;
                    currentDoc.UpdatedAt = DateTime.UtcNow;
                    await _supabase.From<Document>().Upsert(currentDoc);

                    return Ok(new { message = "AI generated new version", version = newVer });
                }
                else
                {
                    var newDoc = new Document
                    {
                        Did = Guid.NewGuid(),
                        StartupId = input.StartupId,
                        DocumentName = docName,
                        Type = input.Type,
                        CurrentPath = mockUrl,
                        CurrentVersion = 1,
                        CanAccess = 1,
                        UpdatedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };

                    var inserted = await _supabase.From<Document>().Insert(newDoc);
                    var createdDid = inserted.Models.First().Did;

                    await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                    {
                        DocumentId = createdDid,
                        StartupId = input.StartupId,
                        VersionNumber = 1,
                        Path = mockUrl,
                        CreatedAt = DateTime.UtcNow,
                        GeneratedBy = "AI"
                    });

                    return Ok(new { message = "AI generated document", version = 1 });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Generation failed: {ex.Message}");
            }
        }

        // DELETE: api/documents/{documentId}
        [HttpDelete("{documentId}")]
        public async Task<IActionResult> DeleteDocument(string documentId)
        {
            if (!Guid.TryParse(documentId, out Guid dId)) return BadRequest("Invalid ID");
            try
            {
                await _supabase.From<Document>().Where(x => x.Did == dId).Delete();
                return Ok(new { message = "Document deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Delete failed: {ex.Message}");
            }
        }
    }
}