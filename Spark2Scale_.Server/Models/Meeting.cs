using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using System.Text.Json.Serialization;

namespace Spark2Scale_.Server.Models
{
    [Table("meetings")]
    public class Meeting : BaseModel
    {
        [PrimaryKey("meeting_id", false)]
        public Guid MeetingId { get; set; }

        [Column("founder_id")]
        public Guid? FounderId { get; set; }

        [Column("investor_id")]
        public Guid? InvestorId { get; set; }

        [Column("startup_id")]
        public Guid? StartupId { get; set; }

        [Column("meeting_date")]
        public DateTime MeetingDate { get; set; }

        [Column("meeting_time")]
        public TimeSpan MeetingTime { get; set; }

        [Column("meeting_link")]
        public string? MeetingLink { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("status")]
        public string Status { get; set; } = "pending";
    }

    public class MeetingInsertDto
    {
        public Guid? founder_id { get; set; }

        // CHANGED: We now accept email instead of just ID
        public string? invitee_email { get; set; }

        public Guid? startup_id { get; set; }
        public DateTime meeting_date { get; set; }
        public TimeSpan meeting_time { get; set; }
        public string? meeting_link { get; set; }
    }

    public class MeetingResponseDto
    {
        public Guid meeting_id { get; set; }
        public Guid? founder_id { get; set; }
        public Guid? investor_id { get; set; }
        public Guid? startup_id { get; set; }
        public DateTime meeting_date { get; set; }
        public TimeSpan meeting_time { get; set; }
        public string? meeting_link { get; set; }
        public DateTime? created_at { get; set; }

        [JsonPropertyName("with_whom_name")]
        public string with_whom_name { get; set; }

        public string status { get; set; }
    }
}