// Spark2Scale_.Server/Models/PitchDeck.cs
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http; // Required for IFormFile

namespace Spark2Scale_.Server.Models
{
    // --- 1. New Analysis Classes (JSON Structure) ---

    public class AnalysisContent
    {
        public ShortAnalysis Short { get; set; }
        public DetailedAnalysis Detailed { get; set; }
    }

    public class ShortAnalysis
    {
        public int Score { get; set; }
        public string Summary { get; set; }
        public List<FeedbackItem> KeyFeedback { get; set; }
    }

    public class DetailedAnalysis
    {
        public string Tone { get; set; }
        public string Pacing { get; set; }
        public List<FeedbackItem> Sections { get; set; }
        public List<string> TranscriptHighlights { get; set; }
    }

    public class FeedbackItem
    {
        public string Aspect { get; set; }
        public int Score { get; set; }
        public string Comment { get; set; }
    }

    // --- 2. Main Database Model ---

    [Table("pitchdecks")]
    public class PitchDeck : BaseModel
    {
        [PrimaryKey("pitchdeckid", false)]
        public Guid pitchdeckid { get; set; }

        [Column("startup_id")]
        public Guid startup_id { get; set; }

        [Column("video_url")]
        public string video_url { get; set; }

        // NEW: Tracks if this is the latest/active video
        [Column("is_current")]
        public bool is_current { get; set; }

        // Mapped to the 'jsonb' column in Supabase
        [Column("analysis")]
        public AnalysisContent analysis { get; set; }

        [Column("tags")]
        public List<string> tags { get; set; } = new List<string>();

        [Column("countlikes")]
        public int countlikes { get; set; }

        [Column("created_at")]
        public DateTime created_at { get; set; }
    }

    // --- 3. Data Transfer Objects (DTOs) ---

    // DTO for returning data to Frontend
    public class PitchDeckResponseDto
    {
        public Guid pitchdeckid { get; set; }
        public Guid startup_id { get; set; }
        public string video_url { get; set; }
        public bool is_current { get; set; } // <--- Added here too
        public AnalysisContent analysis { get; set; }
        public List<string> tags { get; set; }
        public int countlikes { get; set; }
        public DateTime created_at { get; set; }
    }

    // DTO for Uploading (Input)
    public class PitchDeckUploadDto
    {
        public Guid startup_id { get; set; }
        public IFormFile file { get; set; }
    }
}