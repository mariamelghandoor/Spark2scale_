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

        // POST: api/notifications/add
        [HttpPost("add")]
        public async Task<IActionResult> AddNotification([FromBody] NotificationInsertDto input)
        {
            if (input == null || string.IsNullOrEmpty(input.topic))
                return BadRequest("Invalid data. Topic is required.");

            // 1. Map Input -> DB Model
            var newNotif = new Notification
            {
                Nid = Guid.NewGuid(),
                Sender = input.sender,
                Receiver = input.receiver,
                Topic = input.topic,
                Description = input.description,
                CreatedAt = DateTime.UtcNow
            };

            // 2. Insert into Supabase
            var result = await _supabase.From<Notification>().Insert(newNotif);
            var inserted = result.Models.FirstOrDefault();

            if (inserted == null) return StatusCode(500, "Failed to create notification");

            // 3. Map DB Model -> Output DTO
            var response = new NotificationResponseDto
            {
                nid = inserted.Nid,
                sender = inserted.Sender,
                receiver = inserted.Receiver,
                topic = inserted.Topic,
                description = inserted.Description,
                created_at = inserted.CreatedAt
            };

            return Ok(response);
        }

        // GET: api/notifications
        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var result = await _supabase.From<Notification>().Get();

            var dtos = result.Models.Select(n => new NotificationResponseDto
            {
                nid = n.Nid,
                sender = n.Sender,
                receiver = n.Receiver,
                topic = n.Topic,
                description = n.Description,
                created_at = n.CreatedAt
            }).ToList();

            return Ok(dtos);
        }
    }
}