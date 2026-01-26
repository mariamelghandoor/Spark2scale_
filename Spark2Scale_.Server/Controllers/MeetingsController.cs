using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using Spark2Scale_.Server.Services;
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
        private readonly EmailService _emailService;

        public MeetingsController(Supabase.Client supabase, EmailService emailService)
        {
            _supabase = supabase;
            _emailService = emailService;
        }

        // Helper to check role
        private async Task<string> GetUserRole(Guid userId)
        {
            var isFounder = await _supabase.From<Founder>().Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, userId.ToString()).Get();
            if (isFounder.Models.Any()) return "founder";

            var isInvestor = await _supabase.From<Investor>().Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, userId.ToString()).Get();
            if (isInvestor.Models.Any()) return "investor";

            return "unknown";
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddMeeting([FromBody] MeetingInsertDto input)
        {
            if (input == null || input.meeting_date == default)
                return BadRequest("Invalid data.");

            // Use Date comparison only
            if (input.meeting_date.Date < DateTime.UtcNow.Date)
                return BadRequest("You cannot schedule a meeting in the past.");

            // 1. IDENTIFY SENDER
            string senderRole = await GetUserRole(input.sender_id);
            if (senderRole == "unknown") return BadRequest("Sender ID is invalid or has no role.");

            // 2. IDENTIFY RECEIVER (By Email)
            var userResult = await _supabase.From<User>()
                .Filter("email", Supabase.Postgrest.Constants.Operator.Equals, input.invitee_email.Trim())
                .Get();

            var receiverUser = userResult.Models.FirstOrDefault();

            if (receiverUser == null)
                return BadRequest($"User with email '{input.invitee_email}' not found.");

            Guid receiverId = receiverUser.uid;
            string receiverName = $"{receiverUser.fname} {receiverUser.lname}";
            string receiverRole = await GetUserRole(receiverId);

            // 3. ENFORCE "OPPOSITE ROLE" RULE
            if (input.sender_id == receiverId)
                return BadRequest("You cannot schedule a meeting with yourself.");

            if (senderRole == "founder" && receiverRole != "investor")
                return BadRequest($"As a Founder, you can only invite Investors. '{input.invitee_email}' is a {receiverRole}.");

            if (senderRole == "investor" && receiverRole != "founder")
                return BadRequest($"As an Investor, you can only invite Founders. '{input.invitee_email}' is a {receiverRole}.");

            if (receiverRole == "unknown")
                return BadRequest("The invitee does not have a valid role (Founder or Investor).");

            // 4. CREATE MEETING
            var newMeeting = new Meeting
            {
                MeetingId = Guid.NewGuid(),
                SenderId = input.sender_id,
                ReceiverId = receiverId,
                StartupId = input.startup_id,

                // --- FIX START ---
                // We add 12 hours (Noon) and force UTC.
                // This ensures that timezone shifts (e.g. -2 hours) don't push the date to the previous day.
                MeetingDate = DateTime.SpecifyKind(input.meeting_date.Date.AddHours(12), DateTimeKind.Utc),
                // --- FIX END ---

                MeetingTime = input.meeting_time,
                MeetingLink = input.meeting_link,
                CreatedAt = DateTime.UtcNow,
                Status = "pending"
            };

            var result = await _supabase.From<Meeting>().Insert(newMeeting);
            var inserted = result.Models.FirstOrDefault();

            if (inserted == null) return StatusCode(500, "Failed to schedule meeting.");

            // 5. NOTIFICATIONS & EMAIL

            // In-App Notification
            var invite = new Notification
            {
                Sender = input.sender_id,
                Receiver = receiverId,
                Topic = "📅 Meeting Invite",
                Description = $"You have been invited to a meeting on {input.meeting_date:MMM dd} at {input.meeting_time}. Click 'Accept' to confirm.",
                Type = "meeting_invite",
                RelatedEntityId = inserted.MeetingId,
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };
            await _supabase.From<Notification>().Insert(invite);

            // HTML Email Notification (Invite)
            string subject = "🧱 New Opportunity: Meeting Invite from Spark2Scale";
            string body = $@"
                <!DOCTYPE html>
                <html>
                <body style='margin:0; padding:0; background-color:#F0EADC; font-family: Arial, sans-serif;'>
                    <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#F0EADC; padding: 40px 0;'>
                        <tr>
                            <td align='center'>
                                <table width='600' border='0' cellspacing='0' cellpadding='0' style='background-color:#ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                                    <tr>
                                        <td style='background-color:#576238; padding: 30px; text-align: center;'>
                                            <h1 style='color:#ffffff; margin:0; font-size: 24px; letter-spacing: 1px;'>Spark2Scale</h1>
                                            <p style='color:#FFD95D; margin:5px 0 0 0; font-size: 14px; font-weight: bold;'>BUILDING THE FUTURE</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style='padding: 40px 30px;'>
                                            <h2 style='color:#576238; margin-top:0;'>Hello {receiverName},</h2>
                                            <p style='color:#555555; font-size: 16px; line-height: 1.5;'>
                                                You have been invited to an exclusive meeting on the <strong>Spark2Scale</strong> platform.
                                            </p>
                                            <div style='background-color:#F9F9F9; border-left: 5px solid #FFD95D; padding: 20px; margin: 25px 0; border-radius: 4px;'>
                                                <table border='0' cellspacing='0' cellpadding='0'>
                                                    <tr>
                                                        <td style='padding-bottom: 10px; padding-right: 15px; font-weight:bold; color:#576238;'>📅 Date:</td>
                                                        <td style='padding-bottom: 10px; color:#333;'>{input.meeting_date:dddd, MMMM dd, yyyy}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style='padding-bottom: 10px; padding-right: 15px; font-weight:bold; color:#576238;'>⏰ Time:</td>
                                                        <td style='padding-bottom: 10px; color:#333;'>{input.meeting_time}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style='font-weight:bold; color:#576238;'>📍 Location:</td>
                                                        <td style='color:#333;'>Virtual Meeting</td>
                                                    </tr>
                                                </table>
                                            </div>
                                            <div style='text-align: center; margin-top: 30px;'>
                                                <a href='{input.meeting_link}' style='background-color:#576238; color:#ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 16px;'>
                                                    Join Meeting
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style='background-color:#f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;'>
                                            <p style='margin:0; font-size: 12px; color:#999;'>&copy; 2025 Spark2Scale Inc.</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            ";

            _ = _emailService.SendEmailAsync(input.invitee_email, subject, body);

            return Ok(new MeetingResponseDto
            {
                meeting_id = inserted.MeetingId,
                status = inserted.Status
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetMeetings([FromQuery] Guid? userId)
        {
            if (!userId.HasValue) return Ok(new List<MeetingResponseDto>());

            var sentTask = _supabase.From<Meeting>().Filter("sender_id", Supabase.Postgrest.Constants.Operator.Equals, userId.Value.ToString()).Get();
            var receivedTask = _supabase.From<Meeting>().Filter("receiver_id", Supabase.Postgrest.Constants.Operator.Equals, userId.Value.ToString()).Get();

            await Task.WhenAll(sentTask, receivedTask);

            var allMeetings = sentTask.Result.Models.Concat(receivedTask.Result.Models)
                                               .GroupBy(m => m.MeetingId).Select(g => g.First())
                                               .OrderBy(m => m.MeetingDate).ToList();

            var userIdsToFetch = new List<string>();
            foreach (var m in allMeetings)
            {
                userIdsToFetch.Add(m.SenderId.ToString());
                userIdsToFetch.Add(m.ReceiverId.ToString());
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
                Guid otherId = (m.SenderId == userId) ? m.ReceiverId : m.SenderId;
                string name = "Unknown Contact";
                var u = usersList.FirstOrDefault(x => x.uid == otherId);
                if (u != null) name = $"{u.fname} {u.lname}".Trim();

                return new MeetingResponseDto
                {
                    meeting_id = m.MeetingId,
                    sender_id = m.SenderId,
                    receiver_id = m.ReceiverId,
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

        // --- NEW: CANCELLATION WITH PRETTY EMAIL ---
        [HttpPost("cancel/{id}")]
        public async Task<IActionResult> CancelMeeting(Guid id)
        {
            var meetingResult = await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Get();
            var meeting = meetingResult.Models.FirstOrDefault();

            if (meeting == null) return NotFound();

            // 1. Update Status
            await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Set(m => m.Status, "canceled").Update();

            // 2. Fetch Receiver Details to send email
            var receiverResult = await _supabase.From<User>()
                .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, meeting.ReceiverId.ToString())
                .Get();
            var receiver = receiverResult.Models.FirstOrDefault();

            if (receiver != null)
            {
                // 3. In-App Notification
                var notif = new Notification
                {
                    Sender = meeting.SenderId,
                    Receiver = meeting.ReceiverId,
                    Topic = "❌ Meeting Canceled",
                    Description = $"The meeting scheduled for {meeting.MeetingDate:MMM dd} has been canceled.",
                    Type = "info",
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false
                };
                await _supabase.From<Notification>().Insert(notif);

                // 4. PRETTY HTML EMAIL (Cancellation)
                string subject = "Updates: Meeting Canceled - Spark2Scale";
                string body = $@"
                    <!DOCTYPE html>
                    <html>
                    <body style='margin:0; padding:0; background-color:#F0EADC; font-family: Arial, sans-serif;'>
                        <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#F0EADC; padding: 40px 0;'>
                            <tr>
                                <td align='center'>
                                    <table width='600' border='0' cellspacing='0' cellpadding='0' style='background-color:#ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 8px solid #DC2626;'>
                                        
                                        <tr>
                                            <td style='padding: 30px; text-align: center; border-bottom: 1px solid #eee;'>
                                                <h1 style='color:#576238; margin:0; font-size: 24px;'>Spark2Scale</h1>
                                                <p style='color:#DC2626; margin:5px 0 0 0; font-size: 14px; font-weight: bold;'>MEETING UPDATES</p>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td style='padding: 40px 30px;'>
                                                <h2 style='color:#333; margin-top:0;'>Hello {receiver.fname},</h2>
                                                <p style='color:#555; font-size: 16px; line-height: 1.5;'>
                                                    We are writing to inform you that the following meeting has been <strong style='color:#DC2626;'>canceled</strong> by the organizer.
                                                </p>
                                                
                                                <div style='background-color:#FEF2F2; border-left: 5px solid #DC2626; padding: 20px; margin: 25px 0; border-radius: 4px;'>
                                                    <table border='0' cellspacing='0' cellpadding='0'>
                                                        <tr>
                                                            <td style='padding-bottom: 10px; padding-right: 15px; font-weight:bold; color:#991B1B;'>📅 Original Date:</td>
                                                            <td style='padding-bottom: 10px; color:#333; text-decoration: line-through;'>{meeting.MeetingDate:dddd, MMMM dd}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style='padding-bottom: 10px; padding-right: 15px; font-weight:bold; color:#991B1B;'>⏰ Time:</td>
                                                            <td style='padding-bottom: 10px; color:#333;'>{meeting.MeetingTime}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style='font-weight:bold; color:#991B1B;'>Status:</td>
                                                            <td style='color:#DC2626; font-weight:bold;'>CANCELED</td>
                                                        </tr>
                                                    </table>
                                                </div>

                                                <p style='color:#666; font-size: 14px;'>
                                                    We apologize for any inconvenience this may cause.
                                                </p>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td style='background-color:#f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;'>
                                                <p style='margin:0; font-size: 12px; color:#aaa;'>&copy; 2025 Spark2Scale Inc.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                ";

                _ = _emailService.SendEmailAsync(receiver.email, subject, body);
            }

            return Ok();
        }
    }
}