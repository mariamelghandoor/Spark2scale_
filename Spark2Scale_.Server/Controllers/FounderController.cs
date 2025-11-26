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
    public class FounderController : ControllerBase
    {
        private readonly Client _supabase;

        public FounderController(Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddFounder([FromBody] FounderDto request)
        {
            if (request == null || request.UserId == Guid.Empty)
                return BadRequest("Invalid user ID.");

            var userResult = await _supabase
                .From<User>()
                .Where(u => u.uid == request.UserId)
                .Get();

            if (!userResult.Models.Any())
                return BadRequest("User does not exist.");

            var founder = new Founder
            {
                user_id = request.UserId
            };

            await _supabase.From<Founder>().Insert(founder);

            return Ok(new
            {
                message = "Founder added successfully",
                userId = request.UserId
            });
        }
    }
}
