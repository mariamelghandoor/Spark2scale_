using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Threading.Tasks;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PitchDeckLikesController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private static readonly HttpClient _httpClient = new HttpClient();

        public PitchDeckLikesController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // POST: api/pitchdecklikes/interact
        [HttpPost("interact")]
        public async Task<IActionResult> Interact([FromBody] PitchDeckInteractionDto input)
        {
            // 1. Validate Input
            if (input == null || input.investor_id == Guid.Empty || input.pitchdeck_id == Guid.Empty)
                return BadRequest("Invalid data. Investor ID and PitchDeck ID are required.");

            // 2. Map DTO to Database Model
            var interaction = new PitchDeckLike
            {
                InvestorId = input.investor_id,
                PitchDeckId = input.pitchdeck_id,
                LikedAt = DateTime.UtcNow,
                Liked = input.liked,
                Contacted = input.contacted
            };

            try
            {
                // 3. Upsert into Supabase 'pitchdeck_likes' table with explicit OnConflict for composite keys
                var options = new Supabase.Postgrest.QueryOptions { OnConflict = "investor_id,pitchdeck_id" };
                var result = await _supabase.From<PitchDeckLike>().Upsert(interaction, options);

                // 4. Update the count on the parent PitchDeck table (Optional but recommended)
                if (input.liked)
                {
                    _ = IncrementPitchDeckLikes(input.pitchdeck_id);
                }

                _ = NotifyPythonAIEngine(input);

                return Ok(new { message = "Interaction recorded successfully!" });
            }
            catch (Supabase.Postgrest.Exceptions.PostgrestException ex)
            {
                if (ex.Message.Contains("violates foreign key constraint"))
                {
                    return BadRequest(new { message = "Invalid Investor ID or PitchDeck ID. The user or pitch does not exist in the database." });
                }
                return StatusCode(500, new { error = ex.Message, details = ex.StackTrace, type = "PostgrestException" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, details = ex.StackTrace, type = ex.GetType().Name });
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

        private async Task NotifyPythonAIEngine(PitchDeckInteractionDto input)
        {
            try
            {
                var payload = new
                {
                    user_id = input.investor_id.ToString(),
                    pitch_id = input.pitchdeck_id.ToString(),
                    liked = input.liked,
                    contacted = input.contacted
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                // TODO: Update the endpoint URL if necessary
                await _httpClient.PostAsync("http://127.0.0.1:8000/api/ai/interaction", content);
            }
            catch { /* Ignore errors */ }
        }
    }
}