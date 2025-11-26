using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("investor_document_access")]
    public class InvestorDocumentAccess : BaseModel
    {
        
        [PrimaryKey("investor_id")]
        [Column("investor_id")]
        public Guid InvestorId { get; set; }

        [Column("document_id")]
        public Guid DocumentId { get; set; }

        [Column("granted_at")]
        public DateTime GrantedAt { get; set; }
    }

    public class GrantAccessDto
    {
        public Guid InvestorId { get; set; }
        public Guid DocumentId { get; set; }
    }
}