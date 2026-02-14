using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("invitations")]
    public class Invitation : BaseModel
    {
        [PrimaryKey("id", false)]
        public Guid Id { get; set; }

        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("email")]
        public string Email { get; set; }

        [Column("role")]
        public string Role { get; set; }

        [Column("token")]
        public string Token { get; set; }

        [Column("status")]
        public string Status { get; set; } // Pending, Accepted, Rejected

        [Column("invited_by")]
        public Guid? InvitedBy { get; set; }

        [Column("invited_at")]
        public DateTime InvitedAt { get; set; }

        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }
    }
}
