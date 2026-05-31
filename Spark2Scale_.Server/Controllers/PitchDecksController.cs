using Microsoft.AspNetCore.Http; // Required for IFormFile
using Microsoft.AspNetCore.Mvc;
using Spark2Scale_.Server.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PitchDecksController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly Spark2Scale_.Server.Services.AccessControlService _access;

        public PitchDecksController(Supabase.Client supabase, Spark2Scale_.Server.Services.AccessControlService access)
        {
            _supabase = supabase;
            _access = access;
        }

        private string GetToken()
        {
            var header = Request.Headers["Authorization"].FirstOrDefault();
            return header?.StartsWith("Bearer ") == true ? header.Substring(7) : "";
        }

        // GET: api/pitchdecks/with-startups
        [HttpGet("with-startups")]
        public async Task<IActionResult> GetAllPitchDecksWithStartups([FromQuery] bool onlyPublic = false)
        {
            try
            {
                var query = _supabase
                    .From<PitchDeck>()
                    .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending);

                if (onlyPublic)
                {
                    query = query.Filter("canaccess", Supabase.Postgrest.Constants.Operator.Equals, "true");
                }

                var decksResponse = await query.Get();
                var decks = decksResponse.Models;

                if (decks == null || !decks.Any()) return Ok(new List<object>());

                var startupsResponse = await _supabase.From<Startup>().Get();
                var startups = startupsResponse.Models;

                if (startups == null || !startups.Any()) return Ok(new List<object>());

                var joinedData = from deck in decks
                                 join startup in startups
                                 on deck.startup_id equals startup.Sid
                                 select new
                                 {
                                     pitchdeckid = deck.pitchdeckid.ToString(),
                                     startup_id = deck.startup_id.ToString(),
                                     deck.video_url,
                                     pitchname = deck.pitchname ?? "Untitled Pitch",
                                     deck.is_current,
                                     deck.canaccess,
                                     deck.analysis,
                                     tags = deck.tags ?? new List<string>(),
                                     deck.countlikes,
                                     deck.created_at,
                                     startup = new
                                     {
                                         sid = startup.Sid.ToString(),
                                         startupname = startup.StartupName,
                                         field = startup.Field,
                                         idea_description = startup.IdeaDescription
                                     }
                                 };

                return Ok(joinedData.ToList());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // GET: api/pitchdecks/details/{pitchDeckId}
        [HttpGet("details/{pitchDeckId}")]
        public async Task<IActionResult> GetPitchDeckById(Guid pitchDeckId)
        {
            try
            {
                var deckResult = await _supabase.From<PitchDeck>()
                                        .Where(x => x.pitchdeckid == pitchDeckId)
                                        .Get();

                var deck = deckResult.Models.FirstOrDefault();
                if (deck == null) return NotFound(new { message = "Pitch deck not found" });

                var startupResult = await _supabase.From<Startup>()
                                           .Where(x => x.Sid == deck.startup_id)
                                           .Get();

                var startup = startupResult.Models.FirstOrDefault();

                var response = new
                {
                    pitchdeckid = deck.pitchdeckid.ToString(),
                    startup_id = deck.startup_id.ToString(),
                    deck.video_url,
                    pitchname = deck.pitchname ?? "Untitled Pitch",
                    deck.is_current,
                    deck.analysis,
                    tags = deck.tags ?? new List<string>(),
                    deck.countlikes,
                    deck.created_at,
                    startup = startup != null ? new
                    {
                        sid = startup.Sid.ToString(),
                        startupname = startup.StartupName,
                        field = startup.Field,
                        idea_description = startup.IdeaDescription
                    } : null
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("upload")]
        [RequestFormLimits(MultipartBodyLengthLimit = 104857600)] // 100 MB limit
        [RequestSizeLimit(104857600)]
        public async Task<IActionResult> UploadPitchDeck([FromForm] PitchDeckUploadDto input)
        {
            if (input.startup_id == Guid.Empty) return BadRequest("Startup ID is required.");
            if (input.file == null || input.file.Length == 0) return BadRequest("No file uploaded.");

            // AUTH CHECK
            if (!await _access.IsFounderOrOwner(GetToken(), input.startup_id))
                return Unauthorized(new { message = "Unauthorized upload." });

            try
            {
                // 1. Check if a pitch deck already exists for this startup
                var existingDecks = await _supabase.From<PitchDeck>()
                             .Where(x => x.startup_id == input.startup_id)
                             .Get();

                var existingDeck = existingDecks.Models.FirstOrDefault();

                // 2. Upload the new video file to Supabase Storage
                var fileName = $"{input.startup_id}/{Guid.NewGuid()}_{input.file.FileName}";
                string publicUrl = "";

                using (var memoryStream = new MemoryStream())
                {
                    await input.file.CopyToAsync(memoryStream);
                    var bytes = memoryStream.ToArray();
                    await _supabase.Storage.From("pitch-videos").Upload(bytes, fileName);
                    publicUrl = _supabase.Storage.From("pitch-videos").GetPublicUrl(fileName);
                }

                PitchDeck savedDeck;

                // 3. Update existing row OR Insert a new row
                if (existingDeck != null)
                {
                    // Increment version number and overwrite the existing video URL
                    int newVersion = existingDeck.version_number + 1;

                    await _supabase.From<PitchDeck>()
                        .Where(x => x.pitchdeckid == existingDeck.pitchdeckid)
                        .Set(x => x.video_url, publicUrl)
                        .Set(x => x.is_current, true)
                        .Set(x => x.created_at, DateTime.UtcNow)
                        .Set(x => x.version_number, newVersion)
                        .Set(x => x.pitchname, input.file.FileName) // <--- ADDED FILENAME HERE
                                                                    // Optionally clear the old analysis since the video changed:
                                                                    // .Set(x => x.analysis, null)
                        .Update();

                    // Re-fetch the row because Supabase C# client may return empty Models after Update()
                    var refetchResult = await _supabase.From<PitchDeck>()
                        .Where(x => x.pitchdeckid == existingDeck.pitchdeckid)
                        .Get();
                    savedDeck = refetchResult.Models.FirstOrDefault();
                }
                else
                {
                    // No previous version found — create a new row at version 1
                    var newDeck = new PitchDeck
                    {
                        pitchdeckid = Guid.NewGuid(),
                        startup_id = input.startup_id,
                        video_url = publicUrl,
                        pitchname = input.file.FileName, // <--- ADDED FILENAME HERE
                        tags = new List<string>(),
                        countlikes = 0,
                        is_current = true,
                        created_at = DateTime.UtcNow,
                        version_number = 1
                    };

                    var insertResult = await _supabase.From<PitchDeck>().Insert(newDeck);
                    savedDeck = insertResult.Models.FirstOrDefault();
                }

                if (savedDeck == null) return StatusCode(500, "Failed to save to database");

                return Ok(new PitchDeckResponseDto
                {
                    pitchdeckid = savedDeck.pitchdeckid,
                    startup_id = savedDeck.startup_id,
                    video_url = savedDeck.video_url,
                    is_current = savedDeck.is_current,
                    tags = savedDeck.tags,
                    created_at = savedDeck.created_at,
                    version_number = savedDeck.version_number
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Upload failed: {ex.Message}");
            }
        }

        [HttpGet("{startupId}")]
        public async Task<IActionResult> GetPitchDecks(Guid startupId, [FromQuery] bool onlyPublic = false)
        {
            var query = _supabase.From<PitchDeck>()
                                        .Select("*")
                                        .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, startupId.ToString());

            if (onlyPublic)
            {
                query = query.Filter("canaccess", Supabase.Postgrest.Constants.Operator.Equals, "true");
            }

            var result = await query.Get();

            var dtos = result.Models.Select(d => new PitchDeckResponseDto
            {
                pitchdeckid = d.pitchdeckid,
                startup_id = d.startup_id,
                video_url = d.video_url,
                is_current = d.is_current,
                canaccess = d.canaccess,
                pitchname = d.pitchname ?? "Untitled Pitch",
                tags = d.tags ?? new List<string>(),
                countlikes = d.countlikes,
                analysis = d.analysis,
                created_at = d.created_at
            }).OrderByDescending(x => x.created_at).ToList();

            return Ok(dtos);
        }

        [HttpPatch("rename/{pitchDeckId}")]
        public async Task<IActionResult> RenamePitchDeck(Guid pitchDeckId, [FromBody] RenameDto request)
        {
            if (string.IsNullOrWhiteSpace(request.NewTitle))
                return BadRequest("New title is required.");

            try
            {
                // We need the startupId to verify ownership. Fetch deck first.
                var deckRes = await _supabase.From<PitchDeck>().Where(x => x.pitchdeckid == pitchDeckId).Get();
                var deck = deckRes.Models.FirstOrDefault();
                if (deck == null) return NotFound("Pitch deck not found.");

                // AUTH CHECK
                if (!await _access.IsFounderOrOwner(GetToken(), deck.startup_id))
                    return Unauthorized(new { message = "Unauthorized." });

                var update = await _supabase.From<PitchDeck>()
                                        .Where(x => x.pitchdeckid == pitchDeckId)
                                        .Set(x => x.pitchname, request.NewTitle)
                                        .Update();

                var result = update.Models.FirstOrDefault();
                return Ok(new { message = "Renamed successfully", pitchname = result.pitchname });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error renaming: {ex.Message}");
            }
        }

        [HttpPost("analyze/{pitchDeckId}")]
        public async Task<IActionResult> GenerateAnalysis(Guid pitchDeckId)
        {
            try
            {
                var deckRes = await _supabase.From<PitchDeck>().Where(x => x.pitchdeckid == pitchDeckId).Get();
                var deck = deckRes.Models.FirstOrDefault();
                if (deck == null) return NotFound("Pitch deck not found.");

                // AUTH CHECK
                if (!await _access.IsFounderOrOwner(GetToken(), deck.startup_id))
                    return Unauthorized(new { message = "Unauthorized." });

                // Mock Data 
                var mockAnalysis = new AnalysisContent
                {
                    Short = new ShortAnalysis
                    {
                        Score = 88,
                        Summary = "Strong opening and good energy.",
                        KeyFeedback = new List<FeedbackItem> { new FeedbackItem { Aspect = "Clarity", Score = 90, Comment = "Message is clear" } }
                    },
                    Detailed = new DetailedAnalysis
                    {
                        Tone = "Persuasive",
                        Pacing = "140 wpm",
                        Sections = new List<FeedbackItem> { new FeedbackItem { Aspect = "Ask", Score = 95, Comment = "Clear funding req." } },
                        TranscriptHighlights = new List<string> { "Good use of power words." }
                    }
                };

                var update = await _supabase.From<PitchDeck>()
                                        .Where(x => x.pitchdeckid == pitchDeckId)
                                        .Set(x => x.analysis, mockAnalysis)
                                        .Update();

                var updatedModel = update.Models.FirstOrDefault();
                return Ok(new
                {
                    pitchdeckid = updatedModel.pitchdeckid,
                    analysis = updatedModel.analysis
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal Server Error: {ex.Message}");
            }
        }

        [HttpGet("count/{startupId}")]
        public async Task<IActionResult> GetPitchCount(Guid startupId)
        {
            try
            {
                var result = await _supabase.From<PitchDeck>()
                                            .Select("pitchdeckid")
                                            .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, startupId.ToString())
                                            .Get();
                return Ok(new { count = result.Models.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // PATCH: api/pitchdecks/visibility
        [HttpPatch("visibility")]
        public async Task<IActionResult> ToggleVisibility([FromBody] VisibilityDto request)
        {
            // AUTH CHECK
            if (!await _access.IsFounderOrOwner(GetToken(), request.startupId))
                return Unauthorized(new { message = "Unauthorized." });

            try
            {
                var parameters = new Dictionary<string, object>
                {
                    { "p_pitch_id", request.pitchDeckId },
                    { "p_startup_id", request.startupId },
                    { "p_is_public", request.isPublic }
                };

                await _supabase.Rpc("set_pitch_visibility", parameters);

                return Ok(new { message = "Visibility updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating visibility: {ex.Message}");
            }
        }
    }
}