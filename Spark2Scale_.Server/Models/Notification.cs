using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    // INTERNAL MODEL: Maps to Supabase Table
    [Table("notifications")]
    public class Notification : BaseModel
    {
        [PrimaryKey("nid", false)]
        public Guid Nid { get; set; }

        [Column("sender")]
        public Guid? Sender { get; set; } // Nullable based on screenshot

        [Column("receiver")]
        public Guid? Receiver { get; set; } // Nullable based on screenshot

        [Column("topic")]
        public string Topic { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }
    }

    // INPUT: Clean input for Swagger (No ID, No Date)
    public class NotificationInsertDto
    {
        public Guid? sender { get; set; }
        public Guid? receiver { get; set; }
        public string topic { get; set; }
        public string? description { get; set; }
    }

    // OUTPUT: Includes generated ID and Timestamp
    public class NotificationResponseDto
    {
        public Guid nid { get; set; }
        public Guid? sender { get; set; }
        public Guid? receiver { get; set; }
        public string topic { get; set; }
        public string? description { get; set; }
        public DateTime? created_at { get; set; }
    }
}