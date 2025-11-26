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
    public class InvestorsController : ControllerBase
    {
        private readonly Client _supabase;

        public InvestorsController(Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddInvestor([FromBody] InvestorDto request)
        {
            if (request == null || request.UserId == Guid.Empty)
                return BadRequest("Invalid user ID.");

            // check if user exists
            var userResult = await _supabase
                .From<User>()
                .Where(u => u.uid == request.UserId)
                .Get();

            if (!userResult.Models.Any())
                return BadRequest("User does not exist.");

            var investor = new Investor
            {
                user_id = request.UserId,
                tags = request.Tags
            };

            await _supabase.From<Investor>().Insert(investor);

            return Ok(new
            {
                message = "Investor added successfully",
                userId = request.UserId
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetInvestors()
        {
            var result = await _supabase.From<Investor>().Get();

            var dtos = result.Models.Select(i => new InvestorDto
            {
                UserId = i.user_id,
                Tags = i.tags
            }).ToList();

            return Ok(dtos);
        }
    }
}
