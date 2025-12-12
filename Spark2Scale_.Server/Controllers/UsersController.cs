using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public UsersController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddUser([FromBody] User user)
        {
            if (user == null || string.IsNullOrEmpty(user.email))
                return BadRequest("Invalid user data.");

            // Generate a UUID for the user if not provided
            if (user.uid == Guid.Empty)
                user.uid = Guid.NewGuid();

            user.created_at = DateTime.UtcNow;

            var table = _supabase.From<User>();
            var result = await table.Insert(user);

            var inserted = result.Models.FirstOrDefault();
            if (inserted == null) return StatusCode(500, "Failed to insert user");

            // Map to DTO to avoid BaseModel serialization issues
            var dto = new UserDto
            {
                uid = inserted.uid,
                fname = inserted.fname,
                lname = inserted.lname,
                email = inserted.email,
                phone_number = inserted.phone_number,
                address_region = inserted.address_region,
                created_at = inserted.created_at
            };

            return Ok(dto);
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var table = _supabase.From<User>();
            var result = await table.Get();

            // Map each user to DTO
            var dtos = result.Models.Select(u => new UserDto
            {
                uid = u.uid,
                fname = u.fname,
                lname = u.lname,
                email = u.email,
                phone_number = u.phone_number,
                address_region = u.address_region,
                created_at = u.created_at
            }).ToList();

            return Ok(dtos);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var result = await _supabase.From<User>()
                .Where(u => u.uid == id)
                .Single();

            if (result == null) return NotFound();

            return Ok(new
            {
                fname = result.fname,
                lname = result.lname
            });
        }
    }
}