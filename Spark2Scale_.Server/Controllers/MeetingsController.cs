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
                // We add 12 hours (Noon) and force UTC.
                MeetingDate = DateTime.SpecifyKind(input.meeting_date.Date.AddHours(12), DateTimeKind.Utc),
                MeetingTime = input.meeting_time,
                MeetingLink = input.meeting_link,
                CreatedAt = DateTime.UtcNow,
                Status = "pending"
            };

            await _supabase.From<Meeting>().Insert(newMeeting);
            var inserted = newMeeting; // We use the local object to ensure IDs are present

            // 5. NOTIFICATIONS & EMAIL

            // In-App Notification
            var invite = new Notification
            {
                Sender = input.sender_id,
                Receiver = receiverId,
                Topic = "📅 Meeting Invite",
                Description = $"You have been invited to a meeting on {input.meeting_date:MMM dd} at {input.meeting_time}. Click 'Accept' to confirm.",

                // CRITICAL: Ensure Type is correct and RelatedEntityId is set
                Type = "meeting_invite",
                RelatedEntityId = inserted.MeetingId,

                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };
            await _supabase.From<Notification>().Insert(invite);

            // HTML Email Notification (Invite) - YOUR ORIGINAL FORMAT RESTORED
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

        // --- FIXED ACCEPT: UPDATES NOTIFICATION SO BUTTONS VANISH ---
        [HttpPost("accept/{id}")]
        public async Task<IActionResult> AcceptMeeting(Guid id)
        {
            await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Set(m => m.Status, "accepted").Update();

            // Fix: Change Notification type so buttons don't appear on refresh
            await _supabase.From<Notification>()
                .Where(n => n.RelatedEntityId == id)
                .Set(n => n.Type, "info")
                .Set(n => n.Description, "✅ You have accepted this meeting.")
                .Update();

            return Ok();
        }

        // --- FIXED REJECT: SENDS EMAIL TO SENDER & UPDATES NOTIFICATION ---
        [HttpPost("reject/{id}")]
        public async Task<IActionResult> RejectMeeting(Guid id)
        {
            var meetingResult = await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Get();
            var meeting = meetingResult.Models.FirstOrDefault();

            if (meeting == null) return NotFound();

            // 1. Update Meeting Status
            await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Set(m => m.Status, "rejected").Update();

            // 2. Fix: Update Notification so buttons don't appear on refresh
            await _supabase.From<Notification>()
                .Where(n => n.RelatedEntityId == id)
                .Set(n => n.Type, "info")
                .Set(n => n.Description, "❌ You declined this meeting.")
                .Update();

            // 3. Notify Sender (Email + App Notification)
            var senderResult = await _supabase.From<User>().Where(u => u.uid == meeting.SenderId).Get();
            var senderUser = senderResult.Models.FirstOrDefault();

            var receiverResult = await _supabase.From<User>().Where(u => u.uid == meeting.ReceiverId).Get();
            var rejectorUser = receiverResult.Models.FirstOrDefault();

            if (senderUser != null && rejectorUser != null)
            {
                // App Notification for Sender
                var notif = new Notification
                {
                    Sender = meeting.ReceiverId,
                    Receiver = meeting.SenderId,
                    Topic = "❌ Invitation Declined",
                    Description = $"{rejectorUser.fname} {rejectorUser.lname} has declined your meeting invite.",
                    Type = "info",
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false
                };
                await _supabase.From<Notification>().Insert(notif);

                // Email to Sender
                string subject = "Update: Meeting Invitation Declined";
                string body = $@"
                    <!DOCTYPE html>
                    <html>
                    <body style='font-family: Arial, sans-serif; background-color:#F0EADC; padding: 40px 0;'>
                        <div style='background-color: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; border-top: 5px solid #DC2626;'>
                            <h2 style='color: #576238; margin-top: 0;'>Hello {senderUser.fname},</h2>
                            <p style='color: #555; font-size: 16px;'>
                                We wanted to let you know that <strong>{rejectorUser.fname} {rejectorUser.lname}</strong> has declined your invitation.
                            </p>
                            <div style='background-color: #FEF2F2; padding: 15px; border-radius: 4px; border: 1px solid #FCA5A5; margin: 20px 0;'>
                                <p style='margin: 5px 0; color: #991B1B;'><strong>📅 Date:</strong> {meeting.MeetingDate:MMM dd, yyyy}</p>
                                <p style='margin: 5px 0; color: #991B1B;'><strong>⏰ Time:</strong> {meeting.MeetingTime}</p>
                                <p style='margin: 5px 0; color: #991B1B;'><strong>Status:</strong> <span style='font-weight: bold;'>REJECTED</span></p>
                            </div>
                            <p style='color: #666; font-size: 14px;'>
                                You may want to reschedule or contact them directly.
                            </p>
                            <p style='color: #aaa; font-size: 12px; margin-top: 30px;'>Spark2Scale Inc.</p>
                        </div>
                    </body>
                    </html>";

                _ = _emailService.SendEmailAsync(senderUser.email, subject, body);
            }

            return Ok();
        }

        [HttpPost("cancel/{id}")]
        public async Task<IActionResult> CancelMeeting(Guid id)
        {
            var meetingResult = await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Get();
            var meeting = meetingResult.Models.FirstOrDefault();

            if (meeting == null) return NotFound();

            await _supabase.From<Meeting>().Where(m => m.MeetingId == id).Set(m => m.Status, "canceled").Update();

            var receiverResult = await _supabase.From<User>()
                .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, meeting.ReceiverId.ToString())
                .Get();
            var receiver = receiverResult.Models.FirstOrDefault();

            if (receiver != null)
            {
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

                string subject = "Updates: Meeting Canceled - Spark2Scale";
                string body = $"Hello {receiver.fname}, the meeting on {meeting.MeetingDate:d} has been canceled.";
                _ = _emailService.SendEmailAsync(receiver.email, subject, body);
            }

            return Ok();
        }
    }
}