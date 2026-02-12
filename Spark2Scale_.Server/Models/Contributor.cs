using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("contributors")]
    public class Contributor : BaseModel
    {
        // We use a composite key or just an ID conceptually, 
        // but for Supabase Insert, we just need the properties mapping.

        [Column("user_id")]
        public Guid user_id { get; set; }

        [Column("startup_id")]
        public Guid startup_id { get; set; }

       
    }

    public class InviteRequestDto
    {
        public string Email { get; set; }
        public Guid StartupId { get; set; }
    }

    public class AcceptInviteDto
    {
        public Guid UserId { get; set; }
        public Guid StartupId { get; set; }
    }
}