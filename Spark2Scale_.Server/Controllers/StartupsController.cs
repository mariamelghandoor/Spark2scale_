using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StartupsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public StartupsController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // POST: api/Startups/add
        [HttpPost("add")]
        public async Task<IActionResult> AddStartup([FromBody] StartupInsertDto input)
        {
            if (input == null || string.IsNullOrEmpty(input.startupname))
                return BadRequest("Startup Name is required.");

            var newStartup = new Startup
            {
                StartupName = input.startupname,
                Field = input.field,
                IdeaDescription = input.idea_description,
                FounderId = input.founder_id,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _supabase.From<Startup>().Insert(newStartup);
            var inserted = result.Models.FirstOrDefault();

            if (inserted == null) return StatusCode(500, "Failed to insert startup");

            var response = new StartupResponseDto
            {
                sid = inserted.Sid,
                startupname = inserted.StartupName,
                field = inserted.Field,
                idea_description = inserted.IdeaDescription,
                founder_id = inserted.FounderId,
                created_at = inserted.CreatedAt
            };

            return Ok(response);
        }

        // GET: api/Startups?founderId=...
        [HttpGet]
        public async Task<IActionResult> GetStartups([FromQuery] Guid? founderId)
        {
            Supabase.Postgrest.Responses.ModeledResponse<Startup> result;

            if (founderId.HasValue)
            {
                result = await _supabase
                    .From<Startup>()
                    .Filter("founder_id", Supabase.Postgrest.Constants.Operator.Equals, founderId.Value.ToString())
                    .Get();
            }
            else
            {
                result = await _supabase
                    .From<Startup>()
                    .Get();
            }

            var dtos = result.Models.Select(s => new StartupResponseDto
            {
                sid = s.Sid,
                startupname = s.StartupName,
                field = s.Field,
                idea_description = s.IdeaDescription,
                founder_id = s.FounderId,
                created_at = s.CreatedAt
            }).ToList();

            return Ok(dtos);
        }
    }
}