using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    // --- DATABASE MODEL ---
    [Table("startup_workflow")]
    public class StartupWorkflow : BaseModel
    {
        // Primary Key matches 'startup_id' from the table.
        // 'false' means it is NOT auto-generated (we provide the GUID).
        [PrimaryKey("startup_id", false)]
        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("idea_check")]
        public bool IdeaCheck { get; set; }

        [Column("market_research")]
        public bool MarketResearch { get; set; }


        [Column("evaluation")]
        public bool Evaluation { get; set; }

        [Column("recommendation")]
        public bool Recommendation { get; set; }

        [Column("documents")]
        public bool Documents { get; set; }

        [Column("pitch_deck")]
        public bool PitchDeck { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    // --- DTO for INPUT (Update/Create) ---
    public class WorkflowUpdateDto
    {
        // Input as string to prevent 400 Bad Request crashes
        public string StartupId { get; set; }

        public bool IdeaCheck { get; set; }
        public bool MarketResearch { get; set; }
        public bool Evaluation { get; set; }
        public bool Recommendation { get; set; }
        public bool Documents { get; set; }
        public bool PitchDeck { get; set; }
    }

    // --- DTO for OUTPUT (Response) ---
    public class WorkflowResponseDto
    {
        public Guid StartupId { get; set; }
        public bool IdeaCheck { get; set; }
        public bool MarketResearch { get; set; }
        public bool Evaluation { get; set; }
        public bool Recommendation { get; set; }
        public bool Documents { get; set; }
        public bool PitchDeck { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}