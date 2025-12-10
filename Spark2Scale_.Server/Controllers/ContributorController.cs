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
        public class ContributorController : ControllerBase
        {
            private readonly Client _supabase;

            public ContributorController(Client supabase)
            {
                _supabase = supabase;
            }

            [HttpPost("add")]
            public async Task<IActionResult> AddContributor([FromBody] ContributorDto request)
            {
                if (request == null || request.UserId == Guid.Empty)
                    return BadRequest("Invalid user ID.");

                // 1. Check if the User exists in the Auth table (or your public users table)
                // Note: Ensure the 'User' model is correctly defined in your project
                var userResult = await _supabase
                    .From<User>()
                    .Where(u => u.uid == request.UserId)
                    .Get();

                if (!userResult.Models.Any())
                    return BadRequest("User does not exist.");

                // 2. Create the Contributor object
                var contributor = new Contributor
                {
                    user_id = request.UserId
                };

                // 3. Insert into the 'contributors' table
                try
                {
                    await _supabase.From<Contributor>().Insert(contributor);
                }
                catch (Exception ex)
                {
                    // Catch potential duplicate key errors if they are already a contributor
                    return BadRequest($"Error adding contributor: {ex.Message}");
                }

                return Ok(new
                {
                    message = "Contributor added successfully",
                    userId = request.UserId
                });
            }
        }
    }