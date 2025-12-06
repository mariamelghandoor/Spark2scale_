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

        [HttpPost("add")]
        public async Task<IActionResult> AddMeeting([FromBody] MeetingInsertDto input)
        {
            if (input == null || input.meeting_date == default)
                return BadRequest("Invalid data.");

            if (input.meeting_date.Date < DateTime.UtcNow.Date)
            {
                return BadRequest("You cannot schedule a meeting in the past.");
            }

            Guid? investorId = null;

            if (!string.IsNullOrEmpty(input.invitee_email))
            {
                var userResult = await _supabase.From<User>()
                    .Filter("email", Supabase.Postgrest.Constants.Operator.Equals, input.invitee_email.Trim())
                    .Get();

                var invitedUser = userResult.Models.FirstOrDefault();

                if (invitedUser == null)
                {
                    return BadRequest($"User with email '{input.invitee_email}' not found.");
                }
                investorId = invitedUser.uid;
            }

            var newMeeting = new Meeting
            {
                MeetingId = Guid.NewGuid(),
                FounderId = input.founder_id,
                InvestorId = investorId,
                StartupId = input.startup_id,
                MeetingDate = input.meeting_date,
                MeetingTime = input.meeting_time,
                MeetingLink = input.meeting_link,
                CreatedAt = DateTime.UtcNow,
                Status = "pending"
            };

            try
            {
                var result = await _supabase.From<Meeting>().Insert(newMeeting);
                var inserted = result.Models.FirstOrDefault();

                if (inserted == null) return StatusCode(500, "Failed to schedule meeting.");

                if (investorId.HasValue)
                {
                    var invite = new Notification
                    {
                        Sender = input.founder_id,
                        Receiver = investorId,
                        Topic = "📅 Meeting Invite",
                        Description = $"You have been invited to a meeting on {input.meeting_date:MMM dd} at {input.meeting_time}. Click 'Accept' to confirm.",
                        Type = "meeting_invite",
                        RelatedEntityId = inserted.MeetingId,
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    };
                    await _supabase.From<Notification>().Insert(invite);
                }

                return Ok(new MeetingResponseDto
                {
                    meeting_id = inserted.MeetingId,
                    status = inserted.Status
                });
            }
            catch (Supabase.Postgrest.Exceptions.PostgrestException ex)
            {
                if (ex.Message.Contains("meetings_investor_id_fkey"))
                {
                    return BadRequest($"The user '{input.invitee_email}' exists, but they are not registered as an Investor.");
                }
                throw;
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetMeetings([FromQuery] Guid? userId)
        {
            if (!userId.HasValue) return Ok(new List<MeetingResponseDto>());

            var asFounderTask = _supabase.From<Meeting>()
                .Filter("founder_id", Supabase.Postgrest.Constants.Operator.Equals, userId.Value.ToString())
                .Get();

            var asInvestorTask = _supabase.From<Meeting>()
                .Filter("investor_id", Supabase.Postgrest.Constants.Operator.Equals, userId.Value.ToString())
                .Get();

            await Task.WhenAll(asFounderTask, asInvestorTask);

            var allMeetings = asFounderTask.Result.Models.Concat(asInvestorTask.Result.Models)
                                   .GroupBy(m => m.MeetingId).Select(g => g.First())
                                   .OrderBy(m => m.MeetingDate).ToList();

            var userIdsToFetch = new List<string>();
            foreach (var m in allMeetings)
            {
                if (m.FounderId.HasValue) userIdsToFetch.Add(m.FounderId.Value.ToString());
                if (m.InvestorId.HasValue) userIdsToFetch.Add(m.InvestorId.Value.ToString());
            }
            userIdsToFetch = userIdsToFetch.Distinct().ToList();

            var usersList = new List<User>();
            if (userIdsToFetch.Any())
            {
                var uRes = await _supabase.From<User>().Filter("uid", Supabase.Postgrest.Constants.Operator.In, userIdsToFetch).Get();
                usersList = uRes.Models;
            }

            var dtos = allMeetings.Select(m =>
            {
                Guid? otherId = (m.FounderId == userId) ? m.InvestorId : m.FounderId;
                string name = "Unknown Contact";
                if (otherId.HasValue)
                {
                    var u = usersList.FirstOrDefault(x => x.uid == otherId);
                    if (u != null) name = $"{u.fname} {u.lname}".Trim();
                }

                return new MeetingResponseDto
                {
                    meeting_id = m.MeetingId,
                    founder_id = m.FounderId,
                    investor_id = m.InvestorId,
                    meeting_date = m.MeetingDate,
                    meeting_time = m.MeetingTime,
                    meeting_link = m.MeetingLink,
                    created_at = m.CreatedAt,
                    with_whom_name = name,
                    status = m.Status
                };
            }).ToList();

            return Ok(dtos);
        }

        [HttpPost("accept/{id}")]
        public async Task<IActionResult> AcceptMeeting(Guid id)
        {
            await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Set(m => m.Status, "accepted").Update();
            return Ok();
        }

        [HttpPost("reject/{id}")]
        public async Task<IActionResult> RejectMeeting(Guid id)
        {
            await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Set(m => m.Status, "rejected").Update();
            return Ok();
        }

        // NEW: CANCEL MEETING
        [HttpPost("cancel/{id}")]
        public async Task<IActionResult> CancelMeeting(Guid id)
        {
            // 1. Get Meeting Info first to know who to notify
            var meetingResult = await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Get();
            var meeting = meetingResult.Models.FirstOrDefault();

            if (meeting == null) return NotFound();

            // 2. Update Status to 'canceled'
            await _supabase.From<Meeting>()
                .Where(m => m.MeetingId == id)
                .Set(m => m.Status, "canceled")
                .Update();

            // 3. Notify the OTHER person (The Investor)
            if (meeting.InvestorId.HasValue)
            {
                var notif = new Notification
                {
                    Sender = meeting.FounderId,
                    Receiver = meeting.InvestorId,
                    Topic = "❌ Meeting Canceled",
                    Description = $"The meeting scheduled for {meeting.MeetingDate:MMM dd} has been canceled by the organizer.",
                    Type = "info",
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false
                };
                await _supabase.From<Notification>().Insert(notif);
            }

            return Ok();
        }
    }
}