
﻿using Microsoft.AspNetCore.Http; // Required for IFormFile
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

        public PitchDecksController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }


        // GET: api/pitchdecks/with-startups
        [HttpGet("with-startups")]
        public async Task<IActionResult> GetAllPitchDecksWithStartups()
        {
            try
            {
                Console.WriteLine("[DEBUG] Starting GetAllPitchDecksWithStartups...");

                // 1. Fetch all Pitch Decks
                Console.WriteLine("[DEBUG] Fetching pitch decks...");
                var decksResponse = await _supabase
                    .From<PitchDeck>()
                    .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();

                var decks = decksResponse.Models;
                Console.WriteLine($"[DEBUG] Found {decks?.Count ?? 0} pitch decks");

                if (decks == null || !decks.Any())
                {
                    Console.WriteLine("[WARNING] No pitch decks found in database");
                    return Ok(new List<object>()); // Return empty array instead of error
                }

                // 2. Fetch all Startups
                Console.WriteLine("[DEBUG] Fetching startups...");
                var startupsResponse = await _supabase
                    .From<Startup>()
                    .Get();

                var startups = startupsResponse.Models;
                Console.WriteLine($"[DEBUG] Found {startups?.Count ?? 0} startups");

                if (startups == null || !startups.Any())
                {
                    Console.WriteLine("[WARNING] No startups found in database");
                    return Ok(new List<object>()); // Return empty array
                }

                // 3. Join them manually using LINQ
                Console.WriteLine("[DEBUG] Performing LINQ join...");
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

                var result = joinedData.ToList();
                Console.WriteLine($"[DEBUG] Joined data count: {result.Count}");
                Console.WriteLine($"[DEBUG] Returning JSON response...");

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Exception in GetAllPitchDecksWithStartups: {ex.Message}");
                Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
                return StatusCode(500, new
                {
                    error = ex.Message,
                    details = ex.StackTrace,
                    source = "GetAllPitchDecksWithStartups"
                });
            }
        }

        //[HttpGet("details/{pitchDeckId}")]
        //public async Task<IActionResult> GetPitchDeckById(Guid pitchDeckId)
        //{
        //    var result = await _supabase.From<PitchDeck>()
        //                                .Where(x => x.pitchdeckid == pitchDeckId)
        //                                .Get();

        //    var deck = result.Models.FirstOrDefault();
        //    if (deck == null) return NotFound();

        //    var responseDto = new PitchDeckResponseDto
        //    {
        //        pitchdeckid = deck.pitchdeckid,
        //        startup_id = deck.startup_id,
        //        video_url = deck.video_url,
        //        is_current = deck.is_current,
        //        analysis = deck.analysis,
        //        tags = deck.tags,
        //        countlikes = deck.countlikes,
        //        created_at = deck.created_at
        //    };

        //    return Ok(responseDto);
        //}

        // GET: api/pitchdecks/details/{pitchDeckId}
        [HttpGet("details/{pitchDeckId}")]
        public async Task<IActionResult> GetPitchDeckById(Guid pitchDeckId)
        {
            try
            {
                Console.WriteLine($"[DEBUG] Fetching details for pitch deck: {pitchDeckId}");

                // Fetch the pitch deck
                var deckResult = await _supabase.From<PitchDeck>()
                                        .Where(x => x.pitchdeckid == pitchDeckId)
                                        .Get();

                var deck = deckResult.Models.FirstOrDefault();

                if (deck == null)
                {
                    Console.WriteLine($"[WARNING] Pitch deck not found: {pitchDeckId}");
                    return NotFound(new { message = "Pitch deck not found" });
                }

                Console.WriteLine($"[DEBUG] Found pitch deck, fetching startup info...");

                // Fetch the associated startup
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

                Console.WriteLine($"[DEBUG] Returning pitch deck details");
                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Exception in GetPitchDeckById: {ex.Message}");
                return StatusCode(500, new
                {
                    error = ex.Message,
                    source = "GetPitchDeckById"
                });
            }
        }

 
       
        [HttpPost("upload")]
        public async Task<IActionResult> UploadPitchDeck([FromForm] PitchDeckUploadDto input)
        {
            // Validate
            if (input.startup_id == Guid.Empty) return BadRequest("Startup ID is required.");
            if (input.file == null || input.file.Length == 0) return BadRequest("No file uploaded.");

            try
            {
                // 1. UPDATE EXISTING VIDEOS: Set is_current = false for this startup
                // This ensures only the new one will be true
                await _supabase.From<PitchDeck>()
                             .Where(x => x.startup_id == input.startup_id)
                             .Set(x => x.is_current, false)
                             .Update();

                // 2. Upload Video to Supabase Storage
                var fileName = $"{input.startup_id}/{Guid.NewGuid()}_{input.file.FileName}";
                string publicUrl = "";

                using (var memoryStream = new MemoryStream())
                {
                    await input.file.CopyToAsync(memoryStream);
                    var bytes = memoryStream.ToArray();

                    // Make sure "pitch-videos" bucket exists in Supabase Storage!
                    await _supabase.Storage.From("pitch-videos").Upload(bytes, fileName);

                    publicUrl = _supabase.Storage.From("pitch-videos").GetPublicUrl(fileName);
                }

                // 3. Save Metadata to Database (Set is_current = true)
                var newDeck = new PitchDeck
                {
                    startup_id = input.startup_id,
                    video_url = publicUrl,
                    tags = new List<string>(),
                    countlikes = 0,
                    is_current = true, // <--- Set this to TRUE
                    created_at = DateTime.UtcNow
                };

                var result = await _supabase.From<PitchDeck>().Insert(newDeck);
                var inserted = result.Models.FirstOrDefault();

                if (inserted == null) return StatusCode(500, "Failed to save to database");

                return Ok(new PitchDeckResponseDto
                {
                    pitchdeckid = inserted.pitchdeckid,
                    startup_id = inserted.startup_id,
                    video_url = inserted.video_url,
                    is_current = inserted.is_current, // Return status
                    tags = inserted.tags,
                    created_at = inserted.created_at
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Upload failed: {ex.Message}");
            }
        }

        [HttpGet("{startupId}")]
        public async Task<IActionResult> GetPitchDecks(Guid startupId)
        {
            // Fetch only for specific startup
            var result = await _supabase.From<PitchDeck>()
                                        .Select("*")
                                        .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, startupId.ToString())
                                        .Get();


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
                var update = await _supabase.From<PitchDeck>()
                                        .Where(x => x.pitchdeckid == pitchDeckId)
                                        .Set(x => x.pitchname, request.NewTitle)
                                        .Update();

                var result = update.Models.FirstOrDefault();


                if (result == null) return NotFound("Pitch deck not found.");

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
                Console.WriteLine($"[INFO] Generating analysis for: {pitchDeckId}");


                // 1. Mock Data Generation

                var mockAnalysis = new AnalysisContent
                {
                    Short = new ShortAnalysis
                    {
                        Score = 88,
                        Summary = "Strong opening and good energy. Lacks specific market data in the middle section.",
                        KeyFeedback = new List<FeedbackItem>
                        {
                            new FeedbackItem { Aspect = "Clarity", Score = 90, Comment = "Message is clear" },
                            new FeedbackItem { Aspect = "Confidence", Score = 85, Comment = "Good eye contact" }
                        }
                    },
                    Detailed = new DetailedAnalysis
                    {
                        Tone = "Persuasive and Enthusiastic",
                        Pacing = "140 words per minute (Ideal range)",
                        Sections = new List<FeedbackItem>
                        {
                            new FeedbackItem { Aspect = "Problem Statement", Score = 92, Comment = "Very relatable hook." },
                            new FeedbackItem { Aspect = "Solution", Score = 88, Comment = "Tech stack is well explained." },
                            new FeedbackItem { Aspect = "Business Model", Score = 75, Comment = "Revenue projections are vague." },
                            new FeedbackItem { Aspect = "Ask", Score = 95, Comment = "Clear funding requirements." }
                        },
                        TranscriptHighlights = new List<string>
                        {
                            "Used power words like 'Revolutionary' and 'Scalable'.",
                            "Paused effectively after the problem statement."
                        }
                    }
                };


                var update = await _supabase.From<PitchDeck>()
                                        .Where(x => x.pitchdeckid == pitchDeckId)
                                        .Set(x => x.analysis, mockAnalysis)
                                        .Update();

                var updatedModel = update.Models.FirstOrDefault();
                if (updatedModel == null) return NotFound("Pitch deck not found or update failed.");


                var responseDto = new PitchDeckResponseDto
                {
                    pitchdeckid = updatedModel.pitchdeckid,
                    startup_id = updatedModel.startup_id,
                    video_url = updatedModel.video_url,
                    pitchname = updatedModel.pitchname,
                    is_current = updatedModel.is_current,
                    analysis = updatedModel.analysis,
                    tags = updatedModel.tags,
                    countlikes = updatedModel.countlikes,
                    created_at = updatedModel.created_at
                };

                return Ok(responseDto);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] {ex.Message}");
                return StatusCode(500, $"Internal Server Error: {ex.Message}");
            }
        }





        // Inside PitchDecksController.cs

        [HttpGet("count/{startupId}")]
        public async Task<IActionResult> GetPitchCount(Guid startupId)
        {
            try
            {

                var result = await _supabase.From<PitchDeck>()
                                            .Select("pitchdeckid")
                                            .Filter("startup_id", Supabase.Postgrest.Constants.Operator.Equals, startupId.ToString())
                                            .Get();

                // 2. Count the items in the list using standard C# LINQ
                int count = result.Models.Count;

                return Ok(new { count = count });
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
            try
            {
                // We use RPC to call the secure SQL function we created
                // This ensures the "Only One Public" rule is enforced by the database
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