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
    public class NotificationsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public NotificationsController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddNotification([FromBody] NotificationInsertDto input)
        {
            if (input == null || string.IsNullOrEmpty(input.topic))
                return BadRequest("Invalid data. Topic is required.");

            var newNotif = new Notification
            {
                Sender = input.sender,
                Receiver = input.receiver,
                Topic = input.topic,
                Description = input.description,
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            var result = await _supabase.From<Notification>().Insert(newNotif);
            var inserted = result.Models.FirstOrDefault();

            if (inserted == null) return StatusCode(500, "Failed to create notification");

            return Ok(new NotificationResponseDto
            {
                nid = inserted.Nid,
                sender = inserted.Sender,
                receiver = inserted.Receiver,
                topic = inserted.Topic,
                description = inserted.Description,
                created_at = inserted.CreatedAt,
                is_read = inserted.IsRead,
                sender_name = "System"
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] Guid? userId)
        {
            Supabase.Postgrest.Responses.ModeledResponse<Notification> result;

            if (userId.HasValue)
            {
                result = await _supabase.From<Notification>()
                    .Filter("receiver", Supabase.Postgrest.Constants.Operator.Equals, userId.Value.ToString())
                    .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();
            }
            else
            {
                result = await _supabase.From<Notification>()
                    .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();
            }

            var notifications = result.Models;
            if (!notifications.Any()) return Ok(new List<NotificationResponseDto>());

            var senderIds = notifications
                .Where(n => n.Sender != null)
                .Select(n => n.Sender.Value.ToString())
                .Distinct()
                .ToList();

            var usersList = new List<User>();
            if (senderIds.Any())
            {
                var usersResult = await _supabase.From<User>()
                    .Filter("uid", Supabase.Postgrest.Constants.Operator.In, senderIds)
                    .Get();
                usersList = usersResult.Models;
            }

            var dtos = notifications.Select(n =>
            {
                string name = "System Notification";

                if (n.Sender != null)
                {
                    var user = usersList.FirstOrDefault(u => u.uid == n.Sender);
                    if (user != null)
                    {
                        name = $"{user.fname} {user.lname}".Trim();
                        if (string.IsNullOrEmpty(name)) name = user.email;
                    }
                    else
                    {
                        name = "Unknown User";
                    }
                }

                return new NotificationResponseDto
                {
                    nid = n.Nid,
                    sender = n.Sender,
                    receiver = n.Receiver,
                    topic = n.Topic,
                    description = n.Description,
                    created_at = n.CreatedAt,
                    is_read = n.IsRead,
                    sender_name = name,
                    type = n.Type,
                    related_entity_id = n.RelatedEntityId,

                };
            }).ToList();

            return Ok(dtos);
        }

        [HttpPost("read/{id}")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            await _supabase.From<Notification>()
                           .Where(x => x.Nid == id)
                           .Set(x => x.IsRead, true)
                           .Update();
            return Ok();
        }
    }
}