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
                created_at = v.CreatedAt
            });

            return Ok(dtos);
        }
    }
}