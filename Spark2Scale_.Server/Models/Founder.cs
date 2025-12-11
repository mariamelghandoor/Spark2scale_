using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("founders")]
    public class Founder : BaseModel
    {
        [PrimaryKey("user_id", false)]
        [Column("user_id")]
        public Guid user_id { get; set; }
    }

    public class FounderDto
    {
        public Guid UserId { get; set; }
    }
}
