using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("startup_contributors")]
    public class StartupContributor : BaseModel
    {
        [PrimaryKey("contributor_id", false)]
        [Column("contributor_id")]
        public Guid ContributorId { get; set; }

        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("invited_by")]
        public Guid? InvitedBy { get; set; }

        [Column("invited_at")]
        public DateTime? InvitedAt { get; set; }

        [Column("role")]
        public string? Role { get; set; }
    }

    public class CreateStartupContributorRequest
    {
        public string ContributorId { get; set; }
        public string StartupId { get; set; }
        public string? InvitedBy { get; set; }
        public string? Role { get; set; }
    }

    public class StartupContributorDto
    {
        public Guid ContributorId { get; set; }
        public Guid StartupId { get; set; }
        public string? Role { get; set; }
        public Guid? InvitedBy { get; set; }
        public DateTime? InvitedAt { get; set; }
    }
}