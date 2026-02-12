using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("investors")]
    public class Investor : BaseModel
    {
        [PrimaryKey("user_id", false)]
        [Column("user_id")]
        public Guid user_id { get; set; }

        [Column("tags")]
        public string[] tags { get; set; } = Array.Empty<string>();
    }

    public class InvestorDto
    {
        public Guid UserId { get; set; }
        public string[] Tags { get; set; } = Array.Empty<string>();
    }
}
