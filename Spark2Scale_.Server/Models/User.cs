using Supabase.Postgrest.Models;
using Supabase.Postgrest.Attributes;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("users")]
    public class User : BaseModel
    {
        [PrimaryKey("uid", false)]
        [Column("uid")]
        public Guid uid { get; set; }

        [Column("fname")]
        public string fname { get; set; } = string.Empty;

        [Column("lname")]
        public string lname { get; set; } = string.Empty;

        [Column("email")]
        public string email { get; set; } = string.Empty;

        [Column("password_hash")]
        public string password_hash { get; set; } = string.Empty;

        [Column("phone_number")]
        public string phone_number { get; set; } = string.Empty;

        [Column("address_region")]
        public string address_region { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime created_at { get; set; }

        [Column("avatar_url")]
        public string avatar_url { get; set; } = string.Empty;

        [Column("user_type")]
        public string user_type { get; set; } = string.Empty;
    }

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
        public string user_type { get; set; } = string.Empty;
    }
}
