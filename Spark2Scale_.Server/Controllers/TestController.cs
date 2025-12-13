using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public TestController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // Test 1: Is the API working?
        [HttpGet("ping")]
        public IActionResult Ping()
        {
            return Ok(new
            {
                status = "API is working",
                timestamp = DateTime.UtcNow,
                message = "Backend is responding"
            });
        }

        // Test 2: Is Supabase connected?
        [HttpGet("supabase-status")]
        public IActionResult SupabaseStatus()
        {
            try
            {
                var isConnected = _supabase != null;
                return Ok(new
                {
                    supabaseClient = isConnected ? "Connected" : "NULL",
                    message = isConnected
                        ? "Supabase client is initialized"
                        : "ERROR: Supabase client is NULL - check your Program.cs configuration"
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    error = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        // Test 3: Can we query the database?
        [HttpGet("test-query")]
        public async Task<IActionResult> TestQuery()
        {
            try
            {
                if (_supabase == null)
                {
                    return Ok(new
                    {
                        error = "Supabase client is NULL",
                        solution = "Check your dependency injection in Program.cs"
                    });
                }

                // Try to fetch ONE startup
                var result = await _supabase.From<Spark2Scale_.Server.Models.Startup>()
                    .Limit(1)
                    .Get();

                return Ok(new
                {
                    success = true,
                    message = "Query executed successfully",
                    startupCount = result?.Models?.Count ?? 0,
                    hasData = (result?.Models?.Count ?? 0) > 0
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    error = "Query failed",
                    message = ex.Message,
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        // Test 4: Can we fetch pitch decks?
        [HttpGet("test-pitchdecks")]
        public async Task<IActionResult> TestPitchDecks()
        {
            try
            {
                if (_supabase == null)
                {
                    return Ok(new { error = "Supabase is NULL" });
                }

                var result = await _supabase.From<Spark2Scale_.Server.Models.PitchDeck>()
                    .Limit(1)
                    .Get();

                var count = result?.Models?.Count ?? 0;
                var firstPitch = result?.Models?.FirstOrDefault();

                return Ok(new
                {
                    success = true,
                    pitchDeckCount = count,
                    hasData = count > 0,
                    sampleData = firstPitch != null ? new
                    {
                        id = firstPitch.pitchdeckid,
                        startup_id = firstPitch.startup_id,
                        pitchname = firstPitch.pitchname,
                        has_video = !string.IsNullOrEmpty(firstPitch.video_url),
                        video_url = firstPitch.video_url
                    } : null
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    error = "Failed to fetch pitch decks",
                    message = ex.Message,
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace,
                    type = ex.GetType().Name
                });
            }
        }
    }
}