using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Threading.Tasks;
using System.Linq;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PitchDeckLikesController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public PitchDeckLikesController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // POST: api/pitchdecklikes/add
        [HttpPost("add")]
        public async Task<IActionResult> AddLike([FromBody] PitchDeckLikeInsertDto input)
        {
            // 1. Validate Input
            if (input == null || input.investor_id == Guid.Empty || input.pitchdeck_id == Guid.Empty)
                return BadRequest("Invalid data. Investor ID and PitchDeck ID are required.");

            // 2. Map DTO to Database Model
            var newLike = new PitchDeckLike
            {
                InvestorId = input.investor_id,
                PitchDeckId = input.pitchdeck_id,
                LikedAt = DateTime.UtcNow
            };

            try
            {
                // 3. Insert into Supabase 'pitchdeck_likes' table
                var result = await _supabase.From<PitchDeckLike>().Insert(newLike);

                // 4. Update the count on the parent PitchDeck table (Optional but recommended)
                _ = IncrementPitchDeckLikes(input.pitchdeck_id);

                return Ok(new { message = "Pitch deck liked successfully!" });
            }
            catch (Supabase.Postgrest.Exceptions.PostgrestException ex)
            {
                if (ex.Message.Contains("duplicate key value"))
                {
                    return BadRequest("This investor has already liked this pitch deck.");
                }
                if (ex.Message.Contains("violates foreign key constraint"))
                {
                    return BadRequest("Invalid Investor ID or PitchDeck ID.");
                }
                throw;
            }
        }

        // Helper to update the count
        private async Task IncrementPitchDeckLikes(Guid pitchDeckId)
        {
            try
            {
                var deckResponse = await _supabase
                    .From<PitchDeck>()
                    .Where(p => p.pitchdeckid == pitchDeckId)
                    .Single();

                if (deckResponse != null)
                {
                    deckResponse.countlikes += 1;
                    await deckResponse.Update<PitchDeck>();
                }
            }
            catch { /* Ignore update errors to keep response fast */ }
        }
    }
}