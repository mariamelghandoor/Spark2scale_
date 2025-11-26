// Spark2Scale_.Server/Models/Document.cs
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using System.Text.Json.Serialization;

namespace Spark2Scale_.Server.Models
{
    [Table("documents")]
    public class Document : BaseModel
    {
        [PrimaryKey("did")]
        public Guid Did { get; set; }

        [Column("document_name")]
        public string DocumentName { get; set; } = string.Empty;

        [Column("type")]
        public string Type { get; set; } = string.Empty;

        [Column("path")]
        public string? Path { get; set; } // Nullable in DB

        [Column("version")]
        public int? Version { get; set; } // Nullable in DB

        [Column("canaccess")]
        public short CanAccess { get; set; }

        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } // Nullable in DB 
    }

    public class DocumentDto
    {
        public Guid Did { get; set; }
        public string DocumentName { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public Guid StartupId { get; set; }
        public DateTime? CreatedAt { get; set; }
    }
}