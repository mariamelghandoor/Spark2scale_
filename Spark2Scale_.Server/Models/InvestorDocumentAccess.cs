using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("investor_document_access")]
    public class InvestorDocumentAccess : BaseModel
    {
        // Composite Key: Both must be marked as PrimaryKey
        [PrimaryKey("investor_id", false)]
        public Guid InvestorId { get; set; }

        [PrimaryKey("document_id", false)]
        public Guid DocumentId { get; set; }

        [Column("granted_at")]
        public DateTime GrantedAt { get; set; }

        // Added: To track status (true=Granted, false=Pending)
        [Column("granted")]
        public bool? Granted { get; set; }
    }

    public class GrantAccessDto
    {
        public Guid InvestorId { get; set; }
        public Guid DocumentId { get; set; }
    }

    public class RequestAccessDto
    {
        public Guid InvestorId { get; set; }
        public Guid StartupId { get; set; }
    }
}