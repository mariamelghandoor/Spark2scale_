using Supabase.Postgrest.Models;
using Supabase.Postgrest.Attributes;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("users")] // maps this class to the 'users' table
    public class User : BaseModel
    {
        [PrimaryKey("uid")]
        public Guid uid { get; set; }  // UUID primary key

        public string fname { get; set; } = string.Empty;
        public string lname { get; set; } = string.Empty;
        public string email { get; set; } = string.Empty;
        public string password_hash { get; set; } = string.Empty;
        public string phone_number { get; set; } = string.Empty;
        public string address_region { get; set; } = string.Empty;
        public DateTime created_at { get; set; }  // timestampz
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
    }
}