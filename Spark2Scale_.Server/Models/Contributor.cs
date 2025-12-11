using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("contributors")]
    public class Contributor : BaseModel
    {
        [PrimaryKey("user_id", false)]
        [Column("user_id")]
        public Guid user_id { get; set; }
    }

    public class ContributorDto
    {
        public Guid UserId { get; set; }
    }
}
