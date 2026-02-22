using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using System.Collections.Generic;
using System.Text.Json;

namespace Spark2Scale_.Server.Models
{
    // The C# Object that maps to your JSONB column (Legacy schema for Idea Check)
    public class LegacyRecommendationContent
    {
        public string Summary { get; set; }
        public int Score { get; set; }
        public List<string> KeyPoints { get; set; }
        public string ActionPlan { get; set; }
    }

    [Table("recommendations")]
    public class Recommendation : BaseModel
    {
        [PrimaryKey("rid", false)]
        public Guid Rid { get; set; }

        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("type")]
        public string Type { get; set; } // "idea_check" or "document_review"

        // Use JsonElement to preserve ALL fields from the JSONB column
        // Using 'object' caused Supabase to deserialize into LegacyRecommendationContent, stripping new fields
        [Column("content")]
        public JsonElement Content { get; set; }

        [Column("version")]
        public int Version { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("is_current")]
        public bool IsCurrent { get; set; }
    }

    public class RecommendationInsertDto
    {
        public Guid StartupId { get; set; }
        public string Type { get; set; }
        public JsonElement Content { get; set; }
    }
}