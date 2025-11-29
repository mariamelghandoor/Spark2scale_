using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public DocumentsController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // POST: api/documents
        [HttpPost("add")]
        public async Task<IActionResult> AddDocument([FromBody] DocumentInsertDto input)
        {
            // 1. Validation
            if (input == null || input.startup_id == Guid.Empty || input.master_id == Guid.Empty)
                return BadRequest("Invalid data. Startup ID and Master ID are required.");

            // 2. Map Input DTO -> Database Model
            var newDoc = new Document
            {
                Did = Guid.NewGuid(), // Generate ID
                MasterId = input.master_id,
                StartupId = input.startup_id,
                DocumentName = input.document_name,
                Type = input.type,
                Path = input.path,
                Version = input.version,
                CanAccess = input.canaccess,
                CreatedAt = DateTime.UtcNow
            };

            // 3. Insert into Supabase
            var result = await _supabase.From<Document>().Insert(newDoc);

            var inserted = result.Models.FirstOrDefault();
            if (inserted == null) return StatusCode(500, "Failed to insert document.");

            // 4. Map Database Model -> Output DTO
            var response = new DocumentResponseDto
            {
                did = inserted.Did,
                master_id = inserted.MasterId,
                startup_id = inserted.StartupId,
                document_name = inserted.DocumentName,
                type = inserted.Type,
                path = inserted.Path,
                version = inserted.Version,
                canaccess = inserted.CanAccess,
                created_at = inserted.CreatedAt
            };

            return Ok(response);
        }

        // GET: api/documents (Gets EVERYTHING)
        [HttpGet]
        public async Task<IActionResult> GetAllDocuments()
        {
            // Fetch all rows from the table
            var result = await _supabase.From<Document>().Get();

            var dtos = result.Models.Select(d => new DocumentResponseDto
            {
                did = d.Did,
                master_id = d.MasterId,
                startup_id = d.StartupId,
                document_name = d.DocumentName,
                type = d.Type,
                path = d.Path,
                version = d.Version,
                canaccess = d.CanAccess,
                created_at = d.CreatedAt
            }).ToList();

            return Ok(dtos);
        }

        // GET: api/documents/recommendations/{startupId}
        [HttpGet("recommendations/{startupId}")]
        public async Task<IActionResult> GetRecommendations(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId))
                return BadRequest("Invalid Startup ID.");

            try
            {
                var result = await _supabase.From<Document>()
                    .Where(x => x.StartupId == sId && x.Type == "recommendation") // Filter by ID and Type
                    .Order("version", Supabase.Postgrest.Constants.Ordering.Descending) // Sort Version High -> Low
                    .Get();

                var dtos = result.Models.Select(d => new DocumentResponseDto
                {
                    did = d.Did,
                    master_id = d.MasterId,
                    startup_id = d.StartupId,
                    document_name = d.DocumentName,
                    type = d.Type,
                    path = d.Path,
                    version = d.Version,
                    canaccess = d.CanAccess,
                    created_at = d.CreatedAt
                }).ToList();

                return Ok(dtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error loading recommendations: {ex.Message}");
            }
        }
    }
}