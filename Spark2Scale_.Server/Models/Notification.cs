using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using System.Text.Json.Serialization;

namespace Spark2Scale_.Server.Models
{
    [Table("notifications")]
    public class Notification : BaseModel
    {
        [PrimaryKey("nid", false)]
        public Guid Nid { get; set; }

        [Column("sender")]
        public Guid? Sender { get; set; }

        [Column("receiver")]
        public Guid? Receiver { get; set; }

        [Column("topic")]
        public string Topic { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("is_read")]
        public bool IsRead { get; set; }
    }

    public class NotificationInsertDto
    {
        public Guid? sender { get; set; }
        public Guid? receiver { get; set; }
        public string topic { get; set; }
        public string? description { get; set; }
    }

    public class NotificationResponseDto
    {
        public Guid nid { get; set; }
        public Guid? sender { get; set; }
        public Guid? receiver { get; set; }
        public string topic { get; set; }
        public string? description { get; set; }
        public DateTime? created_at { get; set; }

        [JsonPropertyName("is_read")]
        public bool is_read { get; set; }

        // NEW FIELD
        [JsonPropertyName("sender_name")]
        public string sender_name { get; set; }
    }
}