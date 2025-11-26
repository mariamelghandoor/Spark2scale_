using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

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

        [HttpPost] 
        public async Task<IActionResult> AddDocument([FromBody] Document document)
        {
            if (document == null || document.StartupId == Guid.Empty)
                return BadRequest("Invalid document or missing startup ID.");

            if (document.Did == Guid.Empty)
                document.Did = Guid.NewGuid();

            var result = await _supabase.From<Document>().Insert(document);

            var insertedDocument = result.Models.FirstOrDefault();
            if (insertedDocument == null) return StatusCode(500, "Failed to insert document record.");

            var dto = new DocumentDto
            {
                Did = insertedDocument.Did,
                DocumentName = insertedDocument.DocumentName,
                Type = insertedDocument.Type,
                StartupId = insertedDocument.StartupId,
                CreatedAt = insertedDocument.CreatedAt
            };

            return CreatedAtAction(nameof(GetDocumentsByStartup), new { startupId = dto.StartupId }, dto);
        }


        [HttpGet("{startupId:Guid}")] 
        public async Task<IActionResult> GetDocumentsByStartup(Guid startupId)
        {
            if (startupId == Guid.Empty)
                return BadRequest("Startup ID is required.");

            var result = await _supabase.From<Document>()
                .Where(d => d.StartupId == startupId)
                .Get();

            if (result.Models == null || !result.Models.Any())
                return NotFound("No documents found for this startup.");

            var dtos = result.Models.Select(d => new DocumentDto
            {
                Did = d.Did,
                DocumentName = d.DocumentName,
                Type = d.Type,
                StartupId = d.StartupId,
                CreatedAt = d.CreatedAt
            }).ToList();

            return Ok(dtos);
        }
    }
}