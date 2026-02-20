using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using System.Text.Json;

namespace Spark2Scale_.Server.Models
{
    /// <summary>
    /// Maps exactly to the Supabase `startups` table schema:
    ///   sid, startupname, field, idea_description, founder_id,
    ///   created_at, current_iteration, region, startup_stage,
    ///   json_response, logo_path
    /// </summary>
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

        [Column("founder_id")]
        public Guid? FounderId { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        /// <summary>
        /// Incremented each time the Recommendation Agent overwrites the report.
        /// Stored in the DB but not surfaced as a visible version number in the UI.
        /// </summary>
        [Column("current_iteration")]
        public int? CurrentIteration { get; set; }

        [Column("region")]
        public string? Region { get; set; }

        [Column("startup_stage")]
        public string? StartupStage { get; set; }

        /// <summary>
        /// Latest recommendation payload (JSONB). Overwritten on each agent run.
        /// </summary>
        [Column("json_response")]
        public JsonElement? JsonResponse { get; set; }

        [Column("logo_path")]
        public string? LogoPath { get; set; }
    }

    public class StartupInsertDto
    {
        public string startupname { get; set; }
        public string? field { get; set; }
        public string? idea_description { get; set; }
        public string? region { get; set; }
        public string? startup_stage { get; set; }
        public Guid? founder_id { get; set; }
        public string? logo_path { get; set; }
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

        // Populated by role-check logic, not a DB column
        public string? current_role { get; set; }

        // Recommendation Agent columns
        public int? current_iteration { get; set; }
        public object? json_response { get; set; }

        // Profile
        public string? logo_path { get; set; }
    }

    public class IdeaUpdateDto
    {
        public string IdeaDescription { get; set; }
    }

    /// <summary>
    /// DTO used by PUT /api/Startups/{id}/recommendation.
    /// Carries the latest agent output; current_iteration is incremented
    /// server-side (not displayed in the UI — each generate replaces the report).
    /// </summary>
    public class StartupRecommendationUpdateDto
    {
        /// <summary>Full recommendation content serialised as JSON.</summary>
        public JsonElement JsonResponse { get; set; }

        /// <summary>
        /// The new iteration count (computed by the caller — typically previous + 1).
        /// </summary>
        public int CurrentIteration { get; set; }
    }
}
