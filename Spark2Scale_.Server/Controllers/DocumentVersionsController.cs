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
    public class DocumentVersionsController : ControllerBase
    {
        private readonly Client _supabase;

        public DocumentVersionsController(Client supabase)
        {
            _supabase = supabase;
        }

        // GET: api/DocumentVersions/{documentId}
        // Returns the history list for a specific file (v1, v2, v3...)
        [HttpGet("{documentId}")]
        public async Task<IActionResult> GetHistory(string documentId)
        {
            if (!Guid.TryParse(documentId, out Guid dId)) return BadRequest("Invalid ID");

            var result = await _supabase.From<DocumentVersion>()
                .Where(x => x.DocumentId == dId) // Ensure this matches your Model property (DocumentId)
                .Order("version_number", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            // --- THE FIX IS HERE ---
            // We map the Supabase Model to a clean Anonymous Object
            var dtos = result.Models.Select(v => new
            {
                vid = v.Vid,
                document_id = v.DocumentId,
                startup_id = v.StartupId,
                version_number = v.VersionNumber,
                path = v.Path,
                created_at = v.CreatedAt,
                is_public = v.IsPublic
            });

            return Ok(dtos);
        }

        [HttpGet("count/{startupId}")]
        public async Task<IActionResult> GetTotalFileCount(string startupId)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            // Fetch all versions associated with this startup
            var result = await _supabase.From<DocumentVersion>()
                .Where(x => x.StartupId == sId)
                .Get();

            // Return the count
            return Ok(new { count = result.Models.Count });
        }
        // --- NEW ENDPOINT: PATCH api/DocumentVersions/visibility/{vid} ---
        [HttpPatch("visibility/{vid}")]
        public async Task<IActionResult> ToggleVisibility(string vid, [FromBody] bool isPublic)
        {
            if (!Guid.TryParse(vid, out Guid vId)) return BadRequest("Invalid ID");

            try
            {
                var update = await _supabase.From<DocumentVersion>()
                                          .Where(x => x.Vid == vId)
                                          .Set(x => x.IsPublic, isPublic)
                                          .Update();

                return Ok(new { message = "Visibility updated", is_public = isPublic });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }
    }
}