using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    // INTERNAL MODEL: Maps to Supabase Table 'master_documents'
    [Table("master_documents")]
    public class MasterDocument : BaseModel
    {
        [PrimaryKey("master_id", false)]
        public Guid MasterId { get; set; }

        [Column("startup_id")]
        public Guid? StartupId { get; set; } // Nullable based on screenshot

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    // INPUT DTO: Clean input for Swagger
    public class MasterDocumentInsertDto
    {
        public Guid? startup_id { get; set; }
    }

    // OUTPUT DTO: What you receive back
    public class MasterDocumentResponseDto
    {
        public Guid master_id { get; set; }
        public Guid? startup_id { get; set; }
        public DateTime created_at { get; set; }
    }
}