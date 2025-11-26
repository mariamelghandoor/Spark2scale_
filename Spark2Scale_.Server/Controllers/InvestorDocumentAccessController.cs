using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvestorDocumentAccessController : ControllerBase
    {
        private readonly Client _supabase;

        public InvestorDocumentAccessController(Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost("grant")]
        public async Task<IActionResult> GrantAccess([FromBody] GrantAccessDto request)
        {
            // 1. Validation
            if (request == null || request.InvestorId == Guid.Empty || request.DocumentId == Guid.Empty)
                return BadRequest("Invalid Investor ID or Document ID.");

            // 2. Prepare the model
            var accessRecord = new InvestorDocumentAccess
            {
                InvestorId = request.InvestorId,
                DocumentId = request.DocumentId,
                GrantedAt = DateTime.UtcNow // Automatically set the timestamp to Now
            };

            // 3. Insert into Supabase
            try
            {
                // We use Upsert here just in case this access has already been granted 
                // (to prevent crashing on duplicate keys), or you can stick to Insert().
                await _supabase.From<InvestorDocumentAccess>().Insert(accessRecord);

                return Ok(new
                {
                    message = "Access granted successfully",
                    investorId = request.InvestorId,
                    documentId = request.DocumentId
                });
            }
            catch (Exception ex)
            {
                // This will catch foreign key violations (if investor or document doesn't exist)
                // or unique constraint violations.
                return BadRequest($"Error granting access: {ex.Message}");
            }
        }
    }
}