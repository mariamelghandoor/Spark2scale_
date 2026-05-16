using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private const string AI_SERVER_BASE = "https://spark2scale-ai-api-server.azurewebsites.net";

        private readonly Client _supabase;
        private readonly IHttpClientFactory _httpClientFactory;

        public ChatController(Client supabase, IHttpClientFactory httpClientFactory)
        {
            _supabase = supabase;
            _httpClientFactory = httpClientFactory;
        }

        // GET: api/Chat/sessions/{startupId}/{featureType}
        // Returns the list of sessions for the sidebar (e.g., Idea Check 1, Idea Check 2)
        [HttpGet("sessions/{startupId}/{featureType}")]
        public async Task<IActionResult> GetSessions(string startupId, string featureType)
        {
            if (!Guid.TryParse(startupId, out Guid sId)) return BadRequest("Invalid ID");

            try
            {
                var result = await _supabase.From<ChatSession>()
                    .Where(x => x.StartupId == sId && x.FeatureType == featureType)
                    .Order("session_number", Supabase.Postgrest.Constants.Ordering.Descending) // Newest first
                    .Get();


                var summaries = result.Models.Select(s => new SessionSummaryDto
                {
                    SessionId = s.SessionId,
                    SessionName = s.SessionName ?? $"Session {s.SessionNumber}",
                    CreatedAt = s.CreatedAt
                });

                return Ok(summaries);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error loading sessions: {ex.Message}");
            }
        }

        // GET: api/Chat/messages/{sessionId}
        // Loads the chat history for one specific session
        [HttpGet("messages/{sessionId}")]
        public async Task<IActionResult> GetSessionMessages(string sessionId)
        {
            if (!Guid.TryParse(sessionId, out Guid sessId)) return BadRequest("Invalid ID");

            try
            {
                var result = await _supabase.From<ChatSession>()
                    .Where(x => x.SessionId == sessId)
                    .Get();

                var session = result.Models.FirstOrDefault();

                // Return empty list if session not found, or the actual messages
                return Ok(session?.Messages ?? new List<ChatMessage>());
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error loading messages: {ex.Message}");
            }
        }

        // POST: api/Chat/start-new
        // Creates "Idea Check X+1"
        [HttpPost("start-new")]
        public async Task<IActionResult> StartNewSession([FromBody] SendMessageDto input)
        {
            try
            {
                // 1. Find the highest existing number for this feature
                var existing = await _supabase.From<ChatSession>()
                    .Where(x => x.StartupId == input.StartupId && x.FeatureType == input.FeatureType)
                    .Order("session_number", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Limit(1)
                    .Get();

                // 2. Calculate next number
                int nextNum = 1;
                if (existing.Models.Any())
                {
                    nextNum = existing.Models.First().SessionNumber + 1;
                }

                // 3. Create Name based on feature type
                string prefix = input.FeatureType == "idea_check" ? "Idea Check" :
                                input.FeatureType == "document_gen" ? "Document Gen" : "Session";

                var newSession = new ChatSession
                {
                    StartupId = input.StartupId,
                    FeatureType = input.FeatureType,
                    SessionNumber = nextNum,
                    SessionName = $"{prefix} {nextNum}",
                    CreatedAt = DateTime.UtcNow,
                    Messages = new List<ChatMessage>() // Start empty
                };

                // 4. Save to DB
                var result = await _supabase.From<ChatSession>().Insert(newSession);
                var created = result.Models.First();

                return Ok(new { sessionId = created.SessionId, sessionName = created.SessionName });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error creating session: {ex.Message}");
            }
        }

        // POST: api/Chat/send
        // Adds a message to an EXISTING session
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] MessageInputDto input)
        {
            try
            {
                // 1. Fetch the specific session
                var result = await _supabase.From<ChatSession>()
                    .Where(x => x.SessionId == input.SessionId)
                    .Get();

                var session = result.Models.FirstOrDefault();
                if (session == null) return NotFound("Session not found");

                // 2. Append Message to the List
                // Initialize list if null (safety check)
                if (session.Messages == null) session.Messages = new List<ChatMessage>();

                session.Messages.Add(new ChatMessage
                {
                    Role = input.Role, // "user" or "assistant"
                    Content = input.Content,
                    Timestamp = DateTime.UtcNow
                });

                // 3. Upsert the updated object back to DB
                await _supabase.From<ChatSession>().Upsert(session);

                return Ok(new { status = "Saved" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error sending message: {ex.Message}");
            }
        }

        // POST: api/Chat/enhance/{sessionId}
        // Summarizes messages added since the last enhancement, stores the
        // summary on the session (summarized_chat) and updates last_enhanced_at.
        [HttpPost("enhance/{sessionId}")]
        public async Task<IActionResult> EnhanceSession(string sessionId)
        {
            if (!Guid.TryParse(sessionId, out Guid sessId)) return BadRequest("Invalid ID");

            try
            {
                var result = await _supabase.From<ChatSession>()
                    .Where(x => x.SessionId == sessId)
                    .Get();

                var session = result.Models.FirstOrDefault();
                if (session == null) return NotFound("Session not found");

                var allMessages = session.Messages ?? new List<ChatMessage>();
                var cutoff = session.LastEnhancedAt;

                var newMessages = cutoff.HasValue
                    ? allMessages.Where(m => m.Timestamp > cutoff.Value).ToList()
                    : allMessages;

                if (!newMessages.Any())
                {
                    return Ok(new
                    {
                        status = "NoChanges",
                        summarizedChat = session.SummarizedChat,
                        lastEnhancedAt = session.LastEnhancedAt
                    });
                }

                var payload = new
                {
                    messages = newMessages.Select(m => new
                    {
                        role = m.Role,
                        content = m.Content
                    })
                };

                var http = _httpClientFactory.CreateClient();
                http.Timeout = TimeSpan.FromMinutes(2);

                var aiResponse = await http.PostAsJsonAsync(
                    $"{AI_SERVER_BASE}/api/v1/chat-summarizer/summarize",
                    payload);

                var aiBody = await aiResponse.Content.ReadAsStringAsync();

                if (!aiResponse.IsSuccessStatusCode)
                {
                    return StatusCode((int)aiResponse.StatusCode,
                        $"AI summarizer error: {aiBody}");
                }

                // AI returns: { "summary": { "document_changes": [...], "enhanced_at": "..." } }
                // Store the whole summary object (as JSON string) in summarized_chat.
                string? summary = null;
                using (var doc = JsonDocument.Parse(aiBody))
                {
                    if (doc.RootElement.TryGetProperty("summary", out var s))
                    {
                        summary = s.GetRawText();
                    }
                }

                if (string.IsNullOrWhiteSpace(summary))
                {
                    return StatusCode(500, "AI summarizer returned no summary.");
                }

                var now = DateTime.UtcNow;
                session.SummarizedChat = summary;
                session.LastEnhancedAt = now;

                await _supabase.From<ChatSession>().Upsert(session);

                return Ok(new
                {
                    status = "Enhanced",
                    summarizedChat = summary,
                    lastEnhancedAt = now,
                    messagesSummarized = newMessages.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error enhancing session: {ex.Message}");
            }
        }

        // DELETE: api/Chat/session/{sessionId}
        [HttpDelete("session/{sessionId}")]
        public async Task<IActionResult> DeleteSession(string sessionId)
        {
            if (!Guid.TryParse(sessionId, out Guid sessId)) return BadRequest("Invalid ID");

            try
            {
                await _supabase.From<ChatSession>()
                    .Where(x => x.SessionId == sessId)
                    .Delete();

                return Ok(new { deleted = true, sessionId = sessId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error deleting session: {ex.Message}");
            }
        }
    }
}