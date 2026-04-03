using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("contributors")]
    public class Contributor : BaseModel
    {
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("startup_id")]
        public Guid? StartupId { get; set; }
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