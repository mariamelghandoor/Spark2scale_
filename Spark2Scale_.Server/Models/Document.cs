using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    // INTERNAL MODEL: Maps to Supabase Table
    [Table("documents")]
    public class Document : BaseModel
    {
        [PrimaryKey("did", false)]
        public Guid Did { get; set; }

        [Column("master_id")]
        public Guid MasterId { get; set; }

        [Column("document_name")]
        public string DocumentName { get; set; } = string.Empty;

        [Column("type")]
        public string Type { get; set; } = string.Empty;

        [Column("path")]
        public string Path { get; set; } = string.Empty;

        [Column("version")]
        public int Version { get; set; }

        [Column("canaccess")]
        public short CanAccess { get; set; } // smallint in DB = short in C#

        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    // INPUT DTO: What you send to create a document
    public class DocumentInsertDto
    {
        public Guid master_id { get; set; }
        public Guid startup_id { get; set; }
        public string document_name { get; set; }
        public string type { get; set; }
        public string path { get; set; }
        public int version { get; set; }
        public short canaccess { get; set; }
    }

    // OUTPUT DTO: What you receive back (includes ID and Date)
    public class DocumentResponseDto
    {
        public Guid did { get; set; }
        public Guid master_id { get; set; }
        public Guid startup_id { get; set; }
        public string document_name { get; set; }
        public string type { get; set; }
        public string path { get; set; }
        public int version { get; set; }
        public short canaccess { get; set; }
        public DateTime created_at { get; set; }
    }
}