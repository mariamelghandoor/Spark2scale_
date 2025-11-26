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
    public class InvestorStartupInvestmentsController : ControllerBase
    {
        private readonly Client _supabase;

        public InvestorStartupInvestmentsController(Client supabase) => _supabase = supabase;

        [HttpPost("add")]
        public async Task<IActionResult> AddInvestment([FromBody] InvestorStartupInvestmentDto request)
        {
            if (request == null || request.InvestorId == Guid.Empty || request.StartupId == Guid.Empty)
                return BadRequest("Invalid investor or startup ID.");

            // Check if investor exists
            var investorResult = await _supabase
                .From<Investor>()
                .Where(i => i.user_id == request.InvestorId)
                .Get();

            if (investorResult.Models.Count == 0)
                return BadRequest("Investor does not exist.");

            // Check if startup exists
            var startupResult = await _supabase
                .From<Startup>()
                .Where(s => s.Sid == request.StartupId)
                .Get();

            if (startupResult.Models.Count == 0)
                return BadRequest("Startup does not exist.");

            var investment = new InvestorStartupInvestment
            {
                InvestorId = request.InvestorId,
                StartupId = request.StartupId,
                InvestedAt = request.InvestedAt ?? DateTime.UtcNow,
                Amount = request.Amount
            };

            await _supabase.From<InvestorStartupInvestment>().Insert(investment);

            return Ok(new
            {
                message = "Investment added successfully",
                investorId = request.InvestorId,
                startupId = request.StartupId
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetInvestments()
        {
            var result = await _supabase.From<InvestorStartupInvestment>().Get();

            var dtos = result.Models.Select(i => new InvestorStartupInvestmentDto(
                i.InvestorId,
                i.StartupId,
                i.InvestedAt,
                i.Amount
            )).ToList();

            return Ok(dtos);
        }
    }
}
