using Microsoft.AspNetCore.Http;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using Newtonsoft.Json.Linq;
using System.Text.Json;

namespace Spark2Scale_.Server.Models
{
    [Table("documents")]
    public class Document : BaseModel
    {
        [PrimaryKey("did", false)]
        public Guid Did { get; set; }

        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("document_name")]
        public string DocumentName { get; set; }

        [Column("type")]
        public string Type { get; set; }

        [Column("current_path")]
        public string CurrentPath { get; set; }

        [Column("current_version")]
        public int CurrentVersion { get; set; }

        [Column("canaccess")]
        public int CanAccess { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("is_current")]
        public bool IsCurrent { get; set; }

        // --- NEW FIELD ---
        // Maps to the jsonb column in Supabase
        [Column("json_response")]
        public object JsonResponse { get; set; }


        //[Column("json_response")]
        //public Dictionary<string, object> JsonResponse { get; set; }
    }

    // --- DTOs ---
    public class DocumentResponseDto
    {
        public Guid did { get; set; }
        public Guid startup_id { get; set; }
        public string document_name { get; set; }
        public string type { get; set; }
        public string current_path { get; set; }
        public int current_version { get; set; }
        public DateTime updated_at { get; set; }

        // Return this to the frontend
        public object json_response { get; set; }
    }

    // For Uploading Files
    public class DocumentUploadDto
    {
        public IFormFile File { get; set; }
        public string StartupId { get; set; }
        public string Type { get; set; }
        public string DocName { get; set; }
        public string? DocumentId { get; set; } // Optional (for updating)
    }

    // remove whem integrating with ai
    public class GenerateMockDto
    {
        public Guid StartupId { get; set; }
        public string Type { get; set; } // e.g. "Cap Table"
    }

    public class SaveAiEvaluationsFormDto
    {
        public string StartupId { get; set; }
        public string JsonResponse { get; set; } 
        public IFormFile FounderFile { get; set; }
        public IFormFile InvestorFile { get; set; }
    }
}