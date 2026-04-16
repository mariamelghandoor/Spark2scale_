using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Spark2Scale_.Server.Models
{
    // --- 1. The Object stored inside the JSONB column ---
    public class ChatMessage
    {
        public string Role { get; set; } // "user" or "assistant"
        public string Content { get; set; }
        public DateTime Timestamp { get; set; }
    }

    // --- 2. The Database Table Map ---
    [Table("chat_sessions")]
    public class ChatSession : BaseModel
    {
        [PrimaryKey("session_id", false)]
        public Guid SessionId { get; set; }

        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("feature_type")]
        public string FeatureType { get; set; } // "idea_check" or "document_gen"

        [Column("session_number")]
        public int SessionNumber { get; set; } // 1, 2, 3...

        [Column("session_name")]
        public string SessionName { get; set; } // e.g. "Idea Check 1"

        // The Supabase Client automatically serializes/deserializes this List <-> JSONB
        [Column("messages")]
        public List<ChatMessage> Messages { get; set; } = new List<ChatMessage>();

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("is_current")]
        public bool IsCurrent { get; set; }
    }

    // --- 3. DTOs (Data Transfer Objects) for API Input/Output ---

    // Output: For the sidebar list
    public class SessionSummaryDto
    {
        public Guid SessionId { get; set; }
        public string SessionName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // Input: For creating a NEW session
    public class SendMessageDto
    {
        [JsonPropertyName("StartupId")]
        public Guid StartupId { get; set; }

        [JsonPropertyName("FeatureType")]
        public string FeatureType { get; set; }
    }

    public class MessageInputDto
    {
        [JsonPropertyName("SessionId")]
        public Guid SessionId { get; set; }

        [JsonPropertyName("Role")]
        public string Role { get; set; }

        [JsonPropertyName("Content")]
        public string Content { get; set; }
    }

    public class StartSessionRequest
    {
        public Guid StartupId { get; set; }
        public string FeatureType { get; set; }
        public string? SessionName { get; set; } // Let the frontend suggest a name
    }
}