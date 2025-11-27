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
    public class DocumentVersionsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public DocumentVersionsController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // POST: api/documentversions/add
        [HttpPost("add")]
        public async Task<IActionResult> AddVersion([FromBody] DocumentVersionInsertDto input)
        {
            // 1. Validate
            if (input == null || input.master_id == Guid.Empty || string.IsNullOrEmpty(input.document_name))
                return BadRequest("Invalid data. master_id and document_name are required.");

            // 2. Map Input DTO -> Database Model
            var newVersion = new DocumentVersion
            {
                MasterId = input.master_id,
                VersionNumber = input.version_number,
                DocumentName = input.document_name,
                // Use provided value or default to 'manual'
                GeneratedBy = string.IsNullOrEmpty(input.generated_by) ? "manual" : input.generated_by,
                Type = input.type,
                Path = input.path,
                // DB handles VersionId (gen_random_uuid) and CreatedAt (now)
            };

            // 3. Insert into Supabase
            try
            {
                var result = await _supabase.From<DocumentVersion>().Insert(newVersion);
                var inserted = result.Models.FirstOrDefault();

                if (inserted == null) return StatusCode(500, "Failed to insert document version.");

                // 4. Map Database Model -> Output DTO
                var response = new DocumentVersionResponseDto
                {
                    version_id = inserted.VersionId,
                    master_id = inserted.MasterId,
                    version_number = inserted.VersionNumber,
                    generated_by = inserted.GeneratedBy,
                    document_name = inserted.DocumentName,
                    type = inserted.Type,
                    path = inserted.Path,
                    created_at = inserted.CreatedAt
                };

                return Ok(response);
            }
            catch (Supabase.Postgrest.Exceptions.PostgrestException ex)
            {
                // Handle foreign key error if master_id doesn't exist
                if (ex.Message.Contains("violates foreign key constraint"))
                {
                    return BadRequest($"The master_id '{input.master_id}' does not exist in the master_documents table.");
                }
                throw;
            }
        }

        // GET: api/documentversions (Gets EVERYTHING)
        [HttpGet]
        public async Task<IActionResult> GetAllVersions()
        {
            // Fetch all rows from the table
            var result = await _supabase.From<DocumentVersion>().Get();

            var dtos = result.Models.Select(v => new DocumentVersionResponseDto
            {
                version_id = v.VersionId,
                master_id = v.MasterId,
                version_number = v.VersionNumber,
                generated_by = v.GeneratedBy,
                document_name = v.DocumentName,
                type = v.Type,
                path = v.Path,
                created_at = v.CreatedAt
            }).ToList();

            return Ok(dtos);
        }
    }
}