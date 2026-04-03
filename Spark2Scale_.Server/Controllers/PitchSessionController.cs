using Microsoft.AspNetCore.Mvc;
using Livekit.Server.Sdk.Dotnet;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PitchSessionController : ControllerBase
    {
        private readonly string _liveKitApiKey;
        private readonly string _liveKitApiSecret;

        public PitchSessionController(IConfiguration configuration)
        {
            _liveKitApiKey = Environment.GetEnvironmentVariable("LIVEKIT_API_KEY") ?? string.Empty;
            _liveKitApiSecret = Environment.GetEnvironmentVariable("LIVEKIT_API_SECRET") ?? string.Empty;
        }

        [HttpPost("generate-token")]
        public IActionResult GenerateToken([FromBody] TokenRequest request)
        {
            // Define a unique room name for this pitch session
            var roomName = $"pitch-room-{request.SessionId}";

            var token = new AccessToken(_liveKitApiKey, _liveKitApiSecret)
                .WithIdentity(request.UserId)
                .WithName(request.UserName)
                .WithGrants(new VideoGrants
                {
                    RoomJoin = true,
                    Room = roomName,
                    CanPublish = true,   // Founder needs to send audio
                    CanSubscribe = true, // Founder needs to receive data/agent voice
                    CanPublishData = true 
                });

            return Ok(new { 
                Token = token.ToJwt(),
                RoomName = roomName 
            });
        }
    }

    public class TokenRequest 
    { 
        public string SessionId { get; set; } 
        public string UserId { get; set; } 
        public string UserName { get; set; } 
    }
}
