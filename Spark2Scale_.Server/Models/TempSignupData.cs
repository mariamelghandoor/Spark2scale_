using Supabase.Postgrest.Models;
using Supabase.Postgrest.Attributes;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("temp_signup_data")]
    public class TempSignupData : BaseModel
    {
        [PrimaryKey("email", false)]
        [Column("email")]
        public string email { get; set; } = string.Empty;

        [Column("name")]
        public string name { get; set; } = string.Empty;

        [Column("phone")]
        public string phone { get; set; } = string.Empty;

        [Column("address_region")]
        public string address_region { get; set; } = string.Empty;

        [Column("user_type")]
        public string user_type { get; set; } = string.Empty;

        [Column("tags")]
        public string[] tags { get; set; } = Array.Empty<string>();

        [Column("created_at")]
        public DateTime created_at { get; set; }

        [Column("expires_at")]
        public DateTime expires_at { get; set; }
    }
}

