using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

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
                .Where(x => x.StartupId == sId)
                .Order("updated_at", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            // FIX: Map to anonymous object to prevent "PrimaryKeyAttribute" JSON error
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

        // GET: api/documents/history/{documentId}
        // Returns version history for a specific document
        [HttpGet("history/{documentId}")]
        public async Task<IActionResult> GetHistory(string documentId)
        {
            if (!Guid.TryParse(documentId, out Guid dId)) return BadRequest("Invalid ID");

            var result = await _supabase.From<DocumentVersion>()
                .Where(x => x.DocumentId == dId)
                .Order("version_number", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            // FIX: Map to anonymous object
            var dtos = result.Models.Select(v => new
            {
                vid = v.Vid,
                document_id = v.DocumentId,
                version_number = v.VersionNumber,
                path = v.Path,
                created_at = v.CreatedAt
            });

            return Ok(dtos);
        }

        // POST: api/documents/upload
        [HttpPost("upload")]
        public async Task<IActionResult> UploadDocument([FromForm] DocumentUploadDto form)
        {
            // Validation
            if (form.File == null || form.File.Length == 0) return BadRequest("No file.");
            if (!Guid.TryParse(form.StartupId, out Guid sId)) return BadRequest("Invalid Startup ID.");

            try
            {
                // 1. Upload to Supabase Storage
                var fileName = $"{sId}/{DateTime.Now.Ticks}_{form.File.FileName}";
                byte[] fileBytes;
                using (var ms = new MemoryStream())
                {
                    await form.File.CopyToAsync(ms);
                    fileBytes = ms.ToArray();
                }

                await _supabase.Storage.From("startup-docs").Upload(fileBytes, fileName);
                var publicUrl = _supabase.Storage.From("startup-docs").GetPublicUrl(fileName);

                // 2. CHECK: Are we updating an existing doc?
                if (!string.IsNullOrEmpty(form.DocumentId) && Guid.TryParse(form.DocumentId, out Guid dId))
                {
                    // --- UPDATE EXISTING (New Version) ---
                    var existingRes = await _supabase.From<Document>().Where(x => x.Did == dId).Get();
                    var currentDoc = existingRes.Models.FirstOrDefault();

                    if (currentDoc != null)
                    {
                        int newVer = currentDoc.CurrentVersion + 1;

                        // A. Add to History
                        await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                        {
                            DocumentId = dId,
                            StartupId = sId,
                            VersionNumber = newVer,
                            Path = publicUrl,
                            CreatedAt = DateTime.UtcNow
                        });

                        // B. Update Parent
                        currentDoc.CurrentPath = publicUrl;
                        currentDoc.CurrentVersion = newVer;
                        currentDoc.UpdatedAt = DateTime.UtcNow;
                        await _supabase.From<Document>().Upsert(currentDoc);

                        return Ok(new { message = "Version updated", version = newVer, url = publicUrl });
                    }
                }

                // --- CREATE NEW (Version 1) ---
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

                // A. Insert Parent
                var inserted = await _supabase.From<Document>().Insert(newDoc);
                var createdDid = inserted.Models.First().Did;

                // B. Insert Version 1 History
                await _supabase.From<DocumentVersion>().Insert(new DocumentVersion
                {
                    DocumentId = createdDid,
                    StartupId = sId,
                    VersionNumber = 1,
                    Path = publicUrl,
                    CreatedAt = DateTime.UtcNow
                });

                return Ok(new { message = "File created", version = 1, url = publicUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Upload failed: {ex.Message}");
            }
        }
    }
}