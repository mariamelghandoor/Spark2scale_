using Supabase.Postgrest.Models;
using Supabase.Postgrest.Attributes;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("users")] // maps this class to the 'users' table
    public class User : BaseModel
    {
        [PrimaryKey("uid")]
        public Guid uid { get; set; }  // UUID primary key

        public string fname { get; set; } = string.Empty;
        public string lname { get; set; } = string.Empty;

        [Column("email")]
        public string email { get; set; } = string.Empty;

        // REMOVED: [Column("password_hash")] to rely solely on Supabase Auth (GoTrue)
        // public string password_hash { get; set; } = string.Empty;

        [Column("phone_number")]
        public string phone_number { get; set; } = string.Empty;

        [Column("address_region")]
        public string address_region { get; set; } = string.Empty;
        public DateTime created_at { get; set; }  // timestampz

        // FIX: Added avatar_url to match DB schema
        public string avatar_url { get; set; } = string.Empty;
    }

    // DTO for returning data to the client (avoids BaseModel serialization issues)
    public class UserDto
    {
        public Guid uid { get; set; }
        public string fname { get; set; } = string.Empty;
        public string lname { get; set; } = string.Empty;
        public string email { get; set; } = string.Empty;
        public string phone_number { get; set; } = string.Empty;
        public string address_region { get; set; } = string.Empty;
        public DateTime created_at { get; set; }
        public string avatar_url { get; set; } = string.Empty;
    }
}