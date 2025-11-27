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
    public class MasterDocumentsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public MasterDocumentsController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // POST: api/masterdocuments/add
        [HttpPost("add")]
        public async Task<IActionResult> AddMasterDocument([FromBody] MasterDocumentInsertDto input)
        {
            var newMasterDoc = new MasterDocument
            {
                MasterId = Guid.NewGuid(),
                StartupId = input.startup_id,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _supabase.From<MasterDocument>().Insert(newMasterDoc);
            var inserted = result.Models.FirstOrDefault();

            if (inserted == null) return StatusCode(500, "Failed to create master document.");

            var response = new MasterDocumentResponseDto
            {
                master_id = inserted.MasterId,
                startup_id = inserted.StartupId,
                created_at = inserted.CreatedAt
            };

            return Ok(response);
        }

        // GET: api/masterdocuments
        [HttpGet]
        public async Task<IActionResult> GetAllMasterDocuments()
        {
            var result = await _supabase.From<MasterDocument>().Get();
            var dtos = result.Models.Select(m => new MasterDocumentResponseDto
            {
                master_id = m.MasterId,
                startup_id = m.StartupId,
                created_at = m.CreatedAt
            }).ToList();
            return Ok(dtos);
        }
    }
}