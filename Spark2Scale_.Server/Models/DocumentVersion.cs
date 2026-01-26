using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("document_versions")]
    public class DocumentVersion : BaseModel
    {
        [PrimaryKey("vid", false)]
        public Guid Vid { get; set; }

        // Links to the 'documents' table (Parent)
        [Column("document_id")]
        public Guid DocumentId { get; set; }

        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("version_number")]
        public int VersionNumber { get; set; }

        [Column("path")]
        public string Path { get; set; }

        // --- ADDED THIS PROPERTY ---
        [Column("generated_by")]
        public string GeneratedBy { get; set; } // "manual" or "AI"
        // ---------------------------

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}