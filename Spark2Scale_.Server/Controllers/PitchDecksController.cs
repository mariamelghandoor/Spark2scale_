using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PitchDecksController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public PitchDecksController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddPitchDeck([FromBody] PitchDeckInsertDto input)
        {
            if (input == null || input.startup_id == Guid.Empty)
                return BadRequest("A valid startup_id is required.");

            // Map Input -> DB Model
            var newDeck = new PitchDeck
            {
                startup_id = input.startup_id,
                tags = input.tags ?? new List<string>(),
                countlikes = input.countlikes,
                created_at = DateTime.UtcNow
            };

            var result = await _supabase.From<PitchDeck>().Insert(newDeck);
            var inserted = result.Models.FirstOrDefault();

            if (inserted == null) return StatusCode(500, "Failed to insert pitch deck");

            // Map DB Model -> Output
            var response = new PitchDeckResponseDto
            {
                pitchdeckid = inserted.pitchdeckid,
                startup_id = inserted.startup_id,
                tags = inserted.tags,
                countlikes = inserted.countlikes,
                created_at = inserted.created_at
            };

            return Ok(response);
        }

        // GET: api/pitchdecks
        [HttpGet]
        public async Task<IActionResult> GetPitchDecks()
        {
            var result = await _supabase.From<PitchDeck>().Get();

            // Map Database Model -> Response DTO
            var dtos = result.Models.Select(d => new PitchDeckResponseDto
            {
                pitchdeckid = d.pitchdeckid,
                startup_id = d.startup_id,
                tags = d.tags ?? new List<string>(), // Handle null list safely
                countlikes = d.countlikes,
                created_at = d.created_at
            }).ToList();

            return Ok(dtos);
        }
    }
}