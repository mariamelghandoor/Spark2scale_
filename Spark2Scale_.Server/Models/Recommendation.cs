using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Models
{
    // The C# Object that maps to your JSONB column
    public class RecommendationContent
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

        // Supabase Client handles Serialization/Deserialization to JSONB automatically
        [Column("content")]
        public RecommendationContent Content { get; set; }

        [Column("version")]
        public int Version { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    // Input DTO
    public class RecommendationInsertDto
    {
        public Guid StartupId { get; set; }
        public string Type { get; set; }
        public RecommendationContent Content { get; set; }
    }
}