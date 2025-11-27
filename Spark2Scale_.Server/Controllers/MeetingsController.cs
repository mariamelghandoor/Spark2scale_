using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MeetingsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public MeetingsController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // POST: api/meetings/add
        [HttpPost("add")]
        public async Task<IActionResult> AddMeeting([FromBody] MeetingInsertDto input)
        {
            // 1. Validate
            if (input == null || input.meeting_date == default)
                return BadRequest("Invalid data. Meeting date is required.");

            // 2. Map Input DTO -> Database Model
            var newMeeting = new Meeting
            {
                MeetingId = Guid.NewGuid(),
                FounderId = input.founder_id,
                InvestorId = input.investor_id,
                StartupId = input.startup_id,
                MeetingDate = input.meeting_date,
                MeetingTime = input.meeting_time,
                MeetingLink = input.meeting_link,
                CreatedAt = DateTime.UtcNow
            };

            // 3. Insert into Supabase
            try
            {
                var result = await _supabase.From<Meeting>().Insert(newMeeting);
                var inserted = result.Models.FirstOrDefault();

                if (inserted == null) return StatusCode(500, "Failed to schedule meeting.");

                // 4. Map Database Model -> Output DTO
                var response = new MeetingResponseDto
                {
                    meeting_id = inserted.MeetingId,
                    founder_id = inserted.FounderId,
                    investor_id = inserted.InvestorId,
                    startup_id = inserted.StartupId,
                    meeting_date = inserted.MeetingDate,
                    meeting_time = inserted.MeetingTime,
                    meeting_link = inserted.MeetingLink,
                    created_at = inserted.CreatedAt
                };

                return Ok(response);
            }
            catch (Supabase.Postgrest.Exceptions.PostgrestException ex)
            {
                // Handle foreign key errors
                if (ex.Message.Contains("violates foreign key constraint"))
                {
                    return BadRequest("One of the provided IDs (founder, investor, or startup) does not exist.");
                }
                throw;
            }
        }

        // GET: api/meetings
        [HttpGet]
        public async Task<IActionResult> GetMeetings()
        {
            var result = await _supabase.From<Meeting>().Get();

            var dtos = result.Models.Select(m => new MeetingResponseDto
            {
                meeting_id = m.MeetingId,
                founder_id = m.FounderId,
                investor_id = m.InvestorId,
                startup_id = m.StartupId,
                meeting_date = m.MeetingDate,
                meeting_time = m.MeetingTime,
                meeting_link = m.MeetingLink,
                created_at = m.CreatedAt
            }).ToList();

            return Ok(dtos);
        }
    }
}