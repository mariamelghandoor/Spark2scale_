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

        // GET: api/startups
        [HttpGet]
        public async Task<IActionResult> GetStartups()
        {
            var result = await _supabase.From<Startup>().Get();

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

        // GET: api/startups/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetStartup(Guid id)
        {
            var result = await _supabase.From<Startup>()
                .Where(x => x.Sid == id)
                .Get();

            var startup = result.Models.FirstOrDefault();

            if (startup == null) return NotFound();

            var response = new StartupResponseDto
            {
                sid = startup.Sid,
                startupname = startup.StartupName,
                field = startup.Field,
                idea_description = startup.IdeaDescription,
                founder_id = startup.FounderId,
                created_at = startup.CreatedAt
            };

            return Ok(response);
        }
    }
}