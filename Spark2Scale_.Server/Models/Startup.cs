using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("startups")]
    public class Startup : BaseModel
    {
        [PrimaryKey("sid", false)]
        public Guid Sid { get; set; }

        [Column("startupname")]
        public string StartupName { get; set; }

        [Column("field")]
        public string? Field { get; set; }

        [Column("idea_description")]
        public string? IdeaDescription { get; set; }

        // --- NEW COLUMNS ---
        [Column("region")]
        public string? Region { get; set; }

        [Column("startup_stage")]
        public string? StartupStage { get; set; }
        // -------------------

        [Column("founder_id")]
        public Guid? FounderId { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }
    }

    public class StartupInsertDto
    {
        public string startupname { get; set; }
        public string? field { get; set; }
        public string? idea_description { get; set; }
        public string? region { get; set; }
        public string? startup_stage { get; set; }
        public Guid? founder_id { get; set; }
    }

    public class StartupResponseDto
    {
        public Guid sid { get; set; }
        public string startupname { get; set; }
        public string? field { get; set; }
        public string? idea_description { get; set; }
        public string? region { get; set; }
        public string? startup_stage { get; set; }
        public Guid? founder_id { get; set; }
        public DateTime? created_at { get; set; }
    }

    public class IdeaUpdateDto
    {
        public string IdeaDescription { get; set; }
    }
}