using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    // INTERNAL MODEL: Maps to Supabase Table 'meetings'
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
        public TimeSpan MeetingTime { get; set; } // Maps to SQL 'time'

        [Column("meeting_link")]
        public string? MeetingLink { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }
    }

    // INPUT DTO: Clean input for Swagger
    public class MeetingInsertDto
    {
        public Guid? founder_id { get; set; }
        public Guid? investor_id { get; set; }
        public Guid? startup_id { get; set; }
        public DateTime meeting_date { get; set; } // Format: "2023-12-31"
        public TimeSpan meeting_time { get; set; } // Format: "14:30:00"
        public string? meeting_link { get; set; }
    }

    // OUTPUT DTO: What you receive back
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
    }
}